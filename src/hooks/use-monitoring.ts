'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface HealthProbe {
  ok: boolean;
  status: string;
  uptimeSeconds?: number;
  latencyMs: number;
  checkedAt: string;
  message?: string;
}

async function probe(path: string): Promise<HealthProbe> {
  const started = performance.now();
  try {
    const res = await apiClient.get(path, { timeout: 8000 });
    const body = (res.data ?? {}) as { status?: string; uptimeSeconds?: number };
    return {
      ok: true,
      status: body.status ?? 'ok',
      uptimeSeconds: body.uptimeSeconds,
      latencyMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
    return {
      ok: false,
      status: err?.response?.status ? String(err.response.status) : 'injoignable',
      latencyMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
      message: err?.response?.data?.message ?? err?.message,
    };
  }
}

/** GET /health — service vivant + uptime. Sonde toutes les 30 s. */
export function useHealth() {
  return useQuery({
    queryKey: ['monitoring', 'health'],
    queryFn: () => probe('/health'),
    refetchInterval: 30_000,
    retry: false,
  });
}

/** GET /health/ready — exécute un SELECT 1 : seul vrai indicateur de l'état de la base. */
export function useReadiness() {
  return useQuery({
    queryKey: ['monitoring', 'ready'],
    queryFn: () => probe('/health/ready'),
    refetchInterval: 30_000,
    retry: false,
  });
}

// ── Monitoring endpoints ──────────────────────────────────────────

export interface SystemMetrics {
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  cpu: { cores: number; model: string; loadAvg: number[] };
  os: { platform: string; totalMemory: number; freeMemory: number; uptime: number };
  redis: { ok: boolean; latencyMs: number };
  database: { ok: boolean; latencyMs: number };
  minio: { ok: boolean; latencyMs: number; bucket: string; configured: boolean };
  whatsapp: { ok: boolean; latencyMs: number; provider: string; url: string };
  process: { pid: number; nodeVersion: string; uptimeSeconds: number };
  timestamp: string;
}

export interface TenantUsage {
  tenantId: string;
  nom: string;
  actif: boolean;
  plan: string;
  eleves: number;
  users: number;
  inscriptions: number;
  paiements: number;
  bulletins: number;
  notes: number;
}

export interface SecurityMetrics {
  connexions24h: number;
  connexions7d: number;
  echouees24h: number;
  echouees1h: number;
  totalAudit24h: number;
  uniqueIps24h: number;
  topIps: { ip: string; count: number; actions: number; failures: number }[];
  suspiciousIps: { ip: string; failures: number; totalActions: number }[];
  sensitiveActions: { action: string; count: number }[];
  timestamp: string;
}

export function useSystemMetrics() {
  return useQuery<SystemMetrics>({
    queryKey: ['monitoring', 'system'],
    queryFn: async () => {
      const res = await apiClient.get('/platform/monitoring/system');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useTenantsUsage() {
  return useQuery<TenantUsage[]>({
    queryKey: ['monitoring', 'tenants-usage'],
    queryFn: async () => {
      const res = await apiClient.get('/platform/monitoring/tenants-usage');
      return res.data;
    },
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useSecurityMetrics() {
  return useQuery<SecurityMetrics>({
    queryKey: ['monitoring', 'security'],
    queryFn: async () => {
      const res = await apiClient.get('/platform/monitoring/security');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export interface Alert {
  level: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  checkedAt: string;
}

export function useAlerts() {
  return useQuery<AlertsResponse>({
    queryKey: ['monitoring', 'alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/platform/monitoring/alerts');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export function formatUptime(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}
