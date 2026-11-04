-- KT Schule, Schritt 4: Unterlagen je Schüler (Vertrag, Zeugnis, Erklärung …) als PDF oder Bild
-- Supabase → SQL Editor → New query → alles einfügen → Run
-- Dateien liegen in einem privaten Speicher. Sehen und hochladen dürfen nur Lehrkräfte der passenden Gruppe und die Leitung.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('docs', 'docs', false, 10485760, array['application/pdf','image/png','image/jpeg','image/heic'])
on conflict (id) do nothing;

create table if not exists public.documents(
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  kind text not null,
  name text not null,
  path text not null unique,
  mime text,
  size int,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists documents_student_idx on public.documents(student_id);
alter table public.documents enable row level security;

create policy documents_all on public.documents for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))))
  with check (exists (select 1 from public.students s where s.id = student_id and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));

-- Dateipfad beginnt mit der Schüler-ID: <schueler-id>/<datei>
create policy docs_read on storage.objects for select to authenticated
  using (bucket_id = 'docs' and exists (select 1 from public.students s where s.id = (storage.foldername(name))[1] and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));
create policy docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and exists (select 1 from public.students s where s.id = (storage.foldername(name))[1] and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));
create policy docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'docs' and exists (select 1 from public.students s where s.id = (storage.foldername(name))[1] and ((select public.my_grp()) = 'leitung' or s.grp = (select public.my_grp()))));
