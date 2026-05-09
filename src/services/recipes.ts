import { supabase } from '../lib/supabase';
import { Recipe, RecipePayload } from '../types';

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Recipe[];
}

export async function fetchRecipeById(id: string) {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();

  if (error) {
    throw error;
  }

  return data as Recipe;
}

export async function createRecipe(ownerId: string, payload: RecipePayload) {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      owner_id: ownerId,
      ...payload,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Recipe;
}

export async function updateRecipe(id: string, payload: RecipePayload) {
  const { data, error } = await supabase
    .from('recipes')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Recipe;
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function toggleRecipeFavorite(id: string, favorite: boolean) {
  const { data, error } = await supabase
    .from('recipes')
    .update({ favorite, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Recipe;
}
