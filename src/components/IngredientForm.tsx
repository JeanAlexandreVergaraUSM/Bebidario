import { FormEvent, useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    setName(initialIngredient?.name ?? '');
    setCategory(initialIngredient?.category ?? 'Fruta');
    setNotes(initialIngredient?.notes ?? '');
    setImageFile(null);
    setPreview(initialIngredient?.image_url ?? '');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [initialIngredient]);

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
      window.alert('Ponle nombre al ingrediente.');
      return;
    }

    await onSubmit(
      {
        name: trimmedName,
        category,
        notes: notes.trim(),
      },
      imageFile,
    );

    if (!initialIngredient) {
      clearForm();
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
          onChange={(event) => setName(event.target.value)}
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

      <button className="primary-button" disabled={busy} type="submit">
        {busy ? 'Guardando...' : initialIngredient ? 'Guardar ingrediente' : 'Crear ingrediente'}
      </button>
    </form>
  );
}