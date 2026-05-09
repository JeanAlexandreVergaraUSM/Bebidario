import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  session: Session;
}

const navItems = [
  { to: '/', label: 'Bebidas', icon: '🍹' },
  { to: '/favoritas', label: 'Favoritas', icon: '❤️' },
  { to: '/ingredientes', label: 'Ingredientes', icon: '🍓' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

export function Layout({ session }: LayoutProps) {
  const location = useLocation();
  const current = navItems.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );

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
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-user">{session.user.email}</span>
          <button
            className="ghost-button"
            onClick={() => {
              void supabase.auth.signOut();
            }}
            type="button"
          >
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
          <button
            className="ghost-button"
            onClick={() => {
              void supabase.auth.signOut();
            }}
            type="button"
          >
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
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}