import { apiClient } from './client';
import type {
  AuditLog,
  DemandeAudit,
  PageDto,
  PlatformUser,
  PlatformUserPayload,
  RawPlatformStats,
  Tenant,
  TenantPayload,
} from '@/types/platform';
import type { LoginResponse, MeResponse } from '@/types/auth';

const unwrap = <T,>(res: { data: T | { data: T } }): T => {
  const body = res.data as T & { data?: T };
  return (body?.data ?? body) as T;
};

export const authApi = {
  login: (payload: { login: string; password: string }) =>
    apiClient.post<LoginResponse>('/v1/auth/login', payload).then(unwrap),
  /** Le JWT ne porte ni nom ni prénom : il faut ce second appel pour l'identité. */
  me: () => apiClient.get<MeResponse>('/v1/auth/me').then(unwrap),
  updateMe: (payload: Partial<MeResponse>) =>
    apiClient.patch<MeResponse>('/v1/auth/me', payload).then(unwrap),
  changePassword: (payload: { ancienMotDePasse: string; nouveauMotDePasse: string }) =>
    apiClient.post('/v1/auth/change-password', payload).then(unwrap),
  logout: () => apiClient.post('/v1/auth/logout').then(unwrap),
};

export const tenantsApi = {
  list: () => apiClient.get<Tenant[]>('/platform/tenants').then(unwrap),
  get: (id: string) => apiClient.get<Tenant>(`/platform/tenants/${id}`).then(unwrap),
  create: (payload: TenantPayload) =>
    apiClient.post<Tenant>('/platform/tenants', payload).then(unwrap),
  update: (id: string, payload: Partial<TenantPayload>) =>
    apiClient.put<Tenant>(`/platform/tenants/${id}`, payload).then(unwrap),

  /** Archiver — `actif: false`. Aucune donnée n'est effacée. */
  archive: (id: string) =>
    apiClient.post<Tenant>(`/platform/tenants/${id}/suspend`).then(unwrap),
  restore: (id: string) =>
    apiClient.post<Tenant>(`/platform/tenants/${id}/reactivate`).then(unwrap),

  uploadLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<{ logoUrl: string }>(`/platform/tenants/${id}/logo`, form)
      .then(unwrap);
  },
  setLogoUrl: (id: string, logoUrl: string) =>
    apiClient.post<{ logoUrl: string }>(`/platform/tenants/${id}/logo`, { logoUrl }).then(unwrap),

  // DELETE /platform/tenants/:id existe mais fait un `prisma.tenant.delete()`
  // (suppression dure, irréversible). Volontairement non exposé : on archive.
};

export const platformUsersApi = {
  list: () => apiClient.get<PlatformUser[]>('/platform/utilisateurs').then(unwrap),
  get: (id: string) => apiClient.get<PlatformUser>(`/platform/utilisateurs/${id}`).then(unwrap),
  create: (payload: PlatformUserPayload) =>
    apiClient.post<PlatformUser>('/platform/utilisateurs', payload).then(unwrap),

  /**
   * Archiver / réactiver un compte.
   * Le backend fait `actif !== 'false'` : la valeur doit être sérialisée explicitement.
   */
  setActive: (id: string, actif: boolean) =>
    apiClient
      .patch<PlatformUser>(`/platform/utilisateurs/${id}/actif`, null, {
        params: { actif: actif ? 'true' : 'false' },
      })
      .then(unwrap),

  // DELETE /platform/utilisateurs/:id : suppression dure qui orpheline les logs
  // d'audit. Volontairement non exposé — l'archivage couvre le besoin.
};

export const statsApi = {
  get: () => apiClient.get<RawPlatformStats>('/platform/stats').then(unwrap),
};

export const auditApi = {
  logs: (params: { page?: number; size?: number; action?: string; tenantId?: string }) =>
    apiClient.get<PageDto<AuditLog>>('/platform/audit-logs', { params }).then(unwrap),
  demandes: (params?: { statut?: string; tenantId?: string }) =>
    apiClient.get<DemandeAudit[]>('/platform/demandes-audit', { params }).then(unwrap),
  approuver: (id: string, payload: { commentaire?: string; dureeAccesJours?: number }) =>
    apiClient.patch<DemandeAudit>(`/platform/demandes-audit/${id}/approuver`, payload).then(unwrap),
  rejeter: (id: string, payload: { commentaire?: string }) =>
    apiClient.patch<DemandeAudit>(`/platform/demandes-audit/${id}/rejeter`, payload).then(unwrap),
};
