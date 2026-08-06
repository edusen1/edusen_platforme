'use client';

import { useMemo, useState } from 'react';

import { useTenants } from '@/hooks/use-platform';
import { daysUntil, formatDate } from '@/lib/format';
import type { Tenant } from '@/types/platform';

type StatusFilter = 'actif' | 'expire' | 'tous';

/* ──── inline SVG icons (16x16) ──── */

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconCross = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export default function PaiementsPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous');

  const { data, isPending, isError, error } = useTenants();

  const plans = useMemo(() => {
    const set = new Set((data ?? []).map((t) => t.plan).filter(Boolean));
    return Array.from(set) as string[];
  }, [data]);

  /* ──── KPI computations ──── */
  const kpis = useMemo(() => {
    const tenants = data ?? [];
    const total = tenants.length;
    const actifs = tenants.filter((t) => t.actif).length;
    let expirationSoon = 0;
    let expires = 0;
    for (const t of tenants) {
      const remaining = daysUntil(t.dateExpiration);
      if (remaining === null) continue;
      if (remaining < 0) {
        expires++;
      } else if (remaining <= 30) {
        expirationSoon++;
      }
    }
    return { total, actifs, expirationSoon, expires };
  }, [data]);

  /* ──── Filtered list ──── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (statusFilter === 'actif' && !t.actif) return false;
      if (statusFilter === 'expire') {
        const remaining = daysUntil(t.dateExpiration);
        if (remaining === null || remaining >= 0) return false;
      }
      if (planFilter !== 'tous' && t.plan !== planFilter) return false;
      if (!q) return true;
      return [t.nom, t.slug, t.emailContact]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, statusFilter, planFilter]);

  const daysColor = (remaining: number | null): string => {
    if (remaining === null) return '#64748b';
    if (remaining < 0) return '#dc2626';
    if (remaining <= 30) return '#d97706';
    return '#16a34a';
  };

  const daysLabel = (remaining: number | null): string => {
    if (remaining === null) return '\u2014';
    if (remaining < 0) return `Expire (${Math.abs(remaining)} j)`;
    return `${remaining} j`;
  };

  const kpiCards: { label: string; value: number; color: string; icon: React.ReactNode }[] = [
    { label: 'Total etablissements', value: kpis.total, color: '#2563eb', icon: <IconBuilding /> },
    { label: 'Actifs', value: kpis.actifs, color: '#16a34a', icon: <IconCheck /> },
    { label: 'Expiration < 30j', value: kpis.expirationSoon, color: '#d97706', icon: <IconWarning /> },
    { label: 'Expires', value: kpis.expires, color: '#dc2626', icon: <IconCross /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ──── Header bar ──── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e6ebf1',
        height: 62,
        flexShrink: 0,
        position: 'sticky' as const,
        top: 0,
        zIndex: 10,
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Paiements</h1>
          {data && (
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Suivi des abonnements et expirations
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>

        {/* ──── KPI row ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          {kpiCards.map((kpi) => (
            <div key={kpi.label} style={{
              background: '#fff',
              border: '1px solid #e6ebf1',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${kpi.color}14`,
                color: kpi.color,
                flexShrink: 0,
              }}>
                {kpi.icon}
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>{kpi.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {isPending ? '\u2014' : kpi.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ──── Filters row ──── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <IconSearch />
            </div>
            <input
              type="text"
              placeholder="Rechercher un etablissement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                border: '1px solid #d9e0e8',
                padding: '0 12px 0 36px',
                fontSize: 13,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
                borderRadius: 0,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{
              height: 38,
              border: '1px solid #d9e0e8',
              padding: '0 12px',
              fontSize: 13,
              color: '#0f172a',
              background: '#fff',
              minWidth: 140,
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            <option value="tous">Tous les plans</option>
            {plans.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              height: 38,
              border: '1px solid #d9e0e8',
              padding: '0 12px',
              fontSize: 13,
              color: '#0f172a',
              background: '#fff',
              minWidth: 140,
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="expire">Expire</option>
          </select>
        </div>

        {/* ──── Loading state ──── */}
        {isPending && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Chargement des paiements...
          </div>
        )}

        {/* ──── Error state ──── */}
        {isError && (
          <div style={{
            padding: '24px 0',
            background: '#fff',
            border: '1px solid #e6ebf1',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>
              {error?.message || 'Erreur lors du chargement'}
            </p>
          </div>
        )}

        {/* ──── Empty state ──── */}
        {data && filtered.length === 0 && (
          <div style={{
            padding: '40px 28px',
            background: '#fff',
            border: '1px solid #e6ebf1',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              Aucun resultat
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Aucun etablissement ne correspond a ces filtres.
            </p>
          </div>
        )}

        {/* ──── Table ──── */}
        {filtered.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e6ebf1', overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              minWidth: 800,
            }}>
              <thead>
                <tr style={{ background: '#f5f7fa' }}>
                  {['Etablissement', 'Plan', 'Statut', 'Date creation', 'Date expiration', 'Jours restants', 'Actions'].map((col) => (
                    <th key={col} style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontWeight: 600,
                      color: '#64748b',
                      fontSize: 11,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em',
                      borderBottom: '1px solid #e6ebf1',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant: Tenant) => {
                  const remaining = daysUntil(tenant.dateExpiration);
                  return (
                    <tr key={tenant.id} style={{ borderBottom: '1px solid #e6ebf1' }}>
                      {/* Etablissement */}
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {tenant.nom}
                      </td>
                      {/* Plan */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: '#e6ebf1',
                          color: '#0f172a',
                          borderRadius: 0,
                        }}>
                          {tenant.plan || '\u2014'}
                        </span>
                      </td>
                      {/* Statut */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: tenant.actif ? '#dcfce7' : '#fee2e2',
                          color: tenant.actif ? '#16a34a' : '#dc2626',
                          borderRadius: 0,
                        }}>
                          {tenant.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      {/* Date creation */}
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {formatDate(tenant.createdAt)}
                      </td>
                      {/* Date expiration */}
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {formatDate(tenant.dateExpiration)}
                      </td>
                      {/* Jours restants */}
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: daysColor(remaining) }}>
                        {daysLabel(remaining)}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => {/* placeholder */}}
                          style={{
                            height: 30,
                            border: '1px solid #d9e0e8',
                            background: '#fff',
                            color: '#2563eb',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '0 12px',
                            cursor: 'pointer',
                            borderRadius: 0,
                          }}
                        >
                          Prolonger
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
