import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { Recipe } from '../types';

interface HomePageProps {
  recipes: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function HomePage({ recipes, onToggleFavorite }: HomePageProps) {
  const [query, setQuery] = useState('');

  const visibleRecipes = useMemo(() => {
    const normalized = normalizeText(query.trim());

    if (!normalized) return recipes;

    return recipes.filter((recipe) => {
      const ingredients = recipe.ingredients.map((item) => item.name).join(' ');
      const tags = recipe.tags.join(' ');

      return normalizeText([
        recipe.title,
        recipe.description ?? '',
        recipe.category,
        ingredients,
        tags,
      ].join(' ')).includes(normalized);
    });
  }, [query, recipes]);

  if (!recipes.length) {
    return (
      <EmptyState
        action={
          <Link className="primary-button" to="/recetas/nueva">
            Crear primera bebida
          </Link>
        }
        description="Empieza con una preparación simple. Después podrás editarla, agregar imágenes y usarla en tus eventos."
        title="Todavía no tienes bebidas guardadas"
      />
    );
  }

  return (
    <section className="page-stack">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Tu colección</p>
          <h2>Bebidas creadas</h2>
          <p className="muted" aria-live="polite">
            {visibleRecipes.length} de {recipes.length} {recipes.length === 1 ? 'bebida visible' : 'bebidas visibles'}.
          </p>
        </div>

        <Link className="primary-button" to="/recetas/nueva">
          + Nueva bebida
        </Link>
      </header>

      <label htmlFor="recipe-search">
        Buscar bebida o ingrediente
        <input
          id="recipe-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: frutilla, cítrico, coco..."
          type="search"
          value={query}
        />
      </label>

      {visibleRecipes.length ? (
        <div className="card-grid">
          {visibleRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} onToggleFavorite={onToggleFavorite} recipe={recipe} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Prueba con otro nombre, ingrediente o categoría."
          title="No encontramos bebidas con ese filtro"
        />
      )}
    </section>
  );
}
