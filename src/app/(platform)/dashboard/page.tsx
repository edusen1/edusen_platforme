'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStats } from '@/hooks/use-platform';
import { formatDate, formatMonth, formatNumber } from '@/lib/format';

const B = '#e6ebf1';
const PLAN_COLORS = ['#4f46e5', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b'];

export default function DashboardPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useStats();

  if (isPending) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        Chargement...
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#dc2626' }}>{error?.message || 'Une erreur est survenue'}</div>
        <button
          onClick={() => refetch()}
          style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Tableau de bord</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Vue d&apos;ensemble de la plateforme Edusen</div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: isFetching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isFetching ? 0.6 : 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={isFetching ? { animation: 'spin 1s linear infinite' } : undefined}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Rafraîchir
        </button>
      </div>

      {data && (
        <div style={{ padding: '14px 28px 28px' }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
            {([
              { label: 'Etablissements', value: data.tenants, color: '#2563eb' },
              { label: 'Actifs', value: data.tenantsActifs, color: '#16a34a' },
              { label: 'Archives', value: data.tenantsArchives, color: '#d97706' },
              { label: 'Utilisateurs', value: data.utilisateurs, color: '#0891b2' },
              { label: 'Comptes plateforme', value: data.utilisateursPlateforme, color: '#7c3aed' },
              { label: 'Paiements', value: data.paiements, color: '#2563eb' },
            ] as const).map((kpi) => (
              <div key={kpi.label} style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{formatNumber(kpi.value)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* Croissance */}
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Nouveaux établissements par mois</div>
              {data.croissanceMensuelle.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucune donnée de croissance</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Aucun établissement enregistré sur la période.</div>
                </div>
              ) : (
                <div style={{ height: 256 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.croissanceMensuelle.map((p) => ({ ...p, label: formatMonth(p.mois) }))}>
                      <defs>
                        <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" width={28} />
                      <Tooltip
                        formatter={(v) => [formatNumber(Number(v)), 'Établissements']}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="url(#growth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Répartition par plan */}
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Répartition par plan</div>
              {data.parPlan.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Aucun plan renseigné</div>
                </div>
              ) : (
                <>
                  <div style={{ height: 192 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.parPlan} dataKey="count" nameKey="plan" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {data.parPlan.map((_, i) => (
                            <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {data.parPlan.map((p, i) => (
                      <div key={p.plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[i % PLAN_COLORS.length], flexShrink: 0 }} />
                          {p.plan || '—'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatNumber(p.count)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Derniers établissements */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Derniers établissements</div>
              <Link href="/tenants" style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Voir tout</Link>
            </div>

            {data.derniersTenants.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucun établissement</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Créez un premier établissement pour démarrer.</div>
                <Link href="/tenants" style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  Créer un établissement
                </Link>
              </div>
            ) : (
              <div>
                {data.derniersTenants.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/tenants/${t.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < data.derniersTenants.length - 1 ? '1px solid #f1f5f9' : 'none', textDecoration: 'none' }}
                  >
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2ff', color: '#4f46e5' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nom}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Créé le {formatDate(t.createdAt)}</div>
                    </div>
                    {/* Plan badge */}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: '#f1f5f9', color: '#64748b' }}>
                      {t.plan || '—'}
                    </span>
                    {/* Status badge */}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: t.actif ? '#f0fdf4' : '#fffbeb', color: t.actif ? '#16a34a' : '#d97706' }}>
                      {t.actif ? 'Actif' : 'Archivé'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin animation for refresh icon */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
