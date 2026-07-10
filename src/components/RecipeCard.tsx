import { Link } from 'react-router-dom';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (recipe: Recipe) => void;
}

function difficultyLabel(value: Recipe['difficulty']) {
  if (value === 'facil') return 'Fácil';
  if (value === 'media') return 'Media';
  return 'Alta';
}

export function RecipeCard({ recipe, onToggleFavorite }: RecipeCardProps) {
  return (
    <article className="recipe-card">
      <div className="recipe-media-shell">
        <Link
          aria-label={`Ver receta de ${recipe.title}`}
          className="recipe-media"
          to={`/recetas/${recipe.id}`}
        >
          {recipe.image_url ? (
            <img alt={`Presentación de ${recipe.title}`} loading="lazy" src={recipe.image_url} />
          ) : (
            <div className="recipe-placeholder" aria-hidden="true">🍹</div>
          )}
        </Link>

        <button
          aria-label={recipe.favorite ? `Quitar ${recipe.title} de favoritas` : `Agregar ${recipe.title} a favoritas`}
          aria-pressed={recipe.favorite}
          className={`recipe-favorite ${recipe.favorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(recipe)}
          type="button"
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>

      <div className="recipe-content">
        <div className="recipe-topline">
          <span className="pill">{recipe.category}</span>
        </div>

        <Link className="recipe-title-link" to={`/recetas/${recipe.id}`}>
          <h3>{recipe.title}</h3>
        </Link>

        <p className="recipe-description">
          {recipe.description || 'Sin descripción todavía.'}
        </p>

        <div className="recipe-meta" aria-label="Datos de la receta">
          <span><span aria-hidden="true">⏱</span> {recipe.prep_minutes} min</span>
          <span><span aria-hidden="true">👥</span> {recipe.servings} porción{recipe.servings !== 1 ? 'es' : ''}</span>
          <span><span aria-hidden="true">⭐</span> {difficultyLabel(recipe.difficulty)}</span>
        </div>
      </div>
    </article>
  );
}
