const DEFAULT_PUBLIC_APP_URL = 'https://jeanalexandrevergarausm.github.io/Bebidario/';

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function getPublicAppBaseUrl() {
  return normalizeBaseUrl(
    import.meta.env.VITE_PUBLIC_APP_URL ?? DEFAULT_PUBLIC_APP_URL,
  );
}

export function buildOrganizerPublicLink(token: string) {
  return `${getPublicAppBaseUrl()}#/organizador/${encodeURIComponent(token)}`;
}

export function buildGuestMenuPublicLink(token: string) {
  return `${getPublicAppBaseUrl()}#/menu/${encodeURIComponent(token)}`;
}
