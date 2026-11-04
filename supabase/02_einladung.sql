-- KT Schule, Schritt 2: Einladung auch nachträglich annehmen
-- Supabase → SQL Editor → New query → alles einfügen → Run

create or replace function public.claim_invite() returns boolean
language plpgsql security definer set search_path = ''
as $$
declare inv public.teacher_invites; em text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.teachers where id = auth.uid()) then return true; end if;
  select email into em from auth.users where id = auth.uid();
  select * into inv from public.teacher_invites where lower(email) = lower(em);
  if not found then return false; end if;
  insert into public.teachers(id, name, grp) values (auth.uid(), inv.name, inv.grp);
  delete from public.teacher_invites where email = inv.email;
  return true;
end $$;
revoke execute on function public.claim_invite() from public, anon;
grant execute on function public.claim_invite() to authenticated;
revoke execute on function public.my_grp() from public, anon;
grant execute on function public.my_grp() to authenticated;
