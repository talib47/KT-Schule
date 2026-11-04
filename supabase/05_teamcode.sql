-- KT Schule, Schritt 5: Registrieren mit Teamcode statt Einladung
-- Supabase → SQL Editor → New query → alles einfügen → Run
-- Wer sich mit dem richtigen Teamcode registriert, ist sofort im Team (Gruppe wählt er selbst).
-- Den Code sieht und ändert nur die Leitung in der App unter Plan → Team.

create table if not exists public.team_secret(
  id int primary key default 1 check (id = 1),
  code text not null
);
insert into public.team_secret(id, code)
values (1, upper(translate(substr(md5(random()::text), 1, 6), '01', 'XY')))
on conflict (id) do nothing;
alter table public.team_secret enable row level security;

create or replace function public.team_code() returns text
language sql stable security definer set search_path = ''
as $$ select case when public.my_grp() = 'leitung' then (select code from public.team_secret where id = 1) end $$;

create or replace function public.set_team_code(p_code text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if public.my_grp() is distinct from 'leitung' then return false; end if;
  if p_code is null or length(trim(p_code)) < 4 then return false; end if;
  update public.team_secret set code = upper(trim(p_code)) where id = 1;
  return true;
end $$;

revoke execute on function public.team_code(), public.set_team_code(text) from public, anon;
grant execute on function public.team_code(), public.set_team_code(text) to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare inv public.teacher_invites; nm text; g text;
begin
  nm := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  g := new.raw_user_meta_data->>'grp';
  if not exists (select 1 from public.teachers) then
    insert into public.teachers(id, name, grp) values (new.id, nm, 'leitung');
  else
    select * into inv from public.teacher_invites where lower(email) = lower(new.email);
    if found then
      insert into public.teachers(id, name, grp) values (new.id, inv.name, inv.grp);
      delete from public.teacher_invites where email = inv.email;
    elsif g in ('jungs', 'maedchen')
      and upper(trim(coalesce(new.raw_user_meta_data->>'team_code', ''))) = (select code from public.team_secret where id = 1) then
      insert into public.teachers(id, name, grp) values (new.id, nm, g);
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Falls jemand den Code bei der Registrierung falsch getippt hat: nachträglich beitreten
create or replace function public.join_team(p_code text, p_grp text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare nm text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.teachers where id = auth.uid()) then return true; end if;
  if p_grp not in ('jungs', 'maedchen') then return false; end if;
  if upper(trim(coalesce(p_code, ''))) <> (select code from public.team_secret where id = 1) then return false; end if;
  select coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), split_part(email, '@', 1)) into nm from auth.users where id = auth.uid();
  insert into public.teachers(id, name, grp) values (auth.uid(), nm, p_grp);
  return true;
end $$;
revoke execute on function public.join_team(text, text) from public, anon;
grant execute on function public.join_team(text, text) to authenticated;
