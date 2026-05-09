import { supabase } from '../lib/supabase';
import { Ingredient } from '../types';

export interface IngredientPayload {
  name: string;
  category: string;
  image_url: string | null;
  notes: string;
}

export async function fetchIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Ingredient[];
}

export async function createIngredient(ownerId: string, payload: IngredientPayload) {
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ owner_id: ownerId, ...payload })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Ingredient;
}

export async function updateIngredient(id: string, payload: IngredientPayload) {
  const { data, error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Ingredient;
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);

  if (error) {
    throw error;
  }
}
