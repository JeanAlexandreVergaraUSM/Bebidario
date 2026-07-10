import { useEffect, useRef, useState } from 'react';
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteDialogRef = useRef<HTMLElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!deleteOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      cancelDeleteRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) {
        event.preventDefault();
        closeDeleteDialog();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = deleteDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!elements?.length) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteOpen, deleting]);

  function closeDeleteDialog() {
    if (deleting) return;

    setDeleteOpen(false);
    setDeleteError(null);

    window.setTimeout(() => {
      deleteTriggerRef.current?.focus();
    }, 0);
  }

  async function confirmDelete() {
    if (!recipe) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await onDelete(recipe.id);
    } catch (error) {
      console.error('Error eliminando bebida:', error);
      setDeleteError('No se pudo eliminar la bebida. Intenta nuevamente.');
      setDeleting(false);
    }
  }

  if (!recipe) {
    return (
      <EmptyState
        action={
          <Link className="primary-button" to="/">
            Volver a Bebidas
          </Link>
        }
        description="La bebida no está disponible o todavía no se cargó."
        title="No encontramos esta bebida"
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

          <div className="detail-meta-row" aria-label="Datos de la bebida">
            <span><span aria-hidden="true">⏱</span> {recipe.prep_minutes} min</span>
            <span><span aria-hidden="true">👥</span> {recipe.servings} porción(es)</span>
            <span><span aria-hidden="true">📅</span> {formatDate(recipe.updated_at)}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button
            aria-pressed={recipe.favorite}
            className="ghost-button"
            onClick={() => onToggleFavorite(recipe)}
            type="button"
          >
            {recipe.favorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}
          </button>

          <Link className="primary-button" to={`/recetas/${recipe.id}/editar`}>
            Editar bebida
          </Link>

          <button
            ref={deleteTriggerRef}
            className="ghost-button danger"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            Eliminar bebida
          </button>
        </div>
      </header>

      {recipe.image_url ? (
        <img alt={`Presentación de ${recipe.title}`} className="detail-image" src={recipe.image_url} />
      ) : null}

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
            <span className="tag" key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          className="event-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <section
            ref={deleteDialogRef}
            className="event-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recipe-title"
            aria-describedby="delete-recipe-description"
          >
            <p className="eyebrow">Confirmar eliminación</p>
            <h2 id="delete-recipe-title">¿Eliminar {recipe.title}?</h2>
            <p className="muted" id="delete-recipe-description">
              La bebida se eliminará de tu colección. Esta acción no se puede deshacer.
            </p>

            {deleteError ? <p className="event-message event-message-error" role="alert">{deleteError}</p> : null}

            <div className="event-modal-actions">
              <button
                ref={cancelDeleteRef}
                className="ghost-button"
                disabled={deleting}
                onClick={closeDeleteDialog}
                type="button"
              >
                Conservar bebida
              </button>

              <button
                className="ghost-button danger"
                disabled={deleting}
                onClick={() => { void confirmDelete(); }}
                type="button"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar bebida'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
