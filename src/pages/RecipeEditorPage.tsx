import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecipeForm } from '../components/RecipeForm';
import { uploadRecipeImage } from '../services/storage';
import { Ingredient, Recipe, RecipePayload } from '../types';

interface RecipeEditorPageProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  userId: string;
  onCreate: (payload: RecipePayload) => Promise<Recipe>;
  onUpdate: (id: string, payload: RecipePayload) => Promise<Recipe>;
}

export function RecipeEditorPage({
  ingredients,
  recipes,
  userId,
  onCreate,
  onUpdate,
}: RecipeEditorPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const initialRecipe = useMemo(() => recipes.find((recipe) => recipe.id === id), [id, recipes]);

  async function handleSubmit(payload: RecipePayload, imageFile: File | null) {
    setBusy(true);

    try {
      const imageUrl = imageFile ? await uploadRecipeImage(userId, imageFile) : initialRecipe?.image_url ?? null;
      const nextPayload = { ...payload, image_url: imageUrl };

      const saved = initialRecipe
        ? await onUpdate(initialRecipe.id, nextPayload)
        : await onCreate(nextPayload);

      navigate(`/recetas/${saved.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <RecipeForm
        allIngredients={ingredients}
        busy={busy}
        initialRecipe={initialRecipe}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
