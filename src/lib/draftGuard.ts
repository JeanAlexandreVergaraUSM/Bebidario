export type DraftKind = 'recipe' | 'ingredient';

const ACTIVE_DRAFT_KEY = 'bebidario-active-draft';

export const draftKeys = {
  recipe: 'bebidario-draft-recipe',
  ingredient: 'bebidario-draft-ingredient',
} as const;

export function getDraftLabel(kind: DraftKind) {
  return kind === 'recipe' ? 'bebida' : 'ingrediente';
}

export function getActiveDraft(): DraftKind | null {
  const value = localStorage.getItem(ACTIVE_DRAFT_KEY);

  if (value === 'recipe' || value === 'ingredient') {
    return value;
  }

  return null;
}

export function markActiveDraft(kind: DraftKind) {
  localStorage.setItem(ACTIVE_DRAFT_KEY, kind);
}

export function clearActiveDraft(kind?: DraftKind) {
  const current = getActiveDraft();

  if (!kind || current === kind) {
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
  }
}

export function clearDraft(kind: DraftKind) {
  localStorage.removeItem(draftKeys[kind]);
  clearActiveDraft(kind);
}

export function hasDraft(kind: DraftKind) {
  return Boolean(localStorage.getItem(draftKeys[kind]));
}