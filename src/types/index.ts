export type Difficulty = 'facil' | 'media' | 'alta';

export type RecipeCategory =
  | 'Frutal'
  | 'Cremosa'
  | 'Cítrica'
  | 'Fizz'
  | 'Refrescante'
  | 'Té y café'
  | 'Especial';

export interface Ingredient {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  image_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string | null;
  name: string;
  amount: string;
  optional: boolean;
}

export interface RecipeStep {
  id: string;
  text: string;
}

export interface Recipe {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: RecipeCategory;
  difficulty: Difficulty;
  prep_minutes: number;
  servings: number;
  image_url: string | null;
  favorite: boolean;
  tags: string[];
  garnish: string | null;
  notes: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  created_at: string;
  updated_at: string;
}

export interface RecipePayload {
  title: string;
  description: string;
  category: RecipeCategory;
  difficulty: Difficulty;
  prep_minutes: number;
  servings: number;
  image_url: string | null;
  favorite: boolean;
  tags: string[];
  garnish: string;
  notes: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}
