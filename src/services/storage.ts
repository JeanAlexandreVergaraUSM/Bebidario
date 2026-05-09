import { supabase } from '../lib/supabase';
import { fileToWebp } from '../lib/helpers';

async function uploadFile(bucket: string, folder: string, file: File) {
  const transformed = await fileToWebp(file);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage.from(bucket).upload(path, transformed, {
    cacheControl: '3600',
    contentType: 'image/webp',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

export async function uploadRecipeImage(userId: string, file: File) {
  return uploadFile('recipe-images', userId, file);
}

export async function uploadIngredientImage(userId: string, file: File) {
  return uploadFile('ingredient-images', userId, file);
}
