'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { auditApi, platformUsersApi, statsApi, tenantsApi } from '@/lib/api/endpoints';
import { messageFromError } from '@/lib/errors';
import { normalizeStats, type PlatformUserPayload, type TenantPayload } from '@/types/platform';

export const qk = {
  stats: ['platform', 'stats'] as const,
  tenants: ['platform', 'tenants'] as const,
  tenant: (id: string) => ['platform', 'tenants', id] as const,
  users: ['platform', 'users'] as const,
  user: (id: string) => ['platform', 'users', id] as const,
  auditLogs: (params: Record<string, unknown>) => ['platform', 'audit-logs', params] as const,
  demandes: (params: Record<string, unknown>) => ['platform', 'demandes-audit', params] as const,
};

// ─── Stats ──────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: qk.stats,
    queryFn: statsApi.get,
    select: normalizeStats,
  });
}

// ─── Établissements ─────────────────────────────────────────────────────────

export function useTenants() {
  return useQuery({ queryKey: qk.tenants, queryFn: tenantsApi.list });
}

export function useTenant(id: string) {
  return useQuery({ queryKey: qk.tenant(id), queryFn: () => tenantsApi.get(id), enabled: Boolean(id) });
}

function useInvalidateTenants() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.tenants });
    qc.invalidateQueries({ queryKey: qk.stats });
  };
}

export function useCreateTenant() {
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: (payload: TenantPayload) => tenantsApi.create(payload),
    onSuccess: () => {
      toast.success('Établissement créé');
      invalidate();
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

export function useUpdateTenant(id: string) {
  const invalidate = useInvalidateTenants();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TenantPayload>) => tenantsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Établissement modifié');
      qc.invalidateQueries({ queryKey: qk.tenant(id) });
      invalidate();
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

/** Archiver / réactiver — on n'efface jamais un établissement. */
export function useArchiveTenant() {
  const invalidate = useInvalidateTenants();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archive ? tenantsApi.archive(id) : tenantsApi.restore(id),
    onSuccess: (_data, { id, archive }) => {
      toast.success(archive ? 'Établissement archivé' : 'Établissement réactivé');
      qc.invalidateQueries({ queryKey: qk.tenant(id) });
      invalidate();
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

export function useUploadTenantLogo(id: string) {
  const invalidate = useInvalidateTenants();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => tenantsApi.uploadLogo(id, file),
    onSuccess: () => {
      toast.success('Logo mis à jour');
      qc.invalidateQueries({ queryKey: qk.tenant(id) });
      invalidate();
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

// ─── Utilisateurs plateforme ────────────────────────────────────────────────

export function usePlatformUsers() {
  return useQuery({ queryKey: qk.users, queryFn: platformUsersApi.list });
}

export function usePlatformUser(id: string) {
  return useQuery({
    queryKey: qk.user(id),
    queryFn: () => platformUsersApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlatformUserPayload) => platformUsersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

/** Archiver / réactiver un compte plateforme. */
export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      platformUsersApi.setActive(id, actif),
    onSuccess: (_data, { id, actif }) => {
      toast.success(actif ? 'Compte réactivé' : 'Compte archivé');
      qc.invalidateQueries({ queryKey: qk.user(id) });
      qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export function useAuditLogs(params: { page: number; size: number; action?: string; tenantId?: string }) {
  return useQuery({
    queryKey: qk.auditLogs(params),
    queryFn: () => auditApi.logs(params),
    placeholderData: (prev) => prev,
  });
}

export function useDemandesAudit(params: { statut?: string; tenantId?: string } = {}) {
  return useQuery({
    queryKey: qk.demandes(params),
    queryFn: () => auditApi.demandes(params),
  });
}

export function useTraiterDemandeAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      commentaire,
      dureeAccesJours,
    }: {
      id: string;
      decision: 'approuver' | 'rejeter';
      commentaire?: string;
      dureeAccesJours?: number;
    }) =>
      decision === 'approuver'
        ? auditApi.approuver(id, { commentaire, dureeAccesJours })
        : auditApi.rejeter(id, { commentaire }),
    onSuccess: (_data, { decision }) => {
      toast.success(decision === 'approuver' ? 'Demande approuvée' : 'Demande rejetée');
      qc.invalidateQueries({ queryKey: ['platform', 'demandes-audit'] });
    },
    onError: (error) => toast.error(messageFromError(error)),
  });
}
