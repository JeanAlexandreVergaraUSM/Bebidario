-- Fase 5: tipo de evento, temática visual y datos públicos mínimos.
-- Ejecutar una vez en Supabase SQL Editor, después de phase4.sql.

alter table public.events
  add column if not exists event_type text;

update public.events
set event_type = 'birthday'
where event_type is null;

alter table public.events
  alter column event_type set default 'birthday';

alter table public.events
  alter column event_type set not null;

alter table public.events
  drop constraint if exists events_event_type_check;

alter table public.events
  add constraint events_event_type_check
  check (event_type in ('birthday', 'general'));

-- Devuelve el tipo de evento para adaptar la experiencia del organizador.
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

-- Devuelve el tipo de evento para aplicar la temática correcta en la carta pública.
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
