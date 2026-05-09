import { FormEvent, useMemo, useState } from 'react';
import { Ingredient, Recipe, RecipeCategory, RecipeIngredient, RecipePayload, RecipeStep } from '../types';
import { uid } from '../lib/helpers';

const categories: RecipeCategory[] = [
  'Frutal',
  'Cremosa',
  'Cítrica',
  'Fizz',
  'Refrescante',
  'Té y café',
  'Especial',
];

interface RecipeFormProps {
  allIngredients: Ingredient[];
  initialRecipe?: Recipe;
  onSubmit: (payload: RecipePayload, imageFile: File | null) => Promise<void>;
  busy: boolean;
}

function normalizeTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function RecipeForm({ allIngredients, initialRecipe, onSubmit, busy }: RecipeFormProps) {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [description, setDescription] = useState(initialRecipe?.description ?? '');
  const [category, setCategory] = useState<RecipeCategory>(initialRecipe?.category ?? 'Frutal');
  const [difficulty, setDifficulty] = useState<RecipePayload['difficulty']>(
    initialRecipe?.difficulty ?? 'facil',
  );
  const [prepMinutes, setPrepMinutes] = useState(initialRecipe?.prep_minutes ?? 5);
  const [servings, setServings] = useState(initialRecipe?.servings ?? 1);
  const [favorite, setFavorite] = useState(initialRecipe?.favorite ?? false);
  const [garnish, setGarnish] = useState(initialRecipe?.garnish ?? '');
  const [notes, setNotes] = useState(initialRecipe?.notes ?? '');
  const [tagsInput, setTagsInput] = useState((initialRecipe?.tags ?? []).join(', '));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initialRecipe?.image_url ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialRecipe?.ingredients.length
      ? initialRecipe.ingredients
      : [{ id: uid('ingredient'), ingredientId: null, name: '', amount: '', optional: false }],
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialRecipe?.steps.length
      ? initialRecipe.steps
      : [{ id: uid('step'), text: '' }],
  );
  const [error, setError] = useState<string | null>(null);

  const ingredientOptions = useMemo(
    () => allIngredients.map((ingredient) => ({ value: ingredient.id, label: ingredient.name })),
    [allIngredients],
  );

  function updateIngredient(index: number, patch: Partial<RecipeIngredient>) {
    setIngredients((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function updateStep(index: number, text: string) {
    setSteps((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const cleanIngredients = ingredients
      .map((ingredient) => ({
        ...ingredient,
        name: ingredient.name.trim(),
        amount: ingredient.amount.trim(),
      }))
      .filter((ingredient) => ingredient.name && ingredient.amount);

    const cleanSteps = steps
      .map((step) => ({ ...step, text: step.text.trim() }))
      .filter((step) => step.text);

    if (!trimmedTitle) {
      setError('Ponle un nombre a la receta.');
      return;
    }

    if (!cleanIngredients.length) {
      setError('Agrega al menos un ingrediente.');
      return;
    }

    if (!cleanSteps.length) {
      setError('Agrega al menos un paso.');
      return;
    }

    await onSubmit(
      {
        title: trimmedTitle,
        description: description.trim(),
        category,
        difficulty,
        prep_minutes: prepMinutes,
        servings,
        image_url: initialRecipe?.image_url ?? null,
        favorite,
        garnish: garnish.trim(),
        notes: notes.trim(),
        tags: normalizeTags(tagsInput),
        ingredients: cleanIngredients,
        steps: cleanSteps,
      },
      imageFile,
    );
  }

  return (
    <form className="editor-grid" onSubmit={handleSubmit}>
      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Información base</p>
            <h2>{initialRecipe ? 'Editar receta' : 'Nueva receta'}</h2>
          </div>
          <label className="favorite-toggle">
            <input
              checked={favorite}
              onChange={(event) => setFavorite(event.target.checked)}
              type="checkbox"
            />
            Marcar como favorita
          </label>
        </div>

        <label>
          Nombre de la receta
          <input onChange={(event) => setTitle(event.target.value)} required value={title} />
        </label>

        <label>
          Descripción breve
          <textarea
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            value={description}
          />
        </label>

        <div className="form-two-columns">
          <label>
            Categoría
            <select onChange={(event) => setCategory(event.target.value as RecipeCategory)} value={category}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dificultad
            <select
              onChange={(event) => setDifficulty(event.target.value as RecipePayload['difficulty'])}
              value={difficulty}
            >
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
        </div>

        <div className="form-two-columns">
          <label>
            Tiempo en minutos
            <input
              min={1}
              onChange={(event) => setPrepMinutes(Number(event.target.value))}
              type="number"
              value={prepMinutes}
            />
          </label>

          <label>
            Porciones
            <input
              min={1}
              onChange={(event) => setServings(Number(event.target.value))}
              type="number"
              value={servings}
            />
          </label>
        </div>

        <label>
          Tags separados por coma
          <input
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="brunch, verano, cítrico"
            value={tagsInput}
          />
        </label>

        <div className="form-two-columns">
          <label>
            Decoración
            <input onChange={(event) => setGarnish(event.target.value)} value={garnish} />
          </label>

          <label>
            Imagen principal
            <input
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) {
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
              type="file"
            />
          </label>
        </div>

        {imagePreview ? (
          <img alt="Vista previa de la receta" className="upload-preview" src={imagePreview} />
        ) : null}

        <label>
          Notas personales
          <textarea onChange={(event) => setNotes(event.target.value)} rows={4} value={notes} />
        </label>
      </section>

     <section className="editor-card">
  <div className="section-heading compact">
    <div>
      <p className="eyebrow">Ingredientes</p>
      <h2>Lista editable</h2>
    </div>
  </div>

  <div className="stack-list">
    {ingredients.map((ingredient, index) => (
      <div className="mini-card" key={ingredient.id}>
        <div className="form-two-columns">
          <label>
            Biblioteca
            <select
              onChange={(event) => {
                const selected = allIngredients.find((item) => item.id === event.target.value);
                updateIngredient(index, {
                  ingredientId: selected?.id ?? null,
                  name: selected?.name ?? ingredient.name,
                });
              }}
              value={ingredient.ingredientId ?? ''}
            >
              <option value="">Escribir manualmente</option>
              {ingredientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cantidad
            <input
              onChange={(event) => updateIngredient(index, { amount: event.target.value })}
              placeholder="120 ml"
              value={ingredient.amount}
            />
          </label>
        </div>

        <div className="form-two-columns">
          <label>
            Nombre visible
            <input
              onChange={(event) => updateIngredient(index, { name: event.target.value })}
              value={ingredient.name}
            />
          </label>

          <label className="favorite-toggle">
            <input
              checked={ingredient.optional}
              onChange={(event) => updateIngredient(index, { optional: event.target.checked })}
              type="checkbox"
            />
            Opcional
          </label>
        </div>

        {ingredients.length > 1 ? (
          <button
            className="danger-link"
            onClick={() =>
              setIngredients((current) => current.filter((item) => item.id !== ingredient.id))
            }
            type="button"
          >
            Eliminar ingrediente
          </button>
        ) : null}
      </div>
    ))}
  </div>

  <div className="button-row wrap">
    <button
      className="ghost-button"
      onClick={() =>
        setIngredients((current) => [
          ...current,
          { id: uid('ingredient'), ingredientId: null, name: '', amount: '', optional: false },
        ])
      }
      type="button"
    >
      + Ingrediente
    </button>
  </div>
</section>

      <section className="editor-card">
  <div className="section-heading compact">
    <div>
      <p className="eyebrow">Preparación</p>
      <h2>Pasos</h2>
    </div>
  </div>

  <div className="stack-list">
    {steps.map((step, index) => (
      <div className="mini-card" key={step.id}>
        <label>
          Paso {index + 1}
          <textarea
            onChange={(event) => updateStep(index, event.target.value)}
            rows={3}
            value={step.text}
          />
        </label>

        {steps.length > 1 ? (
          <button
            className="danger-link"
            onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}
            type="button"
          >
            Eliminar paso
          </button>
        ) : null}
      </div>
    ))}
  </div>

  <div className="button-row wrap">
    <button
      className="ghost-button"
      onClick={() => setSteps((current) => [...current, { id: uid('step'), text: '' }])}
      type="button"
    >
      + Paso
    </button>
  </div>

  {error ? <p className="form-feedback error">{error}</p> : null}

  <button className="primary-button" disabled={busy} type="submit">
    {busy ? 'Guardando...' : initialRecipe ? 'Guardar cambios' : 'Crear receta'}
  </button>
</section>
    </form>
  );
}
