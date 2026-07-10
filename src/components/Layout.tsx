import { MouseEvent, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearActiveDraft,
  clearDraft,
  DraftKind,
  getActiveDraft,
  getDraftLabel,
  hasDraft,
} from '../lib/draftGuard';

interface LayoutProps {
  session: Session;
}

const navItems = [
  { to: '/', label: 'Bebidas', icon: '🍹' },
  { to: '/favoritas', label: 'Favoritas', icon: '❤️' },
  { to: '/ingredientes', label: 'Ingredientes', icon: '🍓' },
  { to: '/eventos', label: 'Eventos', icon: '📅' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

type PendingAction =
  | { type: 'navigation'; target: string }
  | { type: 'logout' };

export function Layout({ session }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draftModal, setDraftModal] = useState<{
    kind: DraftKind;
    pendingAction: PendingAction;
  } | null>(null);

  const draftDialogRef = useRef<HTMLElement | null>(null);
  const cancelDraftButtonRef = useRef<HTMLButtonElement | null>(null);

  const current = navItems.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );

  useEffect(() => {
    if (!draftModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      cancelDraftButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftModal(null);
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = draftDialogRef.current?.querySelectorAll<HTMLElement>(
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
  }, [draftModal]);

  function goToTarget(target: string) {
    if (target === '/' && hasDraft('recipe')) {
      navigate('/recetas/nueva');
      return;
    }

    navigate(target);
  }

  function runPendingAction(action: PendingAction) {
    if (action.type === 'logout') {
      void supabase.auth.signOut();
      return;
    }

    goToTarget(action.target);
  }

  function requestAction(action: PendingAction) {
    const activeDraft = getActiveDraft();

    if (activeDraft) {
      setDraftModal({ kind: activeDraft, pendingAction: action });
      return;
    }

    runPendingAction(action);
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, target: string) {
    event.preventDefault();
    requestAction({ type: 'navigation', target });
  }

  function handleLogout() {
    requestAction({ type: 'logout' });
  }

  function handleSaveAndLeave() {
    if (!draftModal) return;

    clearActiveDraft(draftModal.kind);
    const action = draftModal.pendingAction;
    setDraftModal(null);
    runPendingAction(action);
  }

  function handleDiscardAndLeave() {
    if (!draftModal) return;

    clearDraft(draftModal.kind);
    const action = draftModal.pendingAction;
    setDraftModal(null);
    runPendingAction(action);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>

      <aside className="sidebar desktop-only">
        <div>
          <p className="eyebrow">Bebidario</p>
          <h1>Ideas frescas para cada sorbo</h1>
          <p className="muted">
            Guarda preparaciones deliciosas, explora nuevos sabores y arma tu colección perfecta.
          </p>
        </div>

        <nav className="nav-list" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              key={item.to}
              to={item.to}
              onClick={(event) => handleNavClick(event, item.to)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-user">{session.user.email}</span>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="mobile-header mobile-only">
          <div>
            <p className="eyebrow">Bebidario</p>
            <h1>{current?.label ?? 'Bebidario'}</h1>
          </div>

          <button className="ghost-button" onClick={handleLogout} type="button">
            Salir
          </button>
        </header>

        <main className="page-shell" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="mobile-nav mobile-only" aria-label="Navegación móvil">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              key={item.to}
              to={item.to}
              onClick={(event) => handleNavClick(event, item.to)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {draftModal ? (
        <div
          className="draft-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDraftModal(null);
            }
          }}
        >
          <section
            ref={draftDialogRef}
            className="draft-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-modal-title"
            aria-describedby="draft-modal-description"
          >
            <p className="eyebrow">Borrador pendiente</p>
            <h2 id="draft-modal-title">Tienes una {getDraftLabel(draftModal.kind)} sin terminar</h2>
            <p className="muted" id="draft-modal-description">
              Puedes guardar lo que llevas como borrador, salir sin guardarlo o cancelar para seguir editando.
            </p>

            <div className="draft-modal-actions">
              <button className="primary-button" onClick={handleSaveAndLeave} type="button">
                Guardar borrador y salir
              </button>

              <button className="ghost-button danger" onClick={handleDiscardAndLeave} type="button">
                Salir sin guardar
              </button>

              <button
                ref={cancelDraftButtonRef}
                className="ghost-button"
                onClick={() => setDraftModal(null)}
                type="button"
              >
                Seguir editando
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
