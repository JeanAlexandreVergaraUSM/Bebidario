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

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 2 and 120),
  event_date date not null,
  event_type text not null default 'birthday'
    check (event_type in ('birthday', 'general')),
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'awaiting_selection',
        'selection_received',
        'menu_ready',
        'archived'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_owner_id_idx
  on public.events(owner_id);

create index if not exists events_owner_date_idx
  on public.events(owner_id, event_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.events enable row level security;

revoke all on table public.events from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.events to authenticated;

drop policy if exists "ingredients_select_own" on public.ingredients;
drop policy if exists "ingredients_insert_own" on public.ingredients;
drop policy if exists "ingredients_update_own" on public.ingredients;
drop policy if exists "ingredients_delete_own" on public.ingredients;
drop policy if exists "recipes_select_own" on public.recipes;
drop policy if exists "recipes_insert_own" on public.recipes;
drop policy if exists "recipes_update_own" on public.recipes;
drop policy if exists "recipes_delete_own" on public.recipes;
drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

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

create policy "events_select_own"
  on public.events for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "events_insert_own"
  on public.events for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "events_update_own"
  on public.events for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "events_delete_own"
  on public.events for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

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
  to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "public can view ingredient images"
  on storage.objects for select
  using (bucket_id = 'ingredient-images');

create policy "authenticated users upload ingredient images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ingredient-images'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

-- Fase 3: enlace privado para el organizador y selección final de bebidas.
-- Ejecutar una vez en Supabase SQL Editor, después de phase2.sql.

create table if not exists public.event_organizer_invites (
  event_id uuid primary key
    references public.events(id)
    on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.event_selected_recipes (
  event_id uuid not null
    references public.events(id)
    on delete cascade,
  recipe_id uuid not null
    references public.recipes(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, recipe_id)
);

create index if not exists event_selected_recipes_recipe_id_idx
  on public.event_selected_recipes(recipe_id);

alter table public.event_organizer_invites
  enable row level security;

alter table public.event_selected_recipes
  enable row level security;

revoke all on table public.event_organizer_invites from anon;
revoke all on table public.event_selected_recipes from anon;

grant select on table public.event_organizer_invites to authenticated;
grant select on table public.event_selected_recipes to authenticated;

drop policy if exists "event_organizer_invites_select_own"
on public.event_organizer_invites;

drop policy if exists "event_selected_recipes_select_own"
on public.event_selected_recipes;

create policy "event_organizer_invites_select_own"
on public.event_organizer_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_organizer_invites.event_id
      and events.owner_id = (select auth.uid())
  )
);

create policy "event_selected_recipes_select_own"
on public.event_selected_recipes
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_selected_recipes.event_id
      and events.owner_id = (select auth.uid())
  )
);

-- Refuerza la Fase 2: una vez generado el enlace para el organizador,
-- la lista de bebidas disponibles queda bloqueada para evitar inconsistencias.
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
  if not exists (
    select 1
    from public.events
    where id = p_event_id
      and owner_id = (select auth.uid())
      and status = 'draft'
  ) then
    raise exception 'El evento no existe, no te pertenece o ya no permite modificar sus bebidas disponibles.';
  end if;

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

-- Crea o recupera el enlace privado del organizador.
-- Solo el propietario autenticado del evento puede ejecutarla.
create or replace function public.create_event_organizer_invite(
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1
    from public.events
    where id = p_event_id
      and owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes acceso a este evento.';
  end if;

  if not exists (
    select 1
    from public.event_available_recipes
    where event_id = p_event_id
  ) then
    raise exception 'Primero debes guardar al menos una bebida disponible.';
  end if;

  insert into public.event_organizer_invites (event_id)
  values (p_event_id)
  on conflict (event_id) do nothing;

  select public_token
  into v_token
  from public.event_organizer_invites
  where event_id = p_event_id;

  update public.events
  set status = 'awaiting_selection'
  where id = p_event_id
    and status = 'draft';

  return v_token;
end;
$$;

revoke all on function public.create_event_organizer_invite(uuid)
from public;

revoke all on function public.create_event_organizer_invite(uuid)
from anon;

grant execute on function public.create_event_organizer_invite(uuid)
to authenticated;

-- Devuelve únicamente la información necesaria para la carta del organizador.
-- El token funciona como secreto de acceso; las tablas siguen sin lectura anónima directa.
create or replace function public.get_organizer_event(
  p_token uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_name text;
  v_event_date date;
  v_event_type text;
  v_submitted_at timestamptz;
  v_recipes jsonb;
begin
  select
    events.id,
    events.name,
    events.event_date,
    events.event_type,
    invites.submitted_at
  into
    v_event_id,
    v_event_name,
    v_event_date,
    v_event_type,
    v_submitted_at
  from public.event_organizer_invites as invites
  join public.events as events
    on events.id = invites.event_id
  where invites.public_token = p_token
    and events.status in (
      'awaiting_selection',
      'selection_received',
      'menu_ready'
    );

  if v_event_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', recipes.id,
        'title', recipes.title,
        'description', recipes.description,
        'category', recipes.category,
        'image_url', recipes.image_url,
        'ingredients', coalesce(
          (
            select jsonb_agg(ingredient_item ->> 'name')
            from jsonb_array_elements(recipes.ingredients) as ingredient_item
            where nullif(btrim(ingredient_item ->> 'name'), '') is not null
          ),
          '[]'::jsonb
        )
      )
      order by recipes.title
    ),
    '[]'::jsonb
  )
  into v_recipes
  from public.event_available_recipes as available
  join public.recipes as recipes
    on recipes.id = available.recipe_id
  where available.event_id = v_event_id;

  return jsonb_build_object(
    'name', v_event_name,
    'event_date', v_event_date,
    'event_type', v_event_type,
    'submitted', v_submitted_at is not null,
    'recipes', v_recipes
  );
end;
$$;

revoke all on function public.get_organizer_event(uuid)
from public;

grant execute on function public.get_organizer_event(uuid)
to anon, authenticated;

-- Guarda la respuesta del organizador una sola vez y cambia el estado del evento.
create or replace function public.submit_organizer_selection(
  p_token uuid,
  p_recipe_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_submitted_at timestamptz;
  v_selection_count integer;
begin
  select
    event_id,
    submitted_at
  into
    v_event_id,
    v_submitted_at
  from public.event_organizer_invites
  where public_token = p_token
  for update;

  if v_event_id is null then
    raise exception 'El enlace no es válido.';
  end if;

  if v_submitted_at is not null then
    raise exception 'La selección ya fue enviada.';
  end if;

  select count(distinct recipe_id)
  into v_selection_count
  from pg_catalog.unnest(p_recipe_ids) as recipe_id;

  if coalesce(v_selection_count, 0) < 1 then
    raise exception 'Selecciona al menos una bebida.';
  end if;

  if exists (
    select 1
    from (
      select distinct recipe_id
      from pg_catalog.unnest(p_recipe_ids) as recipe_id
    ) as requested
    where not exists (
      select 1
      from public.event_available_recipes as available
      where available.event_id = v_event_id
        and available.recipe_id = requested.recipe_id
    )
  ) then
    raise exception 'La selección contiene una bebida que no está disponible para este evento.';
  end if;

  delete from public.event_selected_recipes
  where event_id = v_event_id;

  insert into public.event_selected_recipes (event_id, recipe_id)
  select v_event_id, recipe_id
  from (
    select distinct recipe_id
    from pg_catalog.unnest(p_recipe_ids) as recipe_id
  ) as selected;

  update public.event_organizer_invites
  set submitted_at = pg_catalog.now()
  where event_id = v_event_id;

  update public.events
  set status = 'selection_received'
  where id = v_event_id;
end;
$$;

revoke all on function public.submit_organizer_selection(uuid, uuid[])
from public;

grant execute on function public.submit_organizer_selection(uuid, uuid[])
to anon, authenticated;
-- Fase 4: carta pública para invitados y código QR.
-- Ejecutar una vez en Supabase SQL Editor, después de phase3.sql.

create table if not exists public.event_guest_menus (
  event_id uuid primary key
    references public.events(id)
    on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.event_guest_menus
  enable row level security;

revoke all on table public.event_guest_menus from anon;
revoke all on table public.event_guest_menus from authenticated;

grant select on table public.event_guest_menus to authenticated;

drop policy if exists "event_guest_menus_select_own"
on public.event_guest_menus;

create policy "event_guest_menus_select_own"
on public.event_guest_menus
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_guest_menus.event_id
      and events.owner_id = (select auth.uid())
  )
);

-- Migra eventos que ya recibieron una selección durante la Fase 3.
insert into public.event_guest_menus (event_id)
select events.id
from public.events as events
where events.status in ('selection_received', 'menu_ready')
  and exists (
    select 1
    from public.event_selected_recipes as selected
    where selected.event_id = events.id
  )
on conflict (event_id) do nothing;

update public.events as events
set status = 'menu_ready'
where events.status = 'selection_received'
  and exists (
    select 1
    from public.event_guest_menus as menus
    where menus.event_id = events.id
  );

-- Devuelve solo los datos necesarios para la carta pública de invitados.
-- El token del menú actúa como credencial secreta de acceso.
create or replace function public.get_guest_menu(
  p_token uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_name text;
  v_event_date date;
  v_event_type text;
  v_recipes jsonb;
begin
  select
    events.id,
    events.name,
    events.event_date,
    events.event_type
  into
    v_event_id,
    v_event_name,
    v_event_date,
    v_event_type
  from public.event_guest_menus as menus
  join public.events as events
    on events.id = menus.event_id
  where menus.public_token = p_token
    and events.status = 'menu_ready';

  if v_event_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', recipes.id,
        'title', recipes.title,
        'description', recipes.description,
        'category', recipes.category,
        'image_url', recipes.image_url,
        'ingredients', coalesce(
          (
            select jsonb_agg(ingredient_item ->> 'name')
            from jsonb_array_elements(recipes.ingredients) as ingredient_item
            where nullif(btrim(ingredient_item ->> 'name'), '') is not null
          ),
          '[]'::jsonb
        )
      )
      order by recipes.title
    ),
    '[]'::jsonb
  )
  into v_recipes
  from public.event_selected_recipes as selected
  join public.recipes as recipes
    on recipes.id = selected.recipe_id
  where selected.event_id = v_event_id;

  return jsonb_build_object(
    'name', v_event_name,
    'event_date', v_event_date,
    'event_type', v_event_type,
    'recipes', v_recipes
  );
end;
$$;

revoke all on function public.get_guest_menu(uuid)
from public;

grant execute on function public.get_guest_menu(uuid)
to anon, authenticated;

-- Reemplaza la función de la Fase 3 para que, al confirmar el organizador,
-- se cree automáticamente la carta pública y el evento quede en Carta lista.
create or replace function public.submit_organizer_selection(
  p_token uuid,
  p_recipe_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_submitted_at timestamptz;
  v_selection_count integer;
begin
  select
    event_id,
    submitted_at
  into
    v_event_id,
    v_submitted_at
  from public.event_organizer_invites
  where public_token = p_token
  for update;

  if v_event_id is null then
    raise exception 'El enlace no es válido.';
  end if;

  if v_submitted_at is not null then
    raise exception 'La selección ya fue enviada.';
  end if;

  select count(distinct recipe_id)
  into v_selection_count
  from pg_catalog.unnest(p_recipe_ids) as recipe_id;

  if coalesce(v_selection_count, 0) < 1 then
    raise exception 'Selecciona al menos una bebida.';
  end if;

  if exists (
    select 1
    from (
      select distinct recipe_id
      from pg_catalog.unnest(p_recipe_ids) as recipe_id
    ) as requested
    where not exists (
      select 1
      from public.event_available_recipes as available
      where available.event_id = v_event_id
        and available.recipe_id = requested.recipe_id
    )
  ) then
    raise exception 'La selección contiene una bebida que no está disponible para este evento.';
  end if;

  delete from public.event_selected_recipes
  where event_id = v_event_id;

  insert into public.event_selected_recipes (event_id, recipe_id)
  select v_event_id, recipe_id
  from (
    select distinct recipe_id
    from pg_catalog.unnest(p_recipe_ids) as recipe_id
  ) as selected;

  update public.event_organizer_invites
  set submitted_at = pg_catalog.now()
  where event_id = v_event_id;

  insert into public.event_guest_menus (event_id)
  values (v_event_id)
  on conflict (event_id) do nothing;

  update public.events
  set status = 'menu_ready'
  where id = v_event_id;
end;
$$;

revoke all on function public.submit_organizer_selection(uuid, uuid[])
from public;

grant execute on function public.submit_organizer_selection(uuid, uuid[])
to anon, authenticated;
