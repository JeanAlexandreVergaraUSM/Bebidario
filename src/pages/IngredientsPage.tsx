import { useEffect, useMemo, useRef, useState } from 'react';
import { IngredientForm } from '../components/IngredientForm';
import { EmptyState } from '../components/EmptyState';
import { uploadIngredientImage } from '../services/storage';
import { Ingredient } from '../types';

interface IngredientsPageProps {
  ingredients: Ingredient[];
  recipesUsingIngredient: (ingredientId: string) => number;
  userId: string;
  onCreate: (payload: {
    name: string;
    category: string;
    notes: string;
    image_url: string | null;
  }) => Promise<void>;
  onUpdate: (
    ingredientId: string,
    payload: {
      name: string;
      category: string;
      notes: string;
      image_url: string | null;
    },
  ) => Promise<void>;
  onDelete: (ingredientId: string) => Promise<void>;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function IngredientsPage({
  ingredients,
  recipesUsingIngredient,
  userId,
  onCreate,
  onUpdate,
  onDelete,
}: IngredientsPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formRef = useRef<HTMLDivElement | null>(null);
  const deleteDialogRef = useRef<HTMLElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);

  const editingIngredient = ingredients.find((ingredient) => ingredient.id === editingId);
  const isEditing = Boolean(editingIngredient);
  const shouldShowForm = showCreateForm || isEditing;

  const filteredIngredients = useMemo(() => {
    const term = normalizeText(search.trim());

    if (!term) return ingredients;

    return ingredients.filter((ingredient) =>
      normalizeText([
        ingredient.name,
        ingredient.category,
        ingredient.notes ?? '',
      ].join(' ')).includes(term),
    );
  }, [ingredients, search]);

  useEffect(() => {
    if (!shouldShowForm) return;

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [editingId, shouldShowForm]);

  useEffect(() => {
    if (!deleteTarget) return;

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
  }, [deleteTarget, deleting]);

  function openCreateForm() {
    setEditingId(null);
    setShowCreateForm(true);
    setError(null);
  }

  function openEditForm(ingredientId: string) {
    setEditingId(ingredientId);
    setShowCreateForm(false);
    setError(null);
  }

  async function saveIngredient(
    payload: { name: string; category: string; notes: string },
    imageFile: File | null,
  ) {
    setBusy(true);
    setError(null);

    try {
      const imageUrl = imageFile
        ? await uploadIngredientImage(userId, imageFile)
        : editingIngredient?.image_url ?? null;

      if (editingIngredient) {
        await onUpdate(editingIngredient.id, { ...payload, image_url: imageUrl });
        setEditingId(null);
      } else {
        await onCreate({ ...payload, image_url: imageUrl });
        setShowCreateForm(false);
      }
    } catch (saveError) {
      console.error('Error guardando ingrediente:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el ingrediente.');
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setShowCreateForm(false);
    setError(null);
  }

  function requestDelete(ingredient: Ingredient, trigger: HTMLButtonElement) {
    const usedCount = recipesUsingIngredient(ingredient.id);

    if (usedCount > 0) {
      setError(
        `No puedes eliminar ${ingredient.name} porque está usado en ${usedCount} ${usedCount === 1 ? 'bebida' : 'bebidas'}.`,
      );
      return;
    }

    deleteTriggerRef.current = trigger;
    setDeleteTarget(ingredient);
    setError(null);
  }

  function closeDeleteDialog() {
    if (deleting) return;

    setDeleteTarget(null);

    window.setTimeout(() => {
      deleteTriggerRef.current?.focus();
    }, 0);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error('Error eliminando ingrediente:', deleteError);
      setError('No se pudo eliminar el ingrediente. Intenta nuevamente.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2>Ingredientes</h2>
          <p className="muted" aria-live="polite">
            {filteredIngredients.length} de {ingredients.length} {ingredients.length === 1 ? 'ingrediente visible' : 'ingredientes visibles'}.
          </p>
        </div>

        {!shouldShowForm ? (
          <button className="primary-button" onClick={openCreateForm} type="button">
            + Añadir ingrediente
          </button>
        ) : null}
      </header>

      <label htmlFor="ingredient-search">
        Buscar ingrediente
        <input
          id="ingredient-search"
          type="search"
          placeholder="Ej: piña, cítrico, jarabe..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {error ? (
        <div className="event-message event-message-error" role="alert">
          {error}
        </div>
      ) : null}

      {shouldShowForm ? (
        <div className="form-scroll-anchor" ref={formRef}>
          <IngredientForm
            busy={busy}
            initialIngredient={editingIngredient}
            onCancel={handleCancel}
            onSubmit={saveIngredient}
          />
        </div>
      ) : null}

      {!ingredients.length ? (
        <EmptyState
          action={
            !shouldShowForm ? (
              <button className="primary-button" onClick={openCreateForm} type="button">
                Crear primer ingrediente
              </button>
            ) : undefined
          }
          description="Crea una biblioteca para reutilizar ingredientes al preparar nuevas bebidas."
          title="Todavía no tienes ingredientes"
        />
      ) : filteredIngredients.length === 0 && search.trim() !== '' ? (
        <EmptyState
          title="No se encontraron ingredientes"
          description="Prueba con otro nombre, categoría o nota."
        />
      ) : (
        <section className="card-grid card-grid-ingredients" aria-label="Ingredientes guardados">
          {filteredIngredients.map((ingredient) => {
            const usedCount = recipesUsingIngredient(ingredient.id);

            return (
              <article className="editor-card ingredient-card" key={ingredient.id}>
                {ingredient.image_url ? (
                  <img
                    alt={`Presentación de ${ingredient.name}`}
                    className="ingredient-image"
                    loading="lazy"
                    src={ingredient.image_url}
                  />
                ) : (
                  <div className="ingredient-placeholder" aria-hidden="true">🍓</div>
                )}

                <p className="eyebrow">{ingredient.category}</p>
                <h3>{ingredient.name}</h3>
                <p className="muted">{ingredient.notes || 'Sin notas.'}</p>
                <p className="muted">
                  Usado en {usedCount} {usedCount === 1 ? 'bebida' : 'bebidas'}.
                </p>

                <div className="button-row">
                  <button
                    className="ghost-button"
                    onClick={() => openEditForm(ingredient.id)}
                    type="button"
                  >
                    Editar ingrediente
                  </button>

                  <button
                    className="ghost-button danger"
                    disabled={usedCount > 0}
                    title={usedCount > 0 ? 'No se puede eliminar mientras esté usado en una bebida' : undefined}
                    onClick={(event) => requestDelete(ingredient, event.currentTarget)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {deleteTarget ? (
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
            aria-labelledby="delete-ingredient-title"
            aria-describedby="delete-ingredient-description"
          >
            <p className="eyebrow">Confirmar eliminación</p>
            <h2 id="delete-ingredient-title">¿Eliminar {deleteTarget.name}?</h2>
            <p className="muted" id="delete-ingredient-description">
              El ingrediente se eliminará de tu biblioteca. Esta acción no se puede deshacer.
            </p>

            <div className="event-modal-actions">
              <button
                ref={cancelDeleteRef}
                className="ghost-button"
                disabled={deleting}
                onClick={closeDeleteDialog}
                type="button"
              >
                Conservar ingrediente
              </button>

              <button
                className="ghost-button danger"
                disabled={deleting}
                onClick={() => { void confirmDelete(); }}
                type="button"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar ingrediente'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
