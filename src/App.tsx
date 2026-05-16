import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { AuthCard } from './components/AuthCard';
import { Layout } from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';
import { supabase } from './lib/supabase';
import { createIngredient, deleteIngredient, fetchIngredients, updateIngredient } from './services/ingredients';
import { createRecipe, deleteRecipe, fetchRecipes, toggleRecipeFavorite, updateRecipe } from './services/recipes';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { IngredientsPage } from './pages/IngredientsPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { Ingredient, Recipe, RecipePayload } from './types';
import { ScrollToTop } from './components/ScrollToTop';

const fontKey = 'bebidario-font-size';
const historyKey = 'bebidario-history';

function AppRoutes({
  ingredients,
  recipes,
  session,
  onCreateIngredient,
  onCreateRecipe,
  onDeleteIngredient,
  onDeleteRecipe,
  onExport,
  onToggleFavorite,
  onUpdateIngredient,
  onUpdateRecipe,
  fontSize,
  setFontSize,
}: {
  ingredients: Ingredient[];
  recipes: Recipe[];
  session: Session;
  onCreateIngredient: (payload: {
    name: string;
    category: string;
    notes: string;
    image_url: string | null;
  }) => Promise<void>;
  onCreateRecipe: (payload: RecipePayload) => Promise<Recipe>;
  onDeleteIngredient: (ingredientId: string) => Promise<void>;
  onDeleteRecipe: (recipeId: string) => Promise<void>;
  onExport: () => void;
  onToggleFavorite: (recipe: Recipe) => void;
  onUpdateIngredient: (ingredientId: string, payload: {
    name: string;
    category: string;
    notes: string;
    image_url: string | null;
  }) => Promise<void>;
  onUpdateRecipe: (recipeId: string, payload: RecipePayload) => Promise<Recipe>;
  fontSize: 'sm' | 'md' | 'lg';
  setFontSize: (font: 'sm' | 'md' | 'lg') => void;
}) {
  const recipesUsingIngredient = (ingredientId: string) =>
    recipes.filter((recipe) =>
      recipe.ingredients.some((ingredient) => ingredient.ingredientId === ingredientId),
    ).length;

  return (
    <Routes>
      <Route element={<Layout session={session} />} path="/">
        <Route index element={<HomePage onToggleFavorite={onToggleFavorite} recipes={recipes} />} />
        <Route
          element={<FavoritesPage onToggleFavorite={onToggleFavorite} recipes={recipes} />}
          path="favoritas"
        />
        <Route
          element={
            <IngredientsPage
              ingredients={ingredients}
              onCreate={onCreateIngredient}
              onDelete={onDeleteIngredient}
              onUpdate={onUpdateIngredient}
              recipesUsingIngredient={recipesUsingIngredient}
              userId={session.user.id}
            />
          }
          path="ingredientes"
        />
        <Route
          element={
            <RecipeEditorPage
              ingredients={ingredients}
              onCreate={onCreateRecipe}
              onUpdate={onUpdateRecipe}
              recipes={recipes}
              userId={session.user.id}
            />
          }
          path="recetas/nueva"
        />
        <Route
          element={
            <RecipeEditorPage
              ingredients={ingredients}
              onCreate={onCreateRecipe}
              onUpdate={onUpdateRecipe}
              recipes={recipes}
              userId={session.user.id}
            />
          }
          path="recetas/:id/editar"
        />
        <Route
          element={
            <RecipeDetailPage
              ingredients={ingredients}
              onDelete={onDeleteRecipe}
              onToggleFavorite={onToggleFavorite}
              recipes={recipes}
            />
          }
          path="recetas/:id"
        />
        <Route
          element={
            <SettingsPage
              fontSize={fontSize}
              ingredients={ingredients}
              onChangeFont={setFontSize}
              onExport={onExport}
              recipes={recipes}
            />
          }
          path="ajustes"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

function AppInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [fontSize, setFontSizeState] = useState<'sm' | 'md' | 'lg'>(() => {
    const stored = localStorage.getItem(fontKey);
    return stored === 'sm' || stored === 'lg' ? stored : 'md';
  });

  useEffect(() => {
    document.body.dataset.fontSize = fontSize;
    localStorage.setItem(fontKey, fontSize);
  }, [fontSize]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setRecipes([]);
      setIngredients([]);
      return;
    }

    async function loadData() {
      const [nextRecipes, nextIngredients] = await Promise.all([fetchRecipes(), fetchIngredients()]);
      setRecipes(nextRecipes);
      setIngredients(nextIngredients);
    }

    void loadData();
  }, [session]);

  const onCreateRecipe = async (payload: RecipePayload) => {
    const created = await createRecipe(session!.user.id, payload);
    setRecipes((current) => [created, ...current]);
    addToHistory(created.id);
    return created;
  };

  const onUpdateRecipe = async (recipeId: string, payload: RecipePayload) => {
    const updated = await updateRecipe(recipeId, payload);
    setRecipes((current) => current.map((recipe) => (recipe.id === updated.id ? updated : recipe)));
    addToHistory(updated.id);
    return updated;
  };

  const onDeleteRecipe = async (recipeId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta receta?')) {
      return;
    }

    await deleteRecipe(recipeId);
    setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
    window.location.hash = '#/';
  };

  const onToggleFavorite = async (recipe: Recipe) => {
    const updated = await toggleRecipeFavorite(recipe.id, !recipe.favorite);
    setRecipes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

 const onCreateIngredient = async (payload: {
  name: string;
  category: string;
  notes: string;
  image_url: string | null;
}) => {
  try {
    const created = await createIngredient(session!.user.id, payload);
    setIngredients((current) =>
      [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
  } catch (error) {
    console.error('Error en createIngredient:', error);
    throw error;
  }
};

  const onUpdateIngredient = async (
    ingredientId: string,
    payload: { name: string; category: string; notes: string; image_url: string | null },
  ) => {
    const updated = await updateIngredient(ingredientId, payload);
    setIngredients((current) =>
      current.map((ingredient) => (ingredient.id === updated.id ? updated : ingredient)).sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const onDeleteIngredient = async (ingredientId: string) => {
    const usedCount = recipes.filter((recipe) =>
      recipe.ingredients.some((ingredient) => ingredient.ingredientId === ingredientId),
    ).length;

    if (usedCount > 0) {
      window.alert('No puedes borrar este ingrediente porque está usado en una o más recetas.');
      return;
    }

    if (!window.confirm('¿Seguro que quieres borrar este ingrediente?')) {
      return;
    }

    await deleteIngredient(ingredientId);
    setIngredients((current) => current.filter((ingredient) => ingredient.id !== ingredientId));
  };

  const onExport = () => {
    const content = JSON.stringify({ recipes, ingredients }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bebidario-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthCard onReady={() => undefined} />;
  }

  return (
    <AppRoutes
      fontSize={fontSize}
      ingredients={ingredients}
      onCreateIngredient={onCreateIngredient}
      onCreateRecipe={onCreateRecipe}
      onDeleteIngredient={onDeleteIngredient}
      onDeleteRecipe={onDeleteRecipe}
      onExport={onExport}
      onToggleFavorite={onToggleFavorite}
      onUpdateIngredient={onUpdateIngredient}
      onUpdateRecipe={onUpdateRecipe}
      recipes={recipes}
      session={session}
      setFontSize={setFontSizeState}
    />
  );
}

function addToHistory(recipeId: string) {
  const current = JSON.parse(localStorage.getItem(historyKey) ?? '[]') as string[];
  const next = [recipeId, ...current.filter((item) => item !== recipeId)].slice(0, 20);
  localStorage.setItem(historyKey, JSON.stringify(next));
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AppInner />
    </HashRouter>
  );
}
