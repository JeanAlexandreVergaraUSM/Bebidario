-- Fase 2: bebidas disponibles por evento.
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists public.event_available_recipes (
  event_id uuid not null
    references public.events(id)
    on delete cascade,
  recipe_id uuid not null
    references public.recipes(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, recipe_id)
);

create index if not exists event_available_recipes_recipe_id_idx
  on public.event_available_recipes(recipe_id);

alter table public.event_available_recipes
  enable row level security;

grant select, insert, delete
on table public.event_available_recipes
to authenticated;

drop policy if exists "event_available_recipes_select_own"
on public.event_available_recipes;

drop policy if exists "event_available_recipes_insert_own"
on public.event_available_recipes;

drop policy if exists "event_available_recipes_delete_own"
on public.event_available_recipes;

create policy "event_available_recipes_select_own"
on public.event_available_recipes
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_available_recipes.event_id
      and events.owner_id = (select auth.uid())
  )
);

create policy "event_available_recipes_insert_own"
on public.event_available_recipes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events
    where events.id = event_available_recipes.event_id
      and events.owner_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.recipes
    where recipes.id = event_available_recipes.recipe_id
      and recipes.owner_id = (select auth.uid())
  )
);

create policy "event_available_recipes_delete_own"
on public.event_available_recipes
for delete
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_available_recipes.event_id
      and events.owner_id = (select auth.uid())
  )
);

create or replace function public.set_event_available_recipes(
  p_event_id uuid,
  p_recipe_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.event_available_recipes
  where event_id = p_event_id;

  if coalesce(pg_catalog.array_length(p_recipe_ids, 1), 0) > 0 then
    insert into public.event_available_recipes (event_id, recipe_id)
    select p_event_id, recipe_id
    from pg_catalog.unnest(p_recipe_ids) as recipe_id
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.set_event_available_recipes(uuid, uuid[])
from public;

revoke all on function public.set_event_available_recipes(uuid, uuid[])
from anon;

grant execute on function public.set_event_available_recipes(uuid, uuid[])
to authenticated;
