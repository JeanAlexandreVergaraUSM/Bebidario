-- Fase 1: endurecimiento de seguridad del Storage existente.
-- Ejecutar una vez en Supabase SQL Editor.

drop policy if exists "authenticated users upload recipe images"
on storage.objects;

drop policy if exists "authenticated users upload ingredient images"
on storage.objects;

create policy "authenticated users upload recipe images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

create policy "authenticated users upload ingredient images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ingredient-images'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);
