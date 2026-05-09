create extension if not exists pgcrypto;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  difficulty text not null check (difficulty in ('facil', 'media', 'alta')),
  prep_minutes integer not null default 5,
  servings integer not null default 1,
  image_url text,
  favorite boolean not null default false,
  tags text[] not null default '{}',
  garnish text,
  notes text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;

drop policy if exists "ingredients_select_own" on public.ingredients;
drop policy if exists "ingredients_insert_own" on public.ingredients;
drop policy if exists "ingredients_update_own" on public.ingredients;
drop policy if exists "ingredients_delete_own" on public.ingredients;
drop policy if exists "recipes_select_own" on public.recipes;
drop policy if exists "recipes_insert_own" on public.recipes;
drop policy if exists "recipes_update_own" on public.recipes;
drop policy if exists "recipes_delete_own" on public.recipes;

create policy "ingredients_select_own"
  on public.ingredients for select
  using (auth.uid() = owner_id);

create policy "ingredients_insert_own"
  on public.ingredients for insert
  with check (auth.uid() = owner_id);

create policy "ingredients_update_own"
  on public.ingredients for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "ingredients_delete_own"
  on public.ingredients for delete
  using (auth.uid() = owner_id);

create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = owner_id);

create policy "recipes_insert_own"
  on public.recipes for insert
  with check (auth.uid() = owner_id);

create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ingredient-images', 'ingredient-images', true)
on conflict (id) do nothing;

drop policy if exists "public can view recipe images" on storage.objects;
drop policy if exists "authenticated users upload recipe images" on storage.objects;
drop policy if exists "public can view ingredient images" on storage.objects;
drop policy if exists "authenticated users upload ingredient images" on storage.objects;

create policy "public can view recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "authenticated users upload recipe images"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

create policy "public can view ingredient images"
  on storage.objects for select
  using (bucket_id = 'ingredient-images');

create policy "authenticated users upload ingredient images"
  on storage.objects for insert
  with check (bucket_id = 'ingredient-images' and auth.role() = 'authenticated');