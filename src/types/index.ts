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

export type EventStatus =
  | 'draft'
  | 'awaiting_selection'
  | 'selection_received'
  | 'menu_ready'
  | 'archived';

export type EventType = 'birthday' | 'general';

export interface BebidarioEvent {
  id: string;
  owner_id: string;
  name: string;
  event_date: string;
  event_type: EventType;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventPayload {
  name: string;
  event_date: string;
  event_type: EventType;
}

export interface EventOrganizerInvite {
  event_id: string;
  public_token: string;
  created_at: string;
  submitted_at: string | null;
}

export interface EventRecipeLinkRow {
  event_id: string;
  recipe_id: string;
}

export interface PublicOrganizerRecipe {
  id: string;
  title: string;
  description: string | null;
  category: RecipeCategory;
  image_url: string | null;
  ingredients: string[];
}

export interface PublicOrganizerEvent {
  name: string;
  event_date: string;
  event_type: EventType;
  submitted: boolean;
  recipes: PublicOrganizerRecipe[];
}

export interface EventGuestMenu {
  event_id: string;
  public_token: string;
  created_at: string;
}

export interface PublicGuestRecipe {
  id: string;
  title: string;
  description: string | null;
  category: RecipeCategory;
  image_url: string | null;
  ingredients: string[];
}

export interface PublicGuestMenu {
  name: string;
  event_date: string;
  event_type: EventType;
  recipes: PublicGuestRecipe[];
}
