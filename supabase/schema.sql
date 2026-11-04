-- KT Lernzeit: Datenbank einrichten
-- Supabase → SQL Editor → New query → alles einfügen → Run

create table public.teachers(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  grp text not null check (grp in ('jungs','maedchen','leitung')),
  created_at timestamptz not null default now()
);
create table public.teacher_invites(
  email text primary key,
  name text not null,
  grp text not null check (grp in ('jungs','maedchen','leitung')),
  created_at timestamptz not null default now()
);
create table public.students(
  id text primary key,
  grp text not null check (grp in ('jungs','maedchen')),
  code text not null unique,
  klasse int not null,
  first_name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create table public.sheets(
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.attempts(
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  sheet_id text not null,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);
create index attempts_student_idx on public.attempts(student_id);
create table public.app_state(
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.my_grp() returns text
language sql stable security definer set search_path = ''
as $$ select grp from public.teachers where id = auth.uid() $$;

alter table public.teachers enable row level security;
alter table public.teacher_invites enable row level security;
alter table public.students enable row level security;
alter table public.sheets enable row level security;
alter table public.attempts enable row level security;
alter table public.app_state enable row level security;

create policy teachers_read on public.teachers for select to authenticated using ((select public.my_grp()) is not null);
create policy teachers_update on public.teachers for update to authenticated using ((select public.my_grp()) = 'leitung') with check ((select public.my_grp()) = 'leitung');
create policy teachers_delete on public.teachers for delete to authenticated using ((select public.my_grp()) = 'leitung' and id <> (select auth.uid()));

create policy invites_all on public.teacher_invites for all to authenticated using ((select public.my_grp()) = 'leitung') with check ((select public.my_grp()) = 'leitung');

create policy students_all on public.students for all to authenticated
  using ((select public.my_grp()) = 'leitung' or grp = (select public.my_grp()))
  with check ((select public.my_grp()) = 'leitung' or grp = (select public.my_grp()));

create policy sheets_all on public.sheets for all to authenticated using ((select public.my_grp()) is not null) with check ((select public.my_grp()) is not null);

create policy attempts_read on public.attempts for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));
create policy attempts_delete on public.attempts for delete to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));

create policy state_all on public.app_state for all to authenticated using ((select public.my_grp()) is not null) with check ((select public.my_grp()) is not null);

-- Neue Konten: das allererste wird Leitung, danach nur eingeladene E-Mail-Adressen
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare inv public.teacher_invites;
begin
  if not exists (select 1 from public.teachers) then
    insert into public.teachers(id, name, grp)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 'leitung');
  else
    select * into inv from public.teacher_invites where lower(email) = lower(new.email);
    if found then
      insert into public.teachers(id, name, grp) values (new.id, inv.name, inv.grp);
      delete from public.teacher_invites where email = inv.email;
    end if;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Schülerbereich: Zugriff nur über den Code
create or replace function public.student_login(p_code text) returns json
language sql stable security definer set search_path = ''
as $$ select json_build_object('id', id, 'first', first_name, 'klasse', klasse, 'grp', grp)
      from public.students where code = upper(trim(p_code)) $$;

create or replace function public.student_sheets(p_code text) returns json
language sql stable security definer set search_path = ''
as $$
  with s as (select * from public.students where code = upper(trim(p_code)))
  select json_build_object(
    'sheets', coalesce((select json_agg(sh.data) from public.sheets sh, s
       where (sh.data->'groups') ? s.grp and (sh.data->>'minK')::int <= s.klasse and (sh.data->>'maxK')::int >= s.klasse), '[]'::json),
    'attempts', coalesce((select json_agg(json_build_object('sheetId', a.sheet_id, 'score', a.score, 'total', a.total, 'date', a.created_at) order by a.created_at desc)
       from public.attempts a, s where a.student_id = s.id), '[]'::json))
  where exists (select 1 from s)
$$;

create or replace function public.student_submit(p_code text, p_sheet text, p_score int, p_total int) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare st public.students; sh public.sheets;
begin
  select * into st from public.students where code = upper(trim(p_code));
  if not found then return false; end if;
  select * into sh from public.sheets where id = p_sheet
    and (data->'groups') ? st.grp and (data->>'minK')::int <= st.klasse and (data->>'maxK')::int >= st.klasse;
  if not found then return false; end if;
  if p_total <> jsonb_array_length(sh.data->'items') or p_score < 0 or p_score > p_total then return false; end if;
  insert into public.attempts(student_id, sheet_id, score, total) values (st.id, sh.id, p_score, p_total);
  return true;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.student_login(text), public.student_sheets(text), public.student_submit(text, text, int, int) to anon, authenticated;
