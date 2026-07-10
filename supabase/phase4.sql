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
  v_recipes jsonb;
begin
  select
    events.id,
    events.name,
    events.event_date
  into
    v_event_id,
    v_event_name,
    v_event_date
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
