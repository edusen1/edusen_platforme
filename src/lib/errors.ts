const DOWN_MESSAGE = 'Service temporairement indisponible. Réessayez dans un instant.';

interface ApiErrorShape {
  code?: string;
  message?: string;
  response?: { status?: number; data?: { message?: string; code?: string } };
}

/**
 * Vrai quand l'échec vient du serveur ou du réseau, pas d'une erreur métier.
 * Sert à ne jamais afficher « Identifiants incorrects » sur un 503 — le défaut
 * relevé sur le front tenant lors du test intégral.
 */
export function isServerDown(error: unknown): boolean {
  const err = error as ApiErrorShape;
  const status = err?.response?.status;
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') return true;
  if (status === undefined || status === 0) return true;
  return status >= 500;
}

export function isForbidden(error: unknown): boolean {
  return (error as ApiErrorShape)?.response?.status === 403;
}

export function isUnauthorized(error: unknown): boolean {
  return (error as ApiErrorShape)?.response?.status === 401;
}

/** Message lisible, qui distingue panne serveur et erreur métier. */
export function messageFromError(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (isServerDown(error)) return DOWN_MESSAGE;
  if (isForbidden(error)) return "Vous n'avez pas les droits nécessaires pour cette action.";
  const err = error as ApiErrorShape;
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

/** Message dédié à l'écran de connexion. */
export function loginErrorMessage(error: unknown): string {
  if (isServerDown(error)) return DOWN_MESSAGE;
  if (isUnauthorized(error)) return 'Email ou mot de passe incorrect.';
  return messageFromError(error);
}
