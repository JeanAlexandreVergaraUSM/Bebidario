import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { Recipe } from '../types';

interface HomePageProps {
  recipes: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

export function HomePage({ recipes, onToggleFavorite }: HomePageProps) {
  const [query, setQuery] = useState('');

  const visibleRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return recipes;
    }

    return recipes.filter((recipe) => {
      const ingredients = recipe.ingredients.map((item) => item.name.toLowerCase()).join(' ');
      const tags = recipe.tags.join(' ').toLowerCase();
      return [recipe.title, recipe.description ?? '', recipe.category, ingredients, tags]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
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
        description="Empieza con una preparación simple y luego la irás afinando desde el celular o el computador."
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
<p className="muted">{visibleRecipes.length} de {recipes.length} bebida(s) visibles.</p>
        </div>
        <Link className="primary-button" to="/recetas/nueva">
          + Nueva bebida
        </Link>
      </header>

      <label>
        Buscar receta o ingrediente
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: frutilla, brunch, cítrico"
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
          description="Prueba otro nombre, ingrediente o tag."
          title="No encontramos recetas con ese filtro"
        />
      )}
    </section>
  );
}
