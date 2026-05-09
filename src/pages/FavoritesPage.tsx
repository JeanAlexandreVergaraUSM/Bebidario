import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { Recipe } from '../types';

interface FavoritesPageProps {
  recipes: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
}

export function FavoritesPage({ recipes, onToggleFavorite }: FavoritesPageProps) {
  const favorites = recipes.filter((recipe) => recipe.favorite);

  if (!favorites.length) {
    return (
      <EmptyState
        action={
          <Link className="primary-button" to="/">
            Ver recetas
          </Link>
        }
        description="Marca con corazón las bebidas que quieras tener siempre a mano."
        title="Aún no tienes favoritas"
      />
    );
  }

  return (
    <section className="page-stack">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Acceso rápido</p>
          <h2>Tus favoritas</h2>
          <p className="muted">Perfectas para revisar rápido desde el celular.</p>
        </div>
      </header>

      <div className="card-grid">
        {favorites.map((recipe) => (
          <RecipeCard key={recipe.id} onToggleFavorite={onToggleFavorite} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}
