import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MouseEvent, useState } from 'react';
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

  const current = navItems.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );

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
      setDraftModal({
        kind: activeDraft,
        pendingAction: action,
      });
      return;
    }

    runPendingAction(action);
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, target: string) {
    event.preventDefault();

    requestAction({
      type: 'navigation',
      target,
    });
  }

  function handleLogout() {
    requestAction({
      type: 'logout',
    });
  }

  function handleSaveAndLeave() {
    if (!draftModal) {
      return;
    }

    clearActiveDraft(draftModal.kind);
    const action = draftModal.pendingAction;
    setDraftModal(null);
    runPendingAction(action);
  }

  function handleDiscardAndLeave() {
    if (!draftModal) {
      return;
    }

    clearDraft(draftModal.kind);
    const action = draftModal.pendingAction;
    setDraftModal(null);
    runPendingAction(action);
  }

  function handleCancelModal() {
    setDraftModal(null);
  }

  return (
    <div className="app-shell">
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

        <main className="page-shell">
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
        <div className="draft-modal-backdrop" role="presentation">
          <section className="draft-modal" role="dialog" aria-modal="true">
            <p className="eyebrow">Borrador pendiente</p>
            <h2>Tienes una {getDraftLabel(draftModal.kind)} sin terminar</h2>
            <p className="muted">
              Puedes guardar lo que llevas como borrador, salir sin guardarlo o cancelar
              para seguir editando.
            </p>

            <div className="draft-modal-actions">
              <button className="primary-button" onClick={handleSaveAndLeave} type="button">
                Guardar y salir
              </button>

              <button className="ghost-button danger" onClick={handleDiscardAndLeave} type="button">
                No guardar y salir
              </button>

              <button className="ghost-button" onClick={handleCancelModal} type="button">
                Cancelar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}