import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { EmptyState } from '../components/EmptyState';
import { buildGuestMenuPublicLink, buildOrganizerPublicLink } from '../lib/publicLinks';
import {
  createEvent,
  createEventOrganizerInvite,
  deleteEvent,
  fetchEventAvailableRecipeRows,
  fetchEventGuestMenus,
  fetchEventOrganizerInvites,
  fetchEventSelectedRecipeRows,
  fetchEvents,
  updateEvent,
} from '../services/events';
import {
  BebidarioEvent,
  EventGuestMenu,
  EventOrganizerInvite,
  EventPayload,
  EventRecipeLinkRow,
  EventStatus,
  EventType,
  Recipe,
} from '../types';

interface EventsPageProps {
  recipes: Recipe[];
  userId: string;
}

const statusLabels: Record<EventStatus, string> = {
  draft: 'Borrador',
  awaiting_selection: 'Esperando selección',
  selection_received: 'Selección recibida',
  menu_ready: 'Carta lista',
  archived: 'Archivado',
};

function getTodayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatEventDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getShortDateParts(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return {
    day: new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
    }).format(date),
    month: new Intl.DateTimeFormat('es-CL', {
      month: 'short',
    })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
  };
}

function sortEvents(events: BebidarioEvent[]) {
  return [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
}

function toSafeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'evento';
}

function downloadMenuQr(eventName: string, eventId: string) {
  const wrapper = document.getElementById(`guest-menu-qr-${eventId}`);
  const svg = wrapper?.querySelector('svg');

  if (!svg) {
    throw new Error('No se encontró el código QR para descargar.');
  }

  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob(
    [`<?xml version="1.0" encoding="UTF-8"?>\n${source}`],
    { type: 'image/svg+xml;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `qr-${toSafeFileName(eventName)}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function EventsPage({ recipes, userId }: EventsPageProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<BebidarioEvent[]>([]);
  const [availableRows, setAvailableRows] = useState<EventRecipeLinkRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<EventRecipeLinkRow[]>([]);
  const [invites, setInvites] = useState<EventOrganizerInvite[]>([]);
  const [guestMenus, setGuestMenus] = useState<EventGuestMenu[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generatingEventId, setGeneratingEventId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<EventType>('birthday');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedGuestMenuEventId, setCopiedGuestMenuEventId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<BebidarioEvent | null>(null);

  const formRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const newEventButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteDialogRef = useRef<HTMLElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const guestCopyFeedbackTimeoutRef = useRef<number | null>(null);

  const today = getTodayInputValue();

  const editingEvent = useMemo(
    () => events.find((event) => event.id === editingId),
    [editingId, events],
  );

  const availableCountByEvent = useMemo(() => {
    const counts = new Map<string, number>();

    availableRows.forEach((row) => {
      counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
    });

    return counts;
  }, [availableRows]);

  const inviteByEvent = useMemo(() => {
    const map = new Map<string, EventOrganizerInvite>();
    invites.forEach((invite) => map.set(invite.event_id, invite));
    return map;
  }, [invites]);

  const guestMenuByEvent = useMemo(() => {
    const map = new Map<string, EventGuestMenu>();
    guestMenus.forEach((menu) => map.set(menu.event_id, menu));
    return map;
  }, [guestMenus]);

  const selectedRecipeIdsByEvent = useMemo(() => {
    const map = new Map<string, string[]>();

    selectedRows.forEach((row) => {
      const current = map.get(row.event_id) ?? [];
      current.push(row.recipe_id);
      map.set(row.event_id, current);
    });

    return map;
  }, [selectedRows]);

  const recipeTitleById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.title])),
    [recipes],
  );

  const loadEventsData = useCallback(async (showFullLoader = true) => {
    if (showFullLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [
        nextEvents,
        nextAvailableRows,
        nextInvites,
        nextSelectedRows,
        nextGuestMenus,
      ] = await Promise.all([
        fetchEvents(),
        fetchEventAvailableRecipeRows(),
        fetchEventOrganizerInvites(),
        fetchEventSelectedRecipeRows(),
        fetchEventGuestMenus(),
      ]);

      setEvents(nextEvents);
      setAvailableRows(nextAvailableRows);
      setInvites(nextInvites);
      setSelectedRows(nextSelectedRows);
      setGuestMenus(nextGuestMenus);
    } catch (loadError) {
      console.error('Error cargando eventos:', loadError);
      setError('No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEventsData();

    function refreshOnFocus() {
      void loadEventsData(false);
    }

    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadEventsData]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      cancelDeleteButtonRef.current?.focus();
    });

    function handleDialogKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        closeDeleteModal();
        return;
      }

      if (keyboardEvent.key !== 'Tab') {
        return;
      }

      const focusableElements = deleteDialogRef.current?.querySelectorAll<HTMLElement>(
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
  }, [deleteTarget]);

  function scrollToForm() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      nameInputRef.current?.focus();
    }, 0);
  }

  function openCreateForm() {
    setEditingId(null);
    setName('');
    setEventDate('');
    setEventType('birthday');
    setError(null);
    setNotice(null);
    setShowForm(true);
    scrollToForm();
  }

  function openEditForm(event: BebidarioEvent) {
    setEditingId(event.id);
    setName(event.name);
    setEventDate(event.event_date);
    setEventType(event.event_type ?? 'birthday');
    setError(null);
    setNotice(null);
    setShowForm(true);
    scrollToForm();
  }

  function closeForm() {
    setEditingId(null);
    setName('');
    setEventDate('');
    setEventType('birthday');
    setError(null);
    setShowForm(false);

    window.setTimeout(() => {
      newEventButtonRef.current?.focus();
    }, 0);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);

    window.setTimeout(() => {
      deleteTriggerRef.current?.focus();
    }, 0);
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const trimmedName = name.trim();

    setError(null);
    setNotice(null);

    if (trimmedName.length < 2) {
      setError('El nombre del evento debe tener al menos 2 caracteres.');
      nameInputRef.current?.focus();
      return;
    }

    if (!eventDate) {
      setError('Selecciona la fecha del evento.');
      return;
    }

    if (!editingId && eventDate < today) {
      setError('La fecha de un evento nuevo no puede estar en el pasado.');
      return;
    }

    const payload: EventPayload = {
      name: trimmedName,
      event_date: eventDate,
      event_type: eventType,
    };

    setBusy(true);

    try {
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, payload);
        setEvents((current) => sortEvents(
          current.map((event) => event.id === updated.id ? updated : event),
        ));
        setNotice('Evento actualizado correctamente.');
      } else {
        const created = await createEvent(userId, payload);
        setEvents((current) => sortEvents([...current, created]));
        setNotice('Evento creado correctamente.');
      }

      setEditingId(null);
      setName('');
      setEventDate('');
      setEventType('birthday');
      setShowForm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (saveError) {
      console.error('Error guardando evento:', saveError);
      setError(
        editingEvent
          ? 'No se pudo actualizar el evento.'
          : 'No se pudo crear el evento.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateOrganizerLink(event: BebidarioEvent) {
    setGeneratingEventId(event.id);
    setError(null);
    setNotice(null);

    try {
      const token = await createEventOrganizerInvite(event.id);
      const newInvite: EventOrganizerInvite = {
        event_id: event.id,
        public_token: token,
        created_at: new Date().toISOString(),
        submitted_at: null,
      };

      setInvites((current) => [
        ...current.filter((invite) => invite.event_id !== event.id),
        newInvite,
      ]);

      setEvents((current) => current.map((item) =>
        item.id === event.id && item.status === 'draft'
          ? { ...item, status: 'awaiting_selection' }
          : item,
      ));

      setNotice(`Enlace del organizador creado para "${event.name}".`);
    } catch (generateError) {
      console.error('Error generando enlace del organizador:', generateError);
      setError('No se pudo generar el enlace. Comprueba que el evento tenga bebidas disponibles guardadas.');
    } finally {
      setGeneratingEventId(null);
    }
  }

  async function handleCopyOrganizerLink(event: BebidarioEvent, token: string) {
    setError(null);

    try {
      await copyText(buildOrganizerPublicLink(token));
      setNotice(`Enlace de "${event.name}" copiado. Ya puedes enviárselo al organizador.`);
    } catch (copyError) {
      console.error('Error copiando enlace:', copyError);
      setError('No se pudo copiar el enlace automáticamente. Puedes seleccionarlo y copiarlo manualmente.');
    }
  }

  useEffect(() => {
    return () => {
      if (guestCopyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(guestCopyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyGuestMenuLink(event: BebidarioEvent, token: string) {
    setError(null);

    try {
      await copyText(buildGuestMenuPublicLink(token));

      setCopiedGuestMenuEventId(event.id);
      setNotice(`Enlace de la carta de "${event.name}" copiado.`);

      if (guestCopyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(guestCopyFeedbackTimeoutRef.current);
      }

      guestCopyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopiedGuestMenuEventId(null);
        guestCopyFeedbackTimeoutRef.current = null;
      }, 2500);
    } catch (copyError) {
      console.error('Error copiando enlace de la carta:', copyError);
      setError('No se pudo copiar el enlace automáticamente. Puedes seleccionarlo y copiarlo manualmente.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await deleteEvent(deleteTarget.id);
      setEvents((current) => current.filter((event) => event.id !== deleteTarget.id));
      setAvailableRows((current) => current.filter((row) => row.event_id !== deleteTarget.id));
      setSelectedRows((current) => current.filter((row) => row.event_id !== deleteTarget.id));
      setInvites((current) => current.filter((invite) => invite.event_id !== deleteTarget.id));
      setGuestMenus((current) => current.filter((menu) => menu.event_id !== deleteTarget.id));
      setNotice(`Se eliminó el evento "${deleteTarget.name}".`);
      setDeleteTarget(null);

      window.setTimeout(() => {
        newEventButtonRef.current?.focus();
      }, 0);
    } catch (deleteError) {
      console.error('Error eliminando evento:', deleteError);
      setError('No se pudo eliminar el evento.');
      closeDeleteModal();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="editor-card event-loading-card" aria-live="polite" role="status">
        <div className="loader" aria-hidden="true" />
        <div>
          <h2>Cargando eventos</h2>
          <p className="muted">Estamos preparando tu calendario.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <header className="page-header-row event-page-header">
        <div>
          <p className="eyebrow">Organización</p>
          <h2>Eventos</h2>
          <p className="muted">
            Crea el evento, define las opciones, recibe la elección del organizador y comparte la carta final con los invitados.
          </p>
        </div>

        <div className="event-header-actions">
          <button
            className="ghost-button"
            disabled={refreshing}
            onClick={() => {
              void loadEventsData(false);
            }}
            type="button"
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>

          {!showForm ? (
            <button
              ref={newEventButtonRef}
              className="primary-button"
              onClick={openCreateForm}
              type="button"
            >
              + Nuevo evento
            </button>
          ) : null}
        </div>
      </header>

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

      {showForm ? (
        <div ref={formRef} className="form-scroll-anchor">
          <form className="editor-card event-form" onSubmit={handleSubmit} aria-labelledby="event-form-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{editingEvent ? 'Edición' : 'Nuevo evento'}</p>
                <h2 id="event-form-title">{editingEvent ? 'Editar evento' : 'Crear evento'}</h2>
              </div>
            </div>

            <label htmlFor="event-name">
              Nombre del evento
              <input
                ref={nameInputRef}
                id="event-name"
                maxLength={120}
                onChange={(inputEvent) => setName(inputEvent.target.value)}
                placeholder="Ej: Cumpleaños Sofía"
                required
                type="text"
                value={name}
              />
            </label>

            <label htmlFor="event-type">
              Tipo de evento
              <select
                id="event-type"
                onChange={(inputEvent) => setEventType(inputEvent.target.value as EventType)}
                value={eventType}
              >
                <option value="birthday">Cumpleaños</option>
                <option value="general">Otro evento</option>
              </select>
              <span className="field-help">
                La carta de invitados adaptará su estilo al tipo de celebración. Por ahora, Cumpleaños tiene una temática especial.
              </span>
            </label>

            <label htmlFor="event-date">
              Fecha
              <input
                id="event-date"
                min={editingEvent ? undefined : today}
                onChange={(inputEvent) => setEventDate(inputEvent.target.value)}
                required
                type="date"
                value={eventDate}
              />
            </label>

            <div className="event-form-actions">
              <button className="primary-button" disabled={busy} type="submit">
                {busy ? 'Guardando...' : editingEvent ? 'Guardar cambios' : 'Crear evento'}
              </button>

              <button className="ghost-button" disabled={busy} onClick={closeForm} type="button">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {!events.length ? (
        <EmptyState
          action={!showForm ? (
            <button className="primary-button" onClick={openCreateForm} type="button">
              Crear primer evento
            </button>
          ) : undefined}
          description="Crea tu primer evento, define las bebidas disponibles y comparte la selección con el organizador."
          title="Todavía no tienes eventos"
        />
      ) : (
        <section className="events-grid" aria-label="Lista de eventos">
          {events.map((event) => {
            const dateParts = getShortDateParts(event.event_date);
            const availableCount = availableCountByEvent.get(event.id) ?? 0;
            const invite = inviteByEvent.get(event.id);
            const selectedRecipeIds = selectedRecipeIdsByEvent.get(event.id) ?? [];
            const selectedRecipeNames = selectedRecipeIds
              .map((recipeId) => recipeTitleById.get(recipeId))
              .filter((title): title is string => Boolean(title));
            const organizerLink = invite ? buildOrganizerPublicLink(invite.public_token) : null;
            const guestMenu = guestMenuByEvent.get(event.id);
            const guestMenuLink = guestMenu ? buildGuestMenuPublicLink(guestMenu.public_token) : null;

            let nextStep = 'Selecciona las bebidas que estarán disponibles para este evento.';

            if (event.status === 'draft' && availableCount > 0) {
              nextStep = 'Las bebidas están configuradas. Genera el enlace privado para el organizador.';
            }

            if (event.status === 'awaiting_selection') {
              nextStep = 'El enlace está activo. Esperando la respuesta del organizador.';
            }

            if (event.status === 'selection_received') {
              nextStep = 'La selección llegó correctamente. Estamos preparando la carta de invitados.';
            }

            if (event.status === 'menu_ready') {
              nextStep = 'La carta de invitados está lista. Comparte el enlace o descarga el QR para el evento.';
            }

            return (
              <article className="editor-card event-card" key={event.id}>
                <div className="event-card-main">
                  <div className="event-date-block" aria-label={formatEventDate(event.event_date)}>
                    <span className="event-date-day">{dateParts.day}</span>
                    <span className="event-date-month">{dateParts.month}</span>
                  </div>

                  <div className="event-card-info">
                    <div className="event-card-title-row">
                      <h3>{event.name}</h3>
                      <span className={`event-status event-status-${event.status}`}>
                        {statusLabels[event.status]}
                      </span>
                    </div>

                    <div className="event-meta-row">
                      <p className="muted">{formatEventDate(event.event_date)}</p>
                      <span className="event-type-badge">
                        {event.event_type === 'birthday' ? '🎉 Cumpleaños' : '✨ Evento'}
                      </span>
                    </div>
                    <p className="event-available-count">
                      {availableCount} {availableCount === 1 ? 'bebida disponible' : 'bebidas disponibles'}
                    </p>
                    <p className="event-next-step">{nextStep}</p>
                  </div>
                </div>

                <ol className="event-progress" aria-label={`Progreso de ${event.name}`}>
                  <li className={availableCount > 0 ? 'done' : 'current'}>
                    <span aria-hidden="true">1</span>
                    <div><strong>Opciones</strong><small>{availableCount > 0 ? 'Listas' : 'Pendiente'}</small></div>
                  </li>
                  <li className={invite?.submitted_at ? 'done' : invite ? 'current' : ''}>
                    <span aria-hidden="true">2</span>
                    <div><strong>Organizador</strong><small>{invite?.submitted_at ? 'Respondió' : invite ? 'Esperando' : 'Pendiente'}</small></div>
                  </li>
                  <li className={event.status === 'menu_ready' ? 'done' : ''}>
                    <span aria-hidden="true">3</span>
                    <div><strong>Carta QR</strong><small>{event.status === 'menu_ready' ? 'Lista' : 'Pendiente'}</small></div>
                  </li>
                </ol>

                {organizerLink ? (
                  <section className="event-share-panel" aria-label={`Enlace del organizador para ${event.name}`}>
                    <div>
                      <p className="eyebrow">
                        {invite?.submitted_at ? 'Selección completada' : 'Enlace del organizador'}
                      </p>
                      <p className="muted">
                        {invite?.submitted_at
                          ? 'El organizador ya envió su respuesta.'
                          : 'Este es el enlace real para compartir. Solo la persona organizadora debe usarlo.'}
                      </p>
                    </div>

                    <div className="event-share-row">
                      <input
                        aria-label={`Enlace privado para ${event.name}`}
                        onFocus={(focusEvent) => focusEvent.currentTarget.select()}
                        readOnly
                        value={organizerLink}
                      />

                      <button
                        className="ghost-button"
                        onClick={() => {
                          void handleCopyOrganizerLink(event, invite.public_token);
                        }}
                        type="button"
                      >
                        Copiar para compartir
                      </button>

                      <button
                        className="ghost-button"
                        onClick={() => window.open(organizerLink, '_blank', 'noopener,noreferrer')}
                        type="button"
                      >
                        Abrir carta del organizador
                      </button>
                    </div>
                  </section>
                ) : null}

                {(event.status === 'selection_received' || event.status === 'menu_ready') && selectedRecipeNames.length ? (
                  <section className="event-response-panel" aria-label="Selección del organizador">
                    <p className="eyebrow">Respuesta del organizador</p>
                    <h4>{selectedRecipeNames.length} {selectedRecipeNames.length === 1 ? 'bebida elegida' : 'bebidas elegidas'}</h4>
                    <div className="event-response-chips">
                      {selectedRecipeNames.map((recipeName) => (
                        <span key={recipeName}>{recipeName}</span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {event.status === 'menu_ready' && guestMenuLink && guestMenu ? (
                  <section
                    className="event-guest-menu-panel"
                    aria-label={`Carta de invitados para ${event.name}`}
                  >
                    <div className="event-guest-menu-heading">
                      <div>
                        <p className="eyebrow">Carta de invitados</p>
                        <h4>Lista para compartir</h4>
                        <p className="muted">
                          Este QR y el enlace llevan a la carta real para invitados con las bebidas elegidas por el organizador.
                        </p>
                      </div>
                    </div>

                    <div className="event-guest-menu-layout">
                      <div
                        id={`guest-menu-qr-${event.id}`}
                        className="event-qr-shell"
                        aria-label={`Código QR de la carta para ${event.name}`}
                      >
                        <QRCodeSVG
                          level="M"
                          marginSize={2}
                          size={184}
                          title={`Carta de ${event.name}`}
                          value={guestMenuLink}
                        />
                      </div>

                      <div className="event-guest-share-content">
                        <label htmlFor={`guest-menu-link-${event.id}`}>
                          Enlace de la carta
                          <input
                            id={`guest-menu-link-${event.id}`}
                            onFocus={(focusEvent) => focusEvent.currentTarget.select()}
                            readOnly
                            value={guestMenuLink}
                          />
                        </label>

                        <div className="event-guest-share-actions">
                          <button
                            className="primary-button"
                            onClick={() => {
                              void handleCopyGuestMenuLink(event, guestMenu.public_token);
                            }}
                            type="button"
                          >
                            {copiedGuestMenuEventId === event.id
                              ? '✓ Enlace copiado'
                              : 'Copiar enlace para invitados'}
                          </button>

                          <button
                            className="ghost-button"
                            onClick={() => window.open(guestMenuLink, '_blank', 'noopener,noreferrer')}
                            type="button"
                          >
                            Abrir carta de invitados
                          </button>

                          <button
                            className="ghost-button"
                            onClick={() => {
                              try {
                                downloadMenuQr(event.name, event.id);
                                setNotice(`QR de "${event.name}" descargado.`);
                              } catch (downloadError) {
                                console.error('Error descargando QR:', downloadError);
                                setError('No se pudo descargar el QR. Intenta nuevamente.');
                              }
                            }}
                            type="button"
                          >
                            Descargar QR
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="event-card-actions">
                  <button
                    className="primary-button"
                    onClick={() => navigate(`/eventos/${event.id}/bebidas`)}
                    type="button"
                  >
                    {event.status === 'draft' ? 'Elegir bebidas disponibles' : 'Ver bebidas disponibles'}
                  </button>

                  {!invite && availableCount > 0 ? (
                    <button
                      className="ghost-button"
                      disabled={generatingEventId === event.id}
                      onClick={() => {
                        void handleGenerateOrganizerLink(event);
                      }}
                      type="button"
                    >
                      {generatingEventId === event.id
                        ? 'Generando...'
                        : 'Crear enlace para el organizador'}
                    </button>
                  ) : null}

                  <button className="ghost-button" onClick={() => openEditForm(event)} type="button">
                    Editar
                  </button>

                  <button
                    className="ghost-button danger"
                    onClick={(clickEvent) => {
                      deleteTriggerRef.current = clickEvent.currentTarget;
                      setDeleteTarget(event);
                    }}
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
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <section
            ref={deleteDialogRef}
            className="event-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
            aria-describedby="delete-event-description"
          >
            <p className="eyebrow">Confirmar eliminación</p>
            <h2 id="delete-event-title">¿Eliminar este evento?</h2>
            <p id="delete-event-description" className="muted">
              El evento "{deleteTarget.name}" será eliminado. Esta acción no se puede deshacer.
            </p>

            <div className="event-modal-actions">
              <button
                ref={cancelDeleteButtonRef}
                className="ghost-button"
                disabled={busy}
                onClick={closeDeleteModal}
                type="button"
              >
                Cancelar
              </button>

              <button
                className="ghost-button danger"
                disabled={busy}
                onClick={() => {
                  void confirmDelete();
                }}
                type="button"
              >
                {busy ? 'Eliminando...' : 'Eliminar evento'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
