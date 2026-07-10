import { FormEvent, useEffect, useRef, useState } from 'react';
import { clearDraft, draftKeys, hasDraft, markActiveDraft } from '../lib/draftGuard';
import { Ingredient } from '../types';

interface IngredientFormProps {
  initialIngredient?: Ingredient;
  onSubmit: (
    payload: {
      name: string;
      category: string;
      notes: string;
    },
    imageFile: File | null,
  ) => Promise<void>;
  busy: boolean;
  onCancel?: () => void;
}

const categories = [
  'Fruta',
  'Destilado',
  'Licor',
  'Cafe',
  'Jugo',
  'Sirope',
  'Espumante',
  'Vermuth',
  'Lácteo',
  'Soda',
  'Hielo',
  'Hierba',
  'Té',
  'Otro',
];

export function IngredientForm({
  initialIngredient,
  onSubmit,
  busy,
  onCancel,
}: IngredientFormProps) {
  const [name, setName] = useState(initialIngredient?.name ?? '');
  const [category, setCategory] = useState(initialIngredient?.category ?? 'Fruta');
  const [notes, setNotes] = useState(initialIngredient?.notes ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialIngredient?.image_url ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftReady, setDraftReady] = useState(Boolean(initialIngredient));
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

useEffect(() => {
  if (initialIngredient) {
    setDraftReady(true);
    setShowRestoreDraft(false);
    return;
  }

  if (!hasDraft('ingredient')) {
    setDraftReady(true);
    setShowRestoreDraft(false);
    return;
  }

  setShowRestoreDraft(true);
  setDraftReady(false);
}, [initialIngredient]);

useEffect(() => {
  if (initialIngredient || !draftReady) {
    return;
  }

  const hasContent = Boolean(name.trim() || notes.trim());

  if (!hasContent) {
    clearDraft('ingredient');
    return;
  }

  localStorage.setItem(
    draftKeys.ingredient,
    JSON.stringify({
      name,
      category,
      notes,
    }),
  );

  markActiveDraft('ingredient');
}, [name, category, notes, initialIngredient, draftReady]);

function restoreDraft() {
  try {
    const rawDraft = localStorage.getItem(draftKeys.ingredient);

    if (!rawDraft) {
      setShowRestoreDraft(false);
      setDraftReady(true);
      return;
    }

    const draft = JSON.parse(rawDraft) as {
      name?: string;
      category?: string;
      notes?: string;
    };

    setName(draft.name ?? '');
    setCategory(draft.category ?? 'Fruta');
    setNotes(draft.notes ?? '');
  } catch {
    clearDraft('ingredient');
  } finally {
    setShowRestoreDraft(false);
    setDraftReady(true);
  }
}

function discardDraft() {
  clearDraft('ingredient');
  setShowRestoreDraft(false);
  setDraftReady(true);
}

  function clearForm() {
    setName('');
    setCategory('Fruta');
    setNotes('');
    setImageFile(null);
    setPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setValidationError('Escribe un nombre para el ingrediente.');
      return;
    }

    setValidationError(null);

    await onSubmit(
      {
        name: trimmedName,
        category,
        notes: notes.trim(),
      },
      imageFile,
    );
if (!initialIngredient) {
  clearDraft('ingredient');
}
  }

  return (
    <form className="editor-card" onSubmit={handleSubmit}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2>{initialIngredient ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h2>
        </div>

        {onCancel ? (
          <button className="ghost-button" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
      </div>

      <label>
        Nombre
        <input
          onChange={(event) => {
            setName(event.target.value);
            if (validationError) setValidationError(null);
          }}
          required
          value={name}
        />
      </label>

      <label>
        Categoría
        <select
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notas
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          value={notes}
        />
      </label>

      <label>
        Imagen
        <input
          ref={fileInputRef}
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setImageFile(file);

            if (file) {
              setPreview(URL.createObjectURL(file));
            } else {
              setPreview(initialIngredient?.image_url ?? '');
            }
          }}
          type="file"
        />
      </label>

      {preview ? (
        <img
          alt="Vista previa del ingrediente"
          className="upload-preview"
          src={preview}
        />
      ) : null}

      {validationError ? (
        <p className="form-feedback error" role="alert">{validationError}</p>
      ) : null}

      <button className="primary-button" disabled={busy} type="submit">
  {busy ? 'Guardando...' : initialIngredient ? 'Guardar ingrediente' : 'Crear ingrediente'}
</button>

{showRestoreDraft ? (
  <div className="draft-modal-backdrop" role="presentation">
    <section className="draft-modal" role="dialog" aria-modal="true" aria-labelledby="ingredient-draft-title" aria-describedby="ingredient-draft-description">
      <p className="eyebrow">Borrador encontrado</p>
      <h2 id="ingredient-draft-title">¿Quieres retomar tu ingrediente?</h2>
      <p className="muted" id="ingredient-draft-description">
        Hay un ingrediente que dejaste a medias. Puedes retomarlo o borrarlo para empezar de cero.
      </p>

      <div className="draft-modal-actions">
        <button className="primary-button" onClick={restoreDraft} type="button">
          Retomar borrador
        </button>

        <button className="ghost-button danger" onClick={discardDraft} type="button">
          Borrar borrador
        </button>
      </div>
    </section>
  </div>
) : null}
</form>
  );
}