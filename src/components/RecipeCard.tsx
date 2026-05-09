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
      <Link className="recipe-media" to={`/recetas/${recipe.id}`}>
        {recipe.image_url ? (
          <img alt={recipe.title} src={recipe.image_url} />
        ) : (
          <div className="recipe-placeholder">🍹</div>
        )}

        <button
          aria-label={recipe.favorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}
          className={`recipe-favorite ${recipe.favorite ? 'active' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            onToggleFavorite(recipe);
          }}
          type="button"
        >
          ♥
        </button>
      </Link>

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

        <div className="recipe-meta">
          <span>⏱ {recipe.prep_minutes} min</span>
          <span>👥 {recipe.servings} porción{recipe.servings !== 1 ? 'es' : ''}</span>
          <span>⭐ {difficultyLabel(recipe.difficulty)}</span>
        </div>
      </div>
    </article>
  );
}