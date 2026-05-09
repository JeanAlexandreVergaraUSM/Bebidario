import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../lib/helpers';
import { Ingredient, Recipe } from '../types';

interface RecipeDetailPageProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onDelete: (recipeId: string) => Promise<void>;
  onToggleFavorite: (recipe: Recipe) => void;
}

export function RecipeDetailPage({ recipes, ingredients, onDelete, onToggleFavorite }: RecipeDetailPageProps) {
  const { id } = useParams();
  const recipe = recipes.find((item) => item.id === id);

  if (!recipe) {
    return (
      <EmptyState
        action={
          <Link className="primary-button" to="/">
            Volver al inicio
          </Link>
        }
        description="La receta no está disponible o todavía no se cargó."
        title="No encontramos esta receta"
      />
    );
  }

  return (
    <section className="page-stack recipe-detail-page">
      <header className="detail-hero">
        <div>
          <p className="eyebrow">{recipe.category}</p>
          <h2>{recipe.title}</h2>
          <p className="muted">{recipe.description || 'Sin descripción.'}</p>

          <div className="detail-meta-row">
            <span>⏱ {recipe.prep_minutes} min</span>
            <span>👥 {recipe.servings} porción(es)</span>
            <span>📅 {formatDate(recipe.updated_at)}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button className="ghost-button" onClick={() => onToggleFavorite(recipe)} type="button">
            {recipe.favorite ? 'Quitar favorita' : 'Marcar favorita'}
          </button>
          <Link className="primary-button" to={`/recetas/${recipe.id}/editar`}>
            Editar
          </Link>
          <button
            className="ghost-button danger"
            onClick={() => {
              void onDelete(recipe.id);
            }}
            type="button"
          >
            Eliminar
          </button>
        </div>
      </header>

      {recipe.image_url ? <img alt={recipe.title} className="detail-image" src={recipe.image_url} /> : null}

      <div className="detail-columns">
        <article className="editor-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Ingredientes</p>
              <h2>Qué lleva</h2>
            </div>
          </div>

          <ul className="detail-list">
            {recipe.ingredients.map((item) => {
              const libraryItem = ingredients.find((ingredient) => ingredient.id === item.ingredientId);
              return (
                <li className="detail-list-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    {libraryItem?.category ? <span>{libraryItem.category}</span> : null}
                  </div>
                  <div>
                    <span>{item.amount}</span>
                    {item.optional ? <span>Opcional</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="editor-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Preparación</p>
              <h2>Paso a paso</h2>
            </div>
          </div>

          <ol className="step-list">
            {recipe.steps.map((step, index) => (
              <li key={step.id}>
                <span>{index + 1}</span>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </article>
      </div>

      <div className="detail-columns">
        <article className="editor-card">
          <p className="eyebrow">Decoración</p>
          <p>{recipe.garnish || 'Sin decoración definida.'}</p>
        </article>
        <article className="editor-card">
          <p className="eyebrow">Notas</p>
          <p>{recipe.notes || 'Sin notas por ahora.'}</p>
        </article>
      </div>

      {recipe.tags.length ? (
        <div className="tag-row">
          {recipe.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
