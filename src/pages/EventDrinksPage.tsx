import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchEventAvailableRecipeIds,
  fetchEventById,
  saveEventAvailableRecipes,
} from '../services/events';
import { BebidarioEvent, Recipe } from '../types';

interface EventDrinksPageProps {
  recipes: Recipe[];
}

function formatEventDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function EventDrinksPage({ recipes }: EventDrinksPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<BebidarioEvent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const configurationLocked = event?.status !== 'draft';

  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(recipes.map((recipe) => recipe.category))).sort()],
    [recipes],
  );

  const filteredRecipes = useMemo(() => {
    const term = normalizeText(search.trim());

    return recipes.filter((recipe) => {
      const matchesCategory = category === 'Todas' || recipe.category === category;

      if (!matchesCategory) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableText = normalizeText(
        [
          recipe.title,
          recipe.description ?? '',
          recipe.category,
          ...recipe.ingredients.map((ingredient) => ingredient.name),
        ].join(' '),
      );

      return searchableText.includes(term);
    });
  }, [category, recipes, search]);

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== initialIds.size) {
      return true;
    }

    return [...selectedIds].some((recipeId) => !initialIds.has(recipeId));
  }, [initialIds, selectedIds]);

  useEffect(() => {
    if (!id) {
      setError('El evento solicitado no es válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEventConfiguration() {
      setLoading(true);
      setError(null);

      try {
        const [nextEvent, recipeIds] = await Promise.all([
          fetchEventById(id),
          fetchEventAvailableRecipeIds(id),
        ]);

        if (cancelled) {
          return;
        }

        const nextIds = new Set(recipeIds);
        setEvent(nextEvent);
        setSelectedIds(nextIds);
        setInitialIds(new Set(recipeIds));
      } catch (loadError) {
        console.error('Error cargando configuración del evento:', loadError);

        if (!cancelled) {
          setError('No se pudo cargar el evento o no tienes acceso a él.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEventConfiguration();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!hasChanges || configurationLocked) {
      return;
    }

    function handleBeforeUnload(beforeUnloadEvent: BeforeUnloadEvent) {
      beforeUnloadEvent.preventDefault();
      beforeUnloadEvent.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [configurationLocked, hasChanges]);

  function toggleRecipe(recipeId: string) {
    if (configurationLocked) {
      return;
    }

    setNotice(null);
    setError(null);

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }

      return next;
    });
  }

  function selectVisibleRecipes() {
    if (configurationLocked) {
      return;
    }

    setNotice(null);

    setSelectedIds((current) => {
      const next = new Set(current);
      filteredRecipes.forEach((recipe) => next.add(recipe.id));
      return next;
    });
  }

  function clearVisibleRecipes() {
    if (configurationLocked) {
      return;
    }

    setNotice(null);

    setSelectedIds((current) => {
      const next = new Set(current);
      filteredRecipes.forEach((recipe) => next.delete(recipe.id));
      return next;
    });
  }

  async function handleSave() {
    if (!id || configurationLocked) {
      return;
    }

    if (selectedIds.size === 0) {
      setError('Selecciona al menos una bebida disponible para este evento.');
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const recipeIds = [...selectedIds];
      await saveEventAvailableRecipes(id, recipeIds);
      setInitialIds(new Set(recipeIds));
      setNotice('Bebidas disponibles guardadas correctamente. Ya puedes volver a Eventos y generar el enlace del organizador.');

      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      });
    } catch (saveError) {
      console.error('Error guardando bebidas del evento:', saveError);
      setError('No se pudieron guardar las bebidas disponibles.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="editor-card event-loading-card" aria-live="polite" role="status">
        <div className="loader" aria-hidden="true" />
        <div>
          <h2>Cargando bebidas</h2>
          <p className="muted">Preparando la configuración del evento.</p>
        </div>
      </section>
    );
  }

  if (error && !event) {
    return (
      <section className="page-stack">
        <button className="ghost-button event-back-button" onClick={() => navigate('/eventos')} type="button">
          ← Volver a eventos
        </button>

        <section className="editor-card event-config-error" role="alert">
          <p className="eyebrow">No disponible</p>
          <h2>No pudimos abrir este evento</h2>
          <p className="muted">{error}</p>
        </section>
      </section>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <section className="page-stack">
      <div>
        <button className="ghost-button event-back-button" onClick={() => navigate('/eventos')} type="button">
          ← Volver a eventos
        </button>
      </div>

      {notice ? (
        <div className="event-message event-message-success" aria-live="polite" role="status">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="event-message event-message-error" role="alert">
          {error}
        </div>
      ) : null}

      <header className="event-config-hero editor-card">
        <div>
          <p className="eyebrow">Bebidas disponibles</p>
          <h2>{event.name}</h2>
          <p className="muted">{formatEventDate(event.event_date)}</p>
        </div>

        <div className="event-selection-counter" aria-live="polite">
          <strong>{selectedIds.size}</strong>
          <span>{selectedIds.size === 1 ? 'bebida seleccionada' : 'bebidas seleccionadas'}</span>
        </div>
      </header>

      {configurationLocked ? (
        <div className="event-lock-message" role="status">
          <strong>Selección bloqueada</strong>
          <span>
            El enlace del organizador ya fue generado. Las bebidas disponibles se mantienen fijas para que su carta no cambie mientras elige.
          </span>
        </div>
      ) : null}

      <section className="editor-card event-config-toolbar" aria-label="Filtros de bebidas">
        <label htmlFor="event-drink-search">
          Buscar
          <input
            id="event-drink-search"
            onChange={(searchEvent) => setSearch(searchEvent.target.value)}
            placeholder="Nombre, categoría o ingrediente..."
            type="search"
            value={search}
          />
        </label>

        <label htmlFor="event-drink-category">
          Categoría
          <select
            id="event-drink-category"
            onChange={(categoryEvent) => setCategory(categoryEvent.target.value)}
            value={category}
          >
            {categories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </label>

        <div className="event-bulk-actions" aria-label="Selección rápida">
          <button
            className="ghost-button"
            disabled={configurationLocked}
            onClick={selectVisibleRecipes}
            type="button"
          >
            Seleccionar visibles
          </button>
          <button
            className="ghost-button"
            disabled={configurationLocked}
            onClick={clearVisibleRecipes}
            type="button"
          >
            Quitar visibles
          </button>
        </div>
      </section>

      {filteredRecipes.length ? (
        <section className="event-drinks-grid" aria-label="Bebidas disponibles para seleccionar">
          {filteredRecipes.map((recipe) => {
            const selected = selectedIds.has(recipe.id);
            const ingredientNames = recipe.ingredients
              .map((ingredient) => ingredient.name)
              .filter(Boolean)
              .slice(0, 5)
              .join(', ');

            return (
              <label
                className={`event-drink-option ${selected ? 'selected' : ''} ${configurationLocked ? 'locked' : ''}`}
                key={recipe.id}
              >
                <input
                  checked={selected}
                  className="event-drink-checkbox"
                  disabled={configurationLocked}
                  onChange={() => toggleRecipe(recipe.id)}
                  type="checkbox"
                />

                <div className="event-drink-media">
                  {recipe.image_url ? (
                    <img alt="" src={recipe.image_url} />
                  ) : (
                    <div className="event-drink-placeholder" aria-hidden="true">🍹</div>
                  )}

                  <span className="event-drink-checkmark" aria-hidden="true">
                    {selected ? '✓' : '+'}
                  </span>
                </div>

                <div className="event-drink-content">
                  <div className="event-drink-title-row">
                    <div>
                      <p className="eyebrow">{recipe.category}</p>
                      <h3>{recipe.title}</h3>
                    </div>
                  </div>

                  <p className="muted event-drink-description">
                    {recipe.description || 'Sin descripción todavía.'}
                  </p>

                  {ingredientNames ? (
                    <p className="event-drink-ingredients">
                      <span>Ingredientes:</span> {ingredientNames}
                    </p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </section>
      ) : (
        <section className="editor-card event-config-error" role="status">
          <p className="eyebrow">Sin resultados</p>
          <h2>No encontramos bebidas</h2>
          <p className="muted">Prueba con otro nombre o cambia la categoría seleccionada.</p>
        </section>
      )}

      <section className="event-save-bar" aria-label="Guardar configuración del evento">
        <div>
          <strong>{selectedIds.size} seleccionadas</strong>
          <span className="muted">
            {configurationLocked
              ? 'La selección está bloqueada porque el enlace del organizador ya fue generado.'
              : hasChanges
                ? 'Tienes cambios sin guardar.'
                : 'La selección está guardada.'}
          </span>
        </div>

        <button
          className="primary-button"
          disabled={saving || !hasChanges || configurationLocked}
          onClick={() => {
            void handleSave();
          }}
          type="button"
        >
          {saving ? 'Guardando...' : 'Guardar bebidas disponibles'}
        </button>
      </section>
    </section>
  );
}
