'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { useAuditLogs, useTenants } from '@/hooks/use-platform';
import { formatUptime, useHealth, useReadiness, useSystemMetrics, useTenantsUsage, useSecurityMetrics, useAlerts } from '@/hooks/use-monitoring';
import { displayText, formatDateTime, formatNumber } from '@/lib/format';

const B = '#e6ebf1';
const SAMPLE_SIZE = 100;
const IP_ATTENTION_THRESHOLD = 25;
const SENSITIVE_ACTIONS = ['SUPPRESSION', 'CONNEXION', 'DECONNEXION', 'APPROBATION', 'REJET', 'ACTIVATION'];

function ProbeCard({
  title,
  icon,
  probe,
  isPending,
}: {
  title: string;
  icon: React.ReactNode;
  probe?: { ok: boolean; status: string; latencyMs: number; checkedAt: string; message?: string };
  isPending: boolean;
}) {
  const isDown = probe && !probe.ok;
  return (
    <div style={{ background: isDown ? '#fef2f2' : '#fff', border: `1px solid ${isDown ? '#fecaca' : B}`, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>{title}</div>
          {isPending ? (
            <div style={{ marginTop: 4, fontSize: 13, color: '#94a3b8' }}>Verification...</div>
          ) : probe?.ok ? (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Operationnel
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {probe?.status ?? 'Injoignable'}
            </div>
          )}
          {probe && (
            <div style={{ marginTop: 2, fontSize: 10, color: '#94a3b8' }}>{probe.latencyMs} ms · verifie a {formatDateTime(probe.checkedAt).slice(-5)}</div>
          )}
          {probe?.message && <div style={{ marginTop: 4, fontSize: 10, color: '#dc2626' }}>{probe.message}</div>}
        </div>
        <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDown ? '#fef2f2' : '#f0fdf4', color: isDown ? '#dc2626' : '#16a34a' }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SupervisionPage() {
  const health = useHealth();
  const ready = useReadiness();
  const system = useSystemMetrics();
  const tenantsUsage = useTenantsUsage();
  const security = useSecurityMetrics();
  const alertsQuery = useAlerts();
  const tenants = useTenants();
  const logs = useAuditLogs({ page: 0, size: SAMPLE_SIZE });

  const entries = logs.data?.content ?? [];
  const alerts = alertsQuery.data?.alerts ?? [];
  const criticalCount = alerts.filter((a) => a.level === 'critical').length;
  const warningCount = alerts.filter((a) => a.level === 'warning').length;
  const [activeTab, setActiveTab] = useState<'alertes' | 'service' | 'etablissements' | 'securite'>('alertes');

  const tenantName = (id?: string | null) => {
    if (!id) return 'Hors etablissement';
    return tenants.data?.find((t) => t.id === id)?.nom ?? id.slice(0, 8);
  };

  const parTenant = useMemo(() => {
    const map = new Map<string, { nom: string; count: number; last: string }>();
    for (const log of entries) {
      const key = log.tenantId ?? '__platform__';
      const current = map.get(key);
      if (current) {
        current.count += 1;
        if (log.createdAt > current.last) current.last = log.createdAt;
      } else {
        map.set(key, { nom: tenantName(log.tenantId), count: 1, last: log.createdAt });
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [entries, tenants.data]);

  const sansActivite = useMemo(() => {
    const seen = new Set(entries.map((l) => l.tenantId).filter(Boolean) as string[]);
    return (tenants.data ?? []).filter((t) => t.actif && !seen.has(t.id));
  }, [entries, tenants.data]);

  const parIp = useMemo(() => {
    const map = new Map<string, { count: number; last: string; actions: Set<string> }>();
    for (const log of entries) {
      const ip = log.ipAddress;
      if (!ip) continue;
      const current = map.get(ip);
      if (current) {
        current.count += 1;
        current.actions.add(log.action);
        if (log.createdAt > current.last) current.last = log.createdAt;
      } else {
        map.set(ip, { count: 1, last: log.createdAt, actions: new Set([log.action]) });
      }
    }
    return Array.from(map.entries())
      .map(([ip, v]) => ({ ip, count: v.count, last: v.last, actions: v.actions.size }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const parAction = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of entries) map.set(log.action, (map.get(log.action) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const actionsSensibles = useMemo(
    () => parAction.filter((a) => SENSITIVE_ACTIONS.some((s) => a.action.includes(s))),
    [parAction]
  );

  const refreshAll = () => {
    health.refetch();
    ready.refetch();
    system.refetch();
    tenantsUsage.refetch();
    security.refetch();
    alertsQuery.refetch();
    logs.refetch();
    tenants.refetch();
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 34,
    border: 'none',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#2563eb' : '#64748b',
    fontSize: 12,
    fontWeight: 600,
    padding: '0 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Supervision</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Sante du service, usage par etablissement et signaux de securite</div>
        </div>
        <button
          onClick={refreshAll}
          style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Rafraichir
        </button>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
        {/* DB alert */}
        {ready.data && !ready.data.ok && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, border: '1px solid #fecaca', background: '#fef2f2', padding: 12, fontSize: 13, color: '#991b1b', marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div style={{ fontWeight: 700 }}>La base de donnees ne repond pas</div>
              <div style={{ marginTop: 2, color: '#b91c1c' }}>
                {ready.data.message ?? "L'endpoint /health/ready est en echec. Les etablissements sont probablement hors service."}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
          <button style={tabStyle(activeTab === 'alertes')} onClick={() => setActiveTab('alertes')}>
            Alertes
            {criticalCount > 0 && <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{criticalCount}</span>}
            {criticalCount === 0 && warningCount > 0 && <span style={{ marginLeft: 6, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{warningCount}</span>}
          </button>
          <button style={tabStyle(activeTab === 'service')} onClick={() => setActiveTab('service')}>Service</button>
          <button style={tabStyle(activeTab === 'etablissements')} onClick={() => setActiveTab('etablissements')}>Etablissements</button>
          <button style={tabStyle(activeTab === 'securite')} onClick={() => setActiveTab('securite')}>Securite</button>
        </div>

        {/* ───── Alertes ───── */}
        {activeTab === 'alertes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertsQuery.isPending && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Analyse en cours...</div>
            )}
            {alertsQuery.isError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Impossible de charger les alertes</div>
                <div style={{ fontSize: 12, color: '#b91c1c' }}>
                  Le backend n&apos;a peut-etre pas ete redeploye avec les nouveaux endpoints de monitoring.
                  Verifiez que GET /api/platform/monitoring/alerts repond.
                </div>
                <button onClick={() => alertsQuery.refetch()} style={{ marginTop: 8, height: 30, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Reessayer
                </button>
              </div>
            )}
            {!alertsQuery.isPending && !alertsQuery.isError && alerts.length === 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Tous les systemes sont operationnels — aucune alerte</div>
              </div>
            )}
            {alerts.length > 0 && alerts.map((alert, i) => {
              const colors = {
                critical: { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#991b1b', label: 'CRITIQUE' },
                warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#92400e', label: 'ATTENTION' },
                info: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#166534', label: 'INFO' },
              }[alert.level];
              return (
                <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      {alert.level === 'critical' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      ) : alert.level === 'warning' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: colors.border, color: colors.text }}>{colors.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{alert.category}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{alert.message}</div>
                      <div style={{ fontSize: 12, color: colors.text, marginTop: 6, opacity: 0.85, lineHeight: 1.5 }}>
                        <strong>Recommandation :</strong> {alert.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {alertsQuery.data && (
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                Derniere verification : {formatDateTime(alertsQuery.data.checkedAt)} · Rafraichissement auto toutes les 30s
              </div>
            )}
          </div>
        )}

        {/* ───── Service ───── */}
        {activeTab === 'service' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <ProbeCard
                title="API"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                probe={health.data}
                isPending={health.isPending}
              />
              <ProbeCard
                title="Base de donnees"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
                probe={ready.data}
                isPending={ready.isPending}
              />
              <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Uptime du service
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{formatUptime(health.data?.uptimeSeconds)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Depuis le dernier redemarrage</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  Latence API
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: health.data && health.data.latencyMs > 1000 ? '#d97706' : '#16a34a' }}>
                  {health.data ? `${health.data.latencyMs} ms` : '—'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Mesuree depuis ce navigateur</div>
              </div>
            </div>

            {/* System metrics */}
            {system.data ? (
              <>
                <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Memoire et systeme</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {([
                      ['RSS', `${system.data.memory.rss} Mo`, '#2563eb'],
                      ['Heap', `${system.data.memory.heapUsed}/${system.data.memory.heapTotal} Mo`, '#7c3aed'],
                      ['OS libre', `${system.data.os.freeMemory}/${system.data.os.totalMemory} Mo`, '#16a34a'],
                      ['CPU cores', `${system.data.cpu.cores}`, '#d97706'],
                    ] as [string, string, string][]).map(([label, val, color]) => (
                      <div key={label} style={{ padding: '8px 0' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                    Node {system.data.process.nodeVersion} · PID {system.data.process.pid} · {system.data.cpu.model} · Load {system.data.cpu.loadAvg.join(' / ')}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {([
                    { label: 'Redis', ok: system.data.redis.ok, latency: system.data.redis.latencyMs, detail: 'Cache, sessions, rate limit' },
                    { label: 'Base de donnees', ok: system.data.database.ok, latency: system.data.database.latencyMs, detail: 'PostgreSQL' },
                    { label: 'Minio / S3', ok: system.data.minio?.ok ?? false, latency: system.data.minio?.latencyMs ?? 0, detail: system.data.minio?.configured ? `Bucket: ${system.data.minio.bucket}` : 'Non configure' },
                    { label: 'WhatsApp Relayio', ok: system.data.whatsapp?.ok ?? false, latency: system.data.whatsapp?.latencyMs ?? 0, detail: 'OTP, notifications' },
                  ]).map((svc) => (
                    <div key={svc.label} style={{ background: svc.ok ? '#fff' : '#fef2f2', border: `1px solid ${svc.ok ? B : '#fecaca'}`, padding: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{svc.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: svc.ok ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {svc.ok ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        )}
                        {svc.ok ? 'OK' : 'KO'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>{svc.latency} ms</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{svc.detail}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : system.isPending ? (
              <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '30px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Chargement des metriques systeme...
              </div>
            ) : system.isError ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Metriques systeme indisponibles</div>
                <div style={{ fontSize: 12, color: '#b91c1c' }}>
                  Redeployez le backend avec les nouveaux endpoints : GET /api/platform/monitoring/system
                </div>
                <button onClick={() => system.refetch()} style={{ marginTop: 8, height: 30, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Reessayer
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ───── Etablissements ───── */}
        {activeTab === 'etablissements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {logs.isPending && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
                Analyse de l&apos;activite...
              </div>
            )}
            {logs.isError && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                <div style={{ fontSize: 13, color: '#dc2626' }}>{logs.error?.message || 'Erreur'}</div>
                <button onClick={() => logs.refetch()} style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Reessayer</button>
              </div>
            )}

            {logs.data && (
              <>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Mesure sur les {formatNumber(entries.length)} dernieres entrees du journal d&apos;audit — pas sur le trafic HTTP total.
                </div>

                {parTenant.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucune activite auditee</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Le journal ne contient aucune entree.</div>
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                          <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Etablissement</th>
                          <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Actions auditees</th>
                          <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Part</th>
                          <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Derniere activite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parTenant.map((row, i) => {
                          const pct = Math.round((row.count / Math.max(1, entries.length)) * 100);
                          return (
                            <tr key={row.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{row.nom}</td>
                              <td style={{ padding: '10px 16px', color: '#334155' }}>{formatNumber(row.count)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 96, height: 6, background: '#e6ebf1', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5' }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{pct} %</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(row.last)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {sansActivite.length > 0 && (
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      Etablissements actifs sans activite recente ({sansActivite.length})
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 12 }}>
                      Aucune action auditee dans l&apos;echantillon analyse.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sansActivite.slice(0, 20).map((t) => (
                        <Link key={t.id} href={`/tenants/${t.id}`} style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: '#f1f5f9', color: '#64748b', textDecoration: 'none' }}>
                          {t.nom}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tenants usage */}
                {tenantsUsage.data && tenantsUsage.data.length > 0 && (
                  <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Consommation par etablissement</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Nombre d&apos;enregistrements par type de donnee</div>
                    </div>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Etablissement', 'Plan', 'Eleves', 'Users', 'Inscriptions', 'Paiements', 'Bulletins', 'Notes'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tenantsUsage.data.map((t, i) => (
                          <tr key={t.tenantId} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{t.nom}</td>
                            <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#e6ebf1', color: '#0f172a' }}>{t.plan}</span></td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.eleves)}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.users)}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.inscriptions)}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.paiements)}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.bulletins)}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{formatNumber(t.notes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ───── Securite ───── */}
        {activeTab === 'securite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {logs.isPending && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
                Analyse des signaux...
              </div>
            )}
            {logs.isError && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                <div style={{ fontSize: 13, color: '#dc2626' }}>{logs.error?.message || 'Erreur'}</div>
                <button onClick={() => logs.refetch()} style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Reessayer</button>
              </div>
            )}

            {logs.data && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>IPs distinctes</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{security.data ? security.data.uniqueIps24h : parIp.length}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>24 dernieres heures</div>
                  </div>
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Echecs connexion</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: security.data && security.data.echouees24h > 10 ? '#dc2626' : '#0f172a' }}>{security.data?.echouees24h ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{security.data?.echouees1h ?? 0} dans la derniere heure</div>
                  </div>
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>IPs suspectes</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{security.data?.suspiciousIps?.length ?? parIp.filter((i) => i.count >= IP_ATTENTION_THRESHOLD).length}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>5+ echecs en 24h</div>
                  </div>
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Actions sensibles</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{actionsSensibles.reduce((s, a) => s + a.count, 0)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Connexions, suppressions, approbations</div>
                  </div>
                </div>

                {/* Suspicious IPs banner */}
                {security.data && security.data.suspiciousIps.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
                      IPs suspectes — possible force brute
                    </div>
                    {security.data.suspiciousIps.map((s) => (
                      <div key={s.ip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 12 }}>
                        <span style={{ fontFamily: 'monospace', color: '#991b1b' }}>{s.ip}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#fee2e2', color: '#dc2626' }}>{s.failures} echecs</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{s.totalActions} actions totales</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 8 }}>
                      Recommandation : bloquez ces IPs via <code style={{ background: '#fee2e2', padding: '1px 4px' }}>sudo ufw deny from IP</code>
                    </div>
                  </div>
                )}

                {/* Warning banner */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, border: '1px solid #fde68a', background: '#fffbeb', padding: 12, fontSize: 13, color: '#92400e' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: 700 }}>Angles morts connus</div>
                    <div style={{ marginTop: 2, color: '#a16207' }}>
                      Les echecs de connexion, les reponses 429 du limiteur de debit et les 403 ne sont pas journalises. Aucune detection de force brute n&apos;est donc possible aujourd&apos;hui. De plus, le limiteur est configure en skipOnError: true : si Redis est indisponible, la limitation est desactivee silencieusement.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* IP les plus actives */}
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Adresses IP les plus actives</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 12 }}>
                      Volumetrie indicative — une valeur elevee n&apos;est pas une attaque, c&apos;est un signal a verifier.
                    </div>
                    {parIp.length === 0 ? (
                      <div style={{ padding: '30px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Aucune adresse IP enregistree</div>
                      </div>
                    ) : (
                      <div>
                        {parIp.slice(0, 10).map((row, i) => (
                          <div key={row.ip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>{row.ip}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.actions} type(s)</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: row.count >= IP_ATTENTION_THRESHOLD ? '#fffbeb' : '#f1f5f9', color: row.count >= IP_ATTENTION_THRESHOLD ? '#d97706' : '#64748b' }}>
                              {formatNumber(row.count)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Repartition des actions */}
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Repartition des actions</div>
                    {parAction.length === 0 ? (
                      <div style={{ padding: '30px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Aucune action auditee</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {parAction.slice(0, 10).map((row) => {
                          const pct = Math.round((row.count / Math.max(1, entries.length)) * 100);
                          return (
                            <div key={row.action}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: '#334155' }}>{displayText(row.action)}</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatNumber(row.count)}</span>
                              </div>
                              <div style={{ height: 6, background: '#e6ebf1', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security metrics from backend */}
                {security.data && (
                  <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Activite de securite (24 h)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
                      {([
                        ['Connexions 24h', formatNumber(security.data.connexions24h), '#2563eb'],
                        ['Connexions 7j', formatNumber(security.data.connexions7d), '#7c3aed'],
                        ['Total audit 24h', formatNumber(security.data.totalAudit24h), '#0f172a'],
                        ['IPs uniques 24h', formatNumber(security.data.uniqueIps24h), '#d97706'],
                      ] as [string, string, string][]).map(([label, val, color]) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 2 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {security.data.sensitiveActions.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Actions sensibles (24h)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {security.data.sensitiveActions.map((a) => (
                            <span key={a.action} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: '#fef3c7', color: '#92400e' }}>
                              {a.action} ({a.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {security.data.topIps.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Top IPs (24h)</div>
                        {security.data.topIps.slice(0, 5).map((row, i) => (
                          <div key={row.ip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>{row.ip}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{row.actions} type(s)</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: row.count >= IP_ATTENTION_THRESHOLD ? '#fef3c7' : '#f1f5f9', color: row.count >= IP_ATTENTION_THRESHOLD ? '#d97706' : '#64748b' }}>
                              {formatNumber(row.count)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
