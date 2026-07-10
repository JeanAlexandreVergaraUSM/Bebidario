import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchPublicOrganizerEvent,
  submitOrganizerSelection,
} from '../services/events';
import { PublicOrganizerEvent } from '../types';

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

export function OrganizerSelectionPage() {
  const { token } = useParams();
  const [eventData, setEventData] = useState<PublicOrganizerEvent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDialogRef = useRef<HTMLElement | null>(null);
  const cancelConfirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const submitTriggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedRecipes = useMemo(
    () => eventData?.recipes.filter((recipe) => selectedIds.has(recipe.id)) ?? [],
    [eventData, selectedIds],
  );

  const categories = useMemo(() => {
    if (!eventData) return ['Todas'];

    return [
      'Todas',
      ...Array.from(new Set(eventData.recipes.map((recipe) => recipe.category))).sort(),
    ];
  }, [eventData]);

  const visibleRecipes = useMemo(() => {
    if (!eventData) return [];

    const term = normalizeText(query.trim());

    return eventData.recipes.filter((recipe) => {
      if (category !== 'Todas' && recipe.category !== category) {
        return false;
      }

      if (!term) return true;

      return normalizeText([
        recipe.title,
        recipe.description ?? '',
        recipe.category,
        ...recipe.ingredients,
      ].join(' ')).includes(term);
    });
  }, [category, eventData, query]);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrganizerEvent() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchPublicOrganizerEvent(token);

        if (cancelled) return;

        if (!result) {
          setNotFound(true);
          return;
        }

        setEventData(result);
      } catch (loadError) {
        console.error('Error cargando carta del organizador:', loadError);

        if (!cancelled) {
          setError('No pudimos cargar esta carta. Intenta nuevamente en unos minutos.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrganizerEvent();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!confirmOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      cancelConfirmButtonRef.current?.focus();
    });

    function handleDialogKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape' && !submitting) {
        keyboardEvent.preventDefault();
        closeConfirmDialog();
        return;
      }

      if (keyboardEvent.key !== 'Tab') return;

      const focusableElements = confirmDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) {
        keyboardEvent.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (keyboardEvent.shiftKey && document.activeElement === firstElement) {
        keyboardEvent.preventDefault();
        lastElement.focus();
        return;
      }

      if (!keyboardEvent.shiftKey && document.activeElement === lastElement) {
        keyboardEvent.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleDialogKeyDown);
    };
  }, [confirmOpen, submitting]);

  useEffect(() => {
    if (!selectedIds.size || eventData?.submitted) return;

    function handleBeforeUnload(beforeUnloadEvent: BeforeUnloadEvent) {
      beforeUnloadEvent.preventDefault();
      beforeUnloadEvent.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [eventData?.submitted, selectedIds.size]);

  function toggleRecipe(recipeId: string) {
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

  function removeRecipe(recipeId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(recipeId);
      return next;
    });
  }

  function openConfirmDialog() {
    if (!selectedIds.size) {
      setError('Selecciona al menos una bebida antes de enviar tu elección.');
      return;
    }

    setError(null);
    setConfirmOpen(true);
  }

  function closeConfirmDialog() {
    if (submitting) return;

    setConfirmOpen(false);

    window.setTimeout(() => {
      submitTriggerRef.current?.focus();
    }, 0);
  }

  async function handleSubmitSelection() {
    if (!token || !selectedIds.size) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitOrganizerSelection(token, [...selectedIds]);
      setConfirmOpen(false);
      setEventData((current) => current ? { ...current, submitted: true } : current);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      console.error('Error enviando selección:', submitError);
      setError('No pudimos enviar la selección. Revisa tu conexión e intenta nuevamente.');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="organizer-public-page">
        <section className="organizer-state-card" aria-live="polite" role="status">
          <div className="loader" aria-hidden="true" />
          <div>
            <p className="eyebrow">Bebidario</p>
            <h1>Preparando la carta</h1>
            <p className="muted">Estamos cargando las bebidas disponibles para el evento.</p>
          </div>
        </section>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="organizer-public-page">
        <section className="organizer-state-card" role="alert">
          <p className="eyebrow">Bebidario</p>
          <h1>Este enlace no está disponible</h1>
          <p className="muted">
            Revisa que hayas abierto el enlace completo que te compartieron para el evento.
          </p>
        </section>
      </main>
    );
  }

  if (error && !eventData) {
    return (
      <main className="organizer-public-page">
        <section className="organizer-state-card" role="alert">
          <p className="eyebrow">Bebidario</p>
          <h1>No pudimos abrir la carta</h1>
          <p className="muted">{error}</p>
        </section>
      </main>
    );
  }

  if (!eventData) return null;

  if (eventData.submitted) {
    return (
      <main className={`organizer-public-page organizer-theme-${eventData.event_type}`}>
        <section className="organizer-success-card" role="status" aria-live="polite">
          <div className="organizer-success-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">Selección recibida</p>
          <h1>Muchas gracias</h1>
          <p className="organizer-success-event">{eventData.name}</p>
          <p className="muted">
            Tu selección se envió correctamente. La carta para los invitados se preparará con estas bebidas.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={`organizer-public-page organizer-theme-${eventData.event_type}`}>
      <a className="skip-link" href="#organizer-drinks">Ir a las bebidas</a>

      <header className="organizer-public-header">
        <div className="organizer-brand-mark" aria-hidden="true">🍹</div>
        <div>
          <p className="eyebrow">Bebidario</p>
          <span>Elige las bebidas para tu evento</span>
        </div>
      </header>

      <section className="organizer-hero" aria-labelledby="organizer-event-title">
        <p className="eyebrow">Tu carta para elegir</p>
        <h1 id="organizer-event-title">{eventData.name}</h1>
        <p className="organizer-event-date">{formatEventDate(eventData.event_date)}</p>
        <p className="organizer-hero-copy">
          Mira las opciones con calma y marca las bebidas que quieres ofrecer. Al final podrás revisar tu selección completa antes de enviarla.
        </p>

        <a className="organizer-jump-link" href="#organizer-selection-summary">
          Ver mi selección · {selectedIds.size}
        </a>
      </section>

      {error ? (
        <div className="organizer-message-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="organizer-filter-panel" aria-label="Buscar y filtrar bebidas">
        <label htmlFor="organizer-search">
          Buscar bebida o ingrediente
          <input
            id="organizer-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: piña, cítrica, coco..."
            type="search"
            value={query}
          />
        </label>

        <label htmlFor="organizer-category">
          Categoría
          <select
            id="organizer-category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            {categories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </label>

        <div className="organizer-filter-count" aria-live="polite">
          <strong>{visibleRecipes.length}</strong>
          <span>{visibleRecipes.length === 1 ? 'opción visible' : 'opciones visibles'}</span>
        </div>
      </section>

      <section
        id="organizer-drinks"
        className="organizer-drinks-grid"
        aria-label="Bebidas disponibles"
      >
        {visibleRecipes.map((recipe) => {
          const selected = selectedIds.has(recipe.id);
          const ingredientText = recipe.ingredients.filter(Boolean).join(', ');

          return (
            <label
              className={`organizer-drink-card ${selected ? 'selected' : ''}`}
              key={recipe.id}
            >
              <input
                checked={selected}
                className="event-drink-checkbox"
                onChange={() => toggleRecipe(recipe.id)}
                type="checkbox"
              />

              <div className="organizer-drink-media">
                {recipe.image_url ? (
                  <img alt={`Presentación de ${recipe.title}`} loading="lazy" src={recipe.image_url} />
                ) : (
                  <div className="organizer-drink-placeholder" aria-hidden="true">🍹</div>
                )}

                <span className="organizer-card-check" aria-hidden="true">
                  {selected ? '✓' : '+'}
                </span>
              </div>

              <div className="organizer-drink-copy">
                <p className="eyebrow">{recipe.category}</p>
                <h2>{recipe.title}</h2>

                <p className="organizer-description">
                  {recipe.description || 'Una preparación pensada para disfrutar durante el evento.'}
                </p>

                {ingredientText ? (
                  <p className="organizer-ingredients">
                    <strong>Ingredientes:</strong> {ingredientText}.
                  </p>
                ) : null}

                <span className="organizer-select-label">
                  {selected ? 'Elegida · toca para quitar' : 'Elegir esta bebida'}
                </span>
              </div>
            </label>
          );
        })}
      </section>

      {!visibleRecipes.length ? (
        <section className="organizer-no-results" role="status">
          <p className="eyebrow">Sin resultados</p>
          <h2>No encontramos bebidas con ese filtro</h2>
          <p className="muted">Prueba con otro nombre, ingrediente o categoría.</p>
        </section>
      ) : null}

      <section
        id="organizer-selection-summary"
        className="organizer-selection-summary"
        aria-labelledby="organizer-selection-title"
      >
        <div className="organizer-selection-heading">
          <div>
            <p className="eyebrow">Revisión final</p>
            <h2 id="organizer-selection-title">Tu selección</h2>
            <p className="muted">
              Revisa aquí todo lo que elegiste. Puedes quitar una opción antes de enviar.
            </p>
          </div>

          <div className="organizer-selection-count" aria-live="polite">
            <strong>{selectedRecipes.length}</strong>
            <span>{selectedRecipes.length === 1 ? 'bebida' : 'bebidas'}</span>
          </div>
        </div>

        {selectedRecipes.length ? (
          <div className="organizer-selected-grid">
            {selectedRecipes.map((recipe) => (
              <article className="organizer-selected-card" key={recipe.id}>
                <div className="organizer-selected-thumb">
                  {recipe.image_url ? (
                    <img alt="" src={recipe.image_url} />
                  ) : (
                    <span aria-hidden="true">🍹</span>
                  )}
                </div>

                <div className="organizer-selected-copy">
                  <p className="eyebrow">{recipe.category}</p>
                  <h3>{recipe.title}</h3>
                </div>

                <button
                  aria-label={`Quitar ${recipe.title} de la selección`}
                  className="organizer-remove-button"
                  onClick={() => removeRecipe(recipe.id)}
                  type="button"
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="organizer-selection-empty">
            <span aria-hidden="true">＋</span>
            <div>
              <strong>Aún no has elegido bebidas</strong>
              <p>Marca las que te gusten en la carta de arriba. Aparecerán aquí para revisarlas.</p>
            </div>
          </div>
        )}

        <div className="organizer-selection-actions">
          <a className="ghost-button" href="#organizer-drinks">
            Seguir mirando bebidas
          </a>

          <button
            ref={submitTriggerRef}
            className="primary-button organizer-submit-button"
            disabled={!selectedIds.size}
            onClick={openConfirmDialog}
            type="button"
          >
            Revisar y enviar selección
          </button>
        </div>
      </section>

      {confirmOpen ? (
        <div
          className="event-modal-backdrop organizer-modal-backdrop"
          role="presentation"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget && !submitting) {
              closeConfirmDialog();
            }
          }}
        >
          <section
            ref={confirmDialogRef}
            className="organizer-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organizer-confirm-title"
            aria-describedby="organizer-confirm-description"
          >
            <p className="eyebrow">Confirmar elección</p>
            <h2 id="organizer-confirm-title">¿Está lista tu selección?</h2>
            <p id="organizer-confirm-description" className="muted">
              Vas a enviar {selectedRecipes.length} {selectedRecipes.length === 1 ? 'bebida' : 'bebidas'}.
              Después de confirmar, la elección quedará cerrada en este enlace.
            </p>

            <div className="organizer-confirm-grid" aria-label="Bebidas seleccionadas">
              {selectedRecipes.map((recipe) => (
                <article className="organizer-confirm-item" key={recipe.id}>
                  <div className="organizer-confirm-thumb">
                    {recipe.image_url ? (
                      <img alt="" src={recipe.image_url} />
                    ) : (
                      <span aria-hidden="true">🍹</span>
                    )}
                  </div>
                  <div>
                    <span>{recipe.category}</span>
                    <strong>{recipe.title}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="event-modal-actions">
              <button
                ref={cancelConfirmButtonRef}
                className="ghost-button"
                disabled={submitting}
                onClick={closeConfirmDialog}
                type="button"
              >
                Volver y revisar
              </button>

              <button
                className="primary-button"
                disabled={submitting}
                onClick={() => {
                  void handleSubmitSelection();
                }}
                type="button"
              >
                {submitting ? 'Enviando...' : 'Confirmar y enviar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
