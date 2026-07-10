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
  v_submitted_at timestamptz;
  v_recipes jsonb;
begin
  select
    events.id,
    events.name,
    events.event_date,
    invites.submitted_at
  into
    v_event_id,
    v_event_name,
    v_event_date,
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
