export type PlatformRole = 'SUPER_ADMIN' | 'GESTIONNAIRE';

/** Rôles autorisés à se connecter à l'espace plateforme. */
export const PLATFORM_ROLES: PlatformRole[] = ['SUPER_ADMIN', 'GESTIONNAIRE'];

export function isPlatformRole(role: unknown): role is PlatformRole {
  return typeof role === 'string' && (PLATFORM_ROLES as string[]).includes(role);
}

export interface SessionUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: PlatformRole;
  allRoles: PlatformRole[];
}

export interface AuthSession {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  passwordChangeRequired?: boolean;
}

/** Profil renvoyé par GET /v1/auth/me — le JWT ne porte ni nom ni prénom. */
export interface MeResponse {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  firstName?: string;
  lastName?: string;
  telephone?: string;
  role: string;
}
