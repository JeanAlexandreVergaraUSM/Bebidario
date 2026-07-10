import { supabase } from '../lib/supabase';
import {
  BebidarioEvent,
  EventGuestMenu,
  EventOrganizerInvite,
  EventPayload,
  EventRecipeLinkRow,
  PublicGuestMenu,
  PublicOrganizerEvent,
} from '../types';

export async function fetchEvents(): Promise<BebidarioEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as BebidarioEvent[];
}

export async function fetchEventById(
  eventId: string,
): Promise<BebidarioEvent> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    throw error;
  }

  return data as BebidarioEvent;
}

export async function createEvent(
  ownerId: string,
  payload: EventPayload,
): Promise<BebidarioEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      owner_id: ownerId,
      name: payload.name.trim(),
      event_date: payload.event_date,
      event_type: payload.event_type,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as BebidarioEvent;
}

export async function updateEvent(
  eventId: string,
  payload: EventPayload,
): Promise<BebidarioEvent> {
  const { data, error } = await supabase
    .from('events')
    .update({
      name: payload.name.trim(),
      event_date: payload.event_date,
      event_type: payload.event_type,
    })
    .eq('id', eventId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as BebidarioEvent;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

export async function fetchEventAvailableRecipeIds(
  eventId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_available_recipes')
    .select('recipe_id')
    .eq('event_id', eventId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.recipe_id as string);
}

export async function fetchEventAvailableRecipeRows(): Promise<EventRecipeLinkRow[]> {
  const { data, error } = await supabase
    .from('event_available_recipes')
    .select('event_id, recipe_id');

  if (error) {
    throw error;
  }

  return (data ?? []) as EventRecipeLinkRow[];
}

export async function fetchEventSelectedRecipeRows(): Promise<EventRecipeLinkRow[]> {
  const { data, error } = await supabase
    .from('event_selected_recipes')
    .select('event_id, recipe_id');

  if (error) {
    throw error;
  }

  return (data ?? []) as EventRecipeLinkRow[];
}

export async function fetchEventOrganizerInvites(): Promise<EventOrganizerInvite[]> {
  const { data, error } = await supabase
    .from('event_organizer_invites')
    .select('event_id, public_token, created_at, submitted_at');

  if (error) {
    throw error;
  }

  return (data ?? []) as EventOrganizerInvite[];
}

export async function saveEventAvailableRecipes(
  eventId: string,
  recipeIds: string[],
): Promise<void> {
  const uniqueRecipeIds = [...new Set(recipeIds)];

  const { error } = await supabase.rpc('set_event_available_recipes', {
    p_event_id: eventId,
    p_recipe_ids: uniqueRecipeIds,
  });

  if (error) {
    throw error;
  }
}

export async function createEventOrganizerInvite(
  eventId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_event_organizer_invite', {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  if (typeof data !== 'string') {
    throw new Error('No se pudo generar el enlace del organizador.');
  }

  return data;
}

export async function fetchPublicOrganizerEvent(
  token: string,
): Promise<PublicOrganizerEvent | null> {
  const { data, error } = await supabase.rpc('get_organizer_event', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as PublicOrganizerEvent;
}

export async function submitOrganizerSelection(
  token: string,
  recipeIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc('submit_organizer_selection', {
    p_token: token,
    p_recipe_ids: [...new Set(recipeIds)],
  });

  if (error) {
    throw error;
  }
}


export async function fetchEventGuestMenus(): Promise<EventGuestMenu[]> {
  const { data, error } = await supabase
    .from('event_guest_menus')
    .select('event_id, public_token, created_at');

  if (error) {
    throw error;
  }

  return (data ?? []) as EventGuestMenu[];
}

export async function fetchPublicGuestMenu(
  token: string,
): Promise<PublicGuestMenu | null> {
  const { data, error } = await supabase.rpc('get_guest_menu', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as PublicGuestMenu;
}
