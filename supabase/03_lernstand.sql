-- KT Schule, Schritt 3: Lernstand der Schüler und Förderziele im Schülerbereich
-- Supabase → SQL Editor → New query → alles einfügen → Run

alter table public.students add column if not exists progress jsonb not null default '{}'::jsonb;

create or replace function public.student_login(p_code text) returns json
language sql stable security definer set search_path = ''
as $$ select json_build_object('id', id, 'first', first_name, 'klasse', klasse, 'grp', grp,
        'goals', coalesce(data->'goals', '[]'::jsonb), 'progress', progress)
      from public.students where code = upper(trim(p_code)) $$;

create or replace function public.student_save_progress(p_code text, p_progress jsonb) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' or length(p_progress::text) > 200000 then return false; end if;
  update public.students set progress = p_progress where code = upper(trim(p_code));
  return found;
end $$;

grant execute on function public.student_login(text), public.student_save_progress(text, jsonb) to anon, authenticated;
