import type { PlatformRole } from './auth';

export type TenantPlan = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE' | (string & {});

export const TENANT_PLANS: TenantPlan[] = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];

export interface Tenant {
  id: string;
  slug: string;
  nom: string;
  emailContact?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  logoUrl?: string | null;
  plan: TenantPlan;
  /** false = archivé. On n'efface jamais un établissement, on l'archive. */
  actif: boolean;
  dateExpiration?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TenantPayload {
  nom: string;
  slug?: string;
  emailContact?: string;
  telephone?: string;
  adresse?: string;
  logoUrl?: string;
  plan?: TenantPlan;
  durationMonths?: number;
  initialAdminEmail?: string;
  initialAdminTelephone?: string;
  actif?: boolean;
}

export interface PlatformUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  rolePlateforme: PlatformRole;
  /** false = archivé. */
  actif: boolean;
  createdAt?: string | null;
}

export interface PlatformUserPayload {
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  rolePlateforme: PlatformRole;
  telephone?: string;
}

/**
 * Le backend expose plusieurs alias pour la même valeur
 * (tenants / nbTenants, users / utilisateurs / nbUtilisateurs).
 * `normalizeStats` réduit tout ça à une forme unique.
 */
export interface RawPlatformStats {
  tenants?: number;
  nbTenants?: number;
  tenantActifs?: number;
  nbTenantsActifs?: number;
  tenantsSuspendus?: number;
  users?: number;
  utilisateurs?: number;
  nbUtilisateurs?: number;
  utilisateursPlateforme?: number;
  nbPlateformeUtilisateurs?: number;
  inscriptions?: number;
  paiements?: number;
  parPlan?: { plan: string; count: number }[];
  derniersTenants?: {
    id: string;
    nom: string;
    plan: string;
    actif: boolean;
    createdAt: string;
    logoUrl: string | null;
  }[];
  croissanceMensuelle?: { mois: string; count: number }[];
}

export interface PlatformStats {
  tenants: number;
  tenantsActifs: number;
  tenantsArchives: number;
  utilisateurs: number;
  utilisateursPlateforme: number;
  inscriptions: number;
  paiements: number;
  parPlan: { plan: string; count: number }[];
  derniersTenants: NonNullable<RawPlatformStats['derniersTenants']>;
  croissanceMensuelle: { mois: string; count: number }[];
}

export function normalizeStats(raw: RawPlatformStats | undefined | null): PlatformStats {
  const tenants = raw?.tenants ?? raw?.nbTenants ?? 0;
  const tenantsActifs = raw?.tenantActifs ?? raw?.nbTenantsActifs ?? 0;
  return {
    tenants,
    tenantsActifs,
    tenantsArchives: raw?.tenantsSuspendus ?? Math.max(0, tenants - tenantsActifs),
    utilisateurs: raw?.users ?? raw?.utilisateurs ?? raw?.nbUtilisateurs ?? 0,
    utilisateursPlateforme: raw?.utilisateursPlateforme ?? raw?.nbPlateformeUtilisateurs ?? 0,
    inscriptions: raw?.inscriptions ?? 0,
    paiements: raw?.paiements ?? 0,
    parPlan: raw?.parPlan ?? [],
    derniersTenants: raw?.derniersTenants ?? [],
    croissanceMensuelle: raw?.croissanceMensuelle ?? [],
  };
}

export interface AuditLog {
  id: string;
  tenantId?: string | null;
  utilisateurId?: string | null;
  role?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface PageDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type StatutDemandeAudit = 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';

export interface DemandeAudit {
  id: string;
  tenantId?: string | null;
  motif?: string | null;
  periodeDebut?: string | null;
  periodeFin?: string | null;
  statut: StatutDemandeAudit;
  commentaire?: string | null;
  dateTraitement?: string | null;
  expirationAcces?: string | null;
  createdAt: string;
  tenant?: { id: string; nom: string } | null;
  demandeur?: { id: string; firstName?: string | null; lastName?: string | null; role?: string | null } | null;
}
