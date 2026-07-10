import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicGuestMenu } from '../services/events';
import { PublicGuestMenu } from '../types';

function formatEventDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function GuestMenuPage() {
  const { token } = useParams();
  const [menu, setMenu] = useState<PublicGuestMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const existingRobotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = existingRobotsMeta?.content;
    const robotsMeta = existingRobotsMeta ?? document.createElement('meta');

    if (!existingRobotsMeta) {
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.content = 'noindex, nofollow, noarchive';

    return () => {
      document.title = previousTitle;

      if (existingRobotsMeta && previousRobotsContent !== undefined) {
        existingRobotsMeta.content = previousRobotsContent;
      } else if (!existingRobotsMeta) {
        robotsMeta.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMenu() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchPublicGuestMenu(token);

        if (cancelled) return;

        if (!result) {
          setNotFound(true);
          return;
        }

        document.title = `${result.name} · Bebidario`;
        setMenu(result);
      } catch (loadError) {
        console.error('Error cargando carta de invitados:', loadError);

        if (!cancelled) {
          setError('No pudimos cargar la carta. Intenta nuevamente en unos minutos.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMenu();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="guest-menu-page">
        <section className="guest-menu-state" aria-live="polite" role="status">
          <div className="loader" aria-hidden="true" />
          <div>
            <p className="eyebrow">Bebidario</p>
            <h1>Preparando la carta</h1>
            <p className="muted">Estamos cargando el menú disponible para este evento.</p>
          </div>
        </section>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="guest-menu-page">
        <section className="guest-menu-state" role="alert">
          <div className="guest-menu-state-icon" aria-hidden="true">🍹</div>
          <p className="eyebrow">Bebidario</p>
          <h1>Esta carta no está disponible</h1>
          <p className="muted">
            Revisa que hayas abierto el enlace completo incluido en el código QR del evento.
          </p>
        </section>
      </main>
    );
  }

  if (error || !menu) {
    return (
      <main className="guest-menu-page">
        <section className="guest-menu-state" role="alert">
          <div className="guest-menu-state-icon" aria-hidden="true">🍹</div>
          <p className="eyebrow">Bebidario</p>
          <h1>No pudimos abrir la carta</h1>
          <p className="muted">{error ?? 'Intenta nuevamente más tarde.'}</p>
        </section>
      </main>
    );
  }

  const isBirthday = menu.event_type === 'birthday';

  return (
    <main className={`guest-menu-page ${isBirthday ? 'guest-menu-birthday' : 'guest-menu-general'}`}>
      <a className="skip-link" href="#guest-menu-drinks">Ir a la carta</a>

      <header className="guest-menu-topbar">
        <div className="guest-menu-brand-mark" aria-hidden="true">🍹</div>
        <div>
          <p className="eyebrow">Bebidario</p>
          <span>{isBirthday ? 'Carta de cumpleaños' : 'Carta del evento'}</span>
        </div>
      </header>

      <section className="guest-menu-hero" aria-labelledby="guest-menu-title">
        {isBirthday ? (
          <div className="birthday-decorations" aria-hidden="true">
            <span className="birthday-balloon balloon-one">●</span>
            <span className="birthday-balloon balloon-two">●</span>
            <span className="birthday-balloon balloon-three">●</span>
            <span className="birthday-confetti confetti-one">✦</span>
            <span className="birthday-confetti confetti-two">◆</span>
            <span className="birthday-confetti confetti-three">✦</span>
            <span className="birthday-confetti confetti-four">◆</span>
          </div>
        ) : null}

        <div className="guest-menu-hero-content">
          <span className="guest-menu-celebration-icon" aria-hidden="true">
            {isBirthday ? '🎉' : '🍹'}
          </span>
          <p className="eyebrow">{isBirthday ? '¡A celebrar!' : 'Carta de bebidas'}</p>
          <h1 id="guest-menu-title">{menu.name}</h1>
          <p className="guest-menu-date">{formatEventDate(menu.event_date)}</p>
          <p className="guest-menu-intro">
            {isBirthday
              ? 'Hoy se celebra a lo grande. Revisa la carta, encuentra tu favorita y pídela directamente en la barra.'
              : 'Conoce las bebidas disponibles, elige la que más te guste y pídela directamente en la barra.'}
          </p>

          <div className="guest-menu-hero-note">
            <span aria-hidden="true">👀</span>
            <p>Solo mira la carta y elige con calma. Cuando decidas, acércate a la barra y pide por el nombre.</p>
          </div>
        </div>
      </section>

      <section
        id="guest-menu-drinks"
        className="guest-menu-menu-section"
        aria-labelledby="guest-menu-drinks-title"
      >
        <div className="guest-menu-section-heading">
          <div>
            <p className="eyebrow">La carta</p>
            <h2 id="guest-menu-drinks-title">¿Qué vas a probar?</h2>
          </div>
          <p>{menu.recipes.length} {menu.recipes.length === 1 ? 'opción disponible' : 'opciones disponibles'}</p>
        </div>

        <div className="guest-menu-grid" aria-label="Bebidas disponibles en el evento">
          {menu.recipes.map((recipe, index) => {
            const ingredientText = recipe.ingredients.filter(Boolean).join(', ');

            return (
              <article className="guest-menu-card" key={recipe.id}>
                <div className="guest-menu-card-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div className="guest-menu-media">
                  {recipe.image_url ? (
                    <img
                      alt={`Presentación de ${recipe.title}`}
                      loading="lazy"
                      src={recipe.image_url}
                    />
                  ) : (
                    <div className="guest-menu-placeholder" aria-hidden="true">🍹</div>
                  )}
                </div>

                <div className="guest-menu-copy">
                  <p className="eyebrow">{recipe.category}</p>
                  <h2>{recipe.title}</h2>

                  <p className="guest-menu-description">
                    {recipe.description || 'Una bebida preparada especialmente para disfrutar durante la celebración.'}
                  </p>

                  {ingredientText ? (
                    <p className="guest-menu-ingredients">
                      <strong>Lleva:</strong> {ingredientText}.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="guest-menu-footer">
        <div className="guest-menu-footer-mark" aria-hidden="true">{isBirthday ? '🎂' : '🍹'}</div>
        <h2>{isBirthday ? '¡Que siga la celebración!' : 'Disfruta la carta'}</h2>
        <p>Elige tu favorita y pídela directamente en la barra.</p>
        <span>Bebidario</span>
      </footer>
    </main>
  );
}
