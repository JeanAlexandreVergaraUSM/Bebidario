import { useState } from 'react';
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

  const editingIngredient = ingredients.find((ingredient) => ingredient.id === editingId);
  const isEditing = Boolean(editingIngredient);
  const shouldShowForm = showCreateForm || isEditing;

  async function saveIngredient(
    payload: { name: string; category: string; notes: string },
    imageFile: File | null,
  ) {
    setBusy(true);

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
    } catch (error) {
      console.error('Error guardando ingrediente:', error);
      const message =
        error instanceof Error ? error.message : 'No se pudo guardar el ingrediente.';
      window.alert(message);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setShowCreateForm(false);
  }

  return (
    <section className="page-stack">
      <section className="page-header-row">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2>Ingredientes</h2>
          <p className="muted">
            Guarda tu base de ingredientes para reutilizarlos en distintas bebidas.
          </p>
        </div>

        {!shouldShowForm ? (
          <button
            className="primary-button"
            onClick={() => setShowCreateForm(true)}
            type="button"
          >
            + Añadir ingrediente
          </button>
        ) : null}
      </section>

      {shouldShowForm ? (
        <IngredientForm
          busy={busy}
          initialIngredient={editingIngredient}
          onCancel={handleCancel}
          onSubmit={saveIngredient}
        />
      ) : null}

      {!ingredients.length ? (
        <EmptyState
          action={
            !shouldShowForm ? (
              <button
                className="primary-button"
                onClick={() => setShowCreateForm(true)}
                type="button"
              >
                Crear primer ingrediente
              </button>
            ) : undefined
          }
          description="Crea una pequeña biblioteca para no volver a escribir cada ingrediente desde cero."
          title="Todavía no tienes ingredientes"
        />
      ) : (
        <section className="card-grid card-grid-ingredients">
          {ingredients.map((ingredient) => (
            <article className="editor-card ingredient-card" key={ingredient.id}>
              {ingredient.image_url ? (
                <img alt={ingredient.name} className="ingredient-image" src={ingredient.image_url} />
              ) : (
                <div className="ingredient-placeholder">🍓</div>
              )}

              <p className="eyebrow">{ingredient.category}</p>
              <h3>{ingredient.name}</h3>
              <p className="muted">{ingredient.notes || 'Sin notas.'}</p>
              <p className="muted">Usado en {recipesUsingIngredient(ingredient.id)} receta(s).</p>

              <div className="button-row">
                <button
                  className="ghost-button"
                  onClick={() => {
                    setEditingId(ingredient.id);
                    setShowCreateForm(false);
                  }}
                  type="button"
                >
                  Editar
                </button>

                <button
                  className="ghost-button danger"
                  onClick={() => {
                    void onDelete(ingredient.id);
                  }}
                  type="button"
                >
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
