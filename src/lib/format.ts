import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : parseISO(String(value));
  return isValid(d) ? d : null;
}

/** `dd/MM/yyyy` — jamais d'ISO brut à l'écran. */
export function formatDate(value: unknown, fallback = '—'): string {
  const d = toDate(value);
  return d ? format(d, 'dd/MM/yyyy', { locale: fr }) : fallback;
}

export function formatDateTime(value: unknown, fallback = '—'): string {
  const d = toDate(value);
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: fr }) : fallback;
}

/** "2026-01" → "janv. 2026" */
export function formatMonth(value: string, fallback = '—'): string {
  const d = toDate(`${value}-01`);
  return d ? format(d, 'MMM yyyy', { locale: fr }) : fallback;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

/** Devise du produit : FCFA. Jamais MRU. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

/**
 * Garde-fou d'affichage : un objet ne doit jamais finir en `[object Object]`
 * et un null ne doit jamais s'afficher vide.
 */
export function displayText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    const json = JSON.stringify(value);
    return json && json !== '{}' ? json : fallback;
  } catch {
    return fallback;
  }
}

/** UUID tronqué et lisible plutôt qu'un identifiant complet dans un tableau. */
export function shortId(value: unknown, fallback = '—'): string {
  if (typeof value !== 'string' || !value) return fallback;
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function personName(
  person: { prenom?: string | null; nom?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined,
  fallback = '—'
): string {
  if (!person) return fallback;
  const prenom = person.prenom ?? person.firstName ?? '';
  const nom = person.nom ?? person.lastName ?? '';
  const full = `${prenom} ${nom}`.trim();
  if (full) return full;
  return person.email ?? fallback;
}

export function initials(value: string | null | undefined, fallback = '?'): string {
  if (!value) return fallback;
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return fallback;
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

/** Nombre de jours restants avant une échéance — négatif si dépassée. */
export function daysUntil(value: unknown): number | null {
  const d = toDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
