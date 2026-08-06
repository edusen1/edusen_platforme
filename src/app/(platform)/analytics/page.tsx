'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useStats, useTenants } from '@/hooks/use-platform';
import { daysUntil, formatDate, formatMonth, formatNumber } from '@/lib/format';

const B = '#e6ebf1';

export default function AnalyticsPage() {
  const stats = useStats();
  const tenants = useTenants();

  const cumule = useMemo(() => {
    let total = 0;
    return (stats.data?.croissanceMensuelle ?? []).map((p) => {
      total += p.count;
      return { label: formatMonth(p.mois), nouveaux: p.count, cumul: total };
    });
  }, [stats.data]);

  const tauxActivite = useMemo(() => {
    const t = stats.data;
    if (!t || t.tenants === 0) return null;
    return Math.round((t.tenantsActifs / t.tenants) * 100);
  }, [stats.data]);

  const moyenneUtilisateurs = useMemo(() => {
    const t = stats.data;
    if (!t || t.tenants === 0) return null;
    return Math.round(t.utilisateurs / t.tenants);
  }, [stats.data]);

  const expirations = useMemo(() => {
    return (tenants.data ?? [])
      .map((t) => ({ tenant: t, jours: daysUntil(t.dateExpiration) }))
      .filter((x) => x.jours !== null && x.jours <= 30)
      .sort((a, b) => (a.jours ?? 0) - (b.jours ?? 0));
  }, [tenants.data]);

  const isPending = stats.isPending || tenants.isPending;
  const isError = stats.isError || tenants.isError;

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
        <div style={{ fontSize: 13, color: '#dc2626' }}>{(stats.error ?? tenants.error)?.message || 'Une erreur est survenue'}</div>
        <button
          onClick={() => { stats.refetch(); tenants.refetch(); }}
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
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Analytics</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Indicateurs calcules a partir des donnees de la plateforme</div>
        </div>
        <button
          onClick={() => { stats.refetch(); tenants.refetch(); }}
          disabled={stats.isFetching || tenants.isFetching}
          style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: stats.isFetching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: stats.isFetching ? 0.6 : 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stats.isFetching ? { animation: 'spin 1s linear infinite' } : undefined}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Rafraichir
        </button>
      </div>

      {stats.data && (
        <div style={{ padding: '14px 28px 28px' }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tauxActivite !== null && tauxActivite < 80 ? '#d97706' : '#16a34a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                Taux d&apos;activite
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: tauxActivite !== null && tauxActivite < 80 ? '#d97706' : '#16a34a' }}>
                {tauxActivite === null ? '—' : `${tauxActivite} %`}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{formatNumber(stats.data.tenantsActifs)} actifs sur {formatNumber(stats.data.tenants)}</div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Utilisateurs / etablissement</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{moyenneUtilisateurs ?? '—'}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Moyenne, tous etablissements</div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Inscriptions</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{formatNumber(stats.data.inscriptions)}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Toutes ecoles confondues</div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Paiements</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{formatNumber(stats.data.paiements)}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Toutes ecoles confondues</div>
            </div>
          </div>

          {/* Croissance cumulee */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Croissance cumulee des etablissements</div>
            {cumule.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucune donnee de croissance</div>
              </div>
            ) : (
              <div style={{ height: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumule}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" width={28} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="cumul" name="Total" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="nouveaux" name="Nouveaux" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* Par plan */}
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Etablissements par plan</div>
              {stats.data.parPlan.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Aucun plan renseigne</div>
                </div>
              ) : (
                <div style={{ height: 224 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.data.parPlan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="plan" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" width={28} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" name="Etablissements" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Abonnements a echeance */}
            <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Abonnements arrivant a echeance</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 12 }}>Sous 30 jours ou deja expires</div>

              {expirations.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucune echeance proche</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Aucun abonnement n&apos;expire dans les 30 prochains jours.</div>
                </div>
              ) : (
                <div>
                  {expirations.slice(0, 8).map(({ tenant, jours }, i) => (
                    <div key={tenant.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < Math.min(expirations.length, 8) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={(jours ?? 0) < 0 ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/tenants/${tenant.id}`} style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {tenant.nom}
                        </Link>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>Expire le {formatDate(tenant.dateExpiration)}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: (jours ?? 0) < 0 ? '#fef2f2' : '#fffbeb', color: (jours ?? 0) < 0 ? '#dc2626' : '#d97706' }}>
                        {(jours ?? 0) < 0 ? `Expire (${Math.abs(jours ?? 0)} j)` : `${jours} j`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Not available */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Revenus et facturation</div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Aucun endpoint de facturation n&apos;existe cote backend. Ces indicateurs seront ajoutes des que /platform/billing sera disponible — nous preferons ne rien afficher plutot qu&apos;un chiffre invente.
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
