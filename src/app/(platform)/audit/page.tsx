'use client';

import { useState } from 'react';

import { useAuditLogs, useTenants } from '@/hooks/use-platform';
import { displayText, formatDateTime, shortId } from '@/lib/format';
import type { AuditLog } from '@/types/platform';

const B = '#e6ebf1';
const SIZES = [20, 50, 100];

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('tous');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const tenants = useTenants();
  const { data, isPending, isError, error, refetch, isFetching } = useAuditLogs({
    page,
    size,
    action: action || undefined,
    tenantId: tenantId === 'tous' ? undefined : tenantId,
  });

  const tenantName = (id?: string | null) => {
    if (!id) return '—';
    const found = tenants.data?.find((t) => t.id === id);
    return found?.nom ?? shortId(id);
  };

  const applySearch = () => {
    setPage(0);
    setAction(actionInput.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Journal d&apos;audit</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{data ? `${data.totalElements} entree(s)` : 'Chargement...'}</div>
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
          Rafraichir
        </button>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Filtrer par action (CONNEXION, SUPPRESSION...)"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              style={{ width: '100%', height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 12, padding: '0 12px 0 34px', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <button
            onClick={applySearch}
            style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Filtrer
          </button>
          <select
            value={tenantId}
            onChange={(e) => { setPage(0); setTenantId(e.target.value); }}
            style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 12, padding: '0 10px', fontFamily: 'inherit', minWidth: 180, outline: 'none' }}
          >
            <option value="tous">Tous les etablissements</option>
            {(tenants.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
          <select
            value={String(size)}
            onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}
            style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 12, padding: '0 10px', fontFamily: 'inherit', minWidth: 90, outline: 'none' }}
          >
            {SIZES.map((s) => (
              <option key={s} value={String(s)}>{s} / page</option>
            ))}
          </select>
        </div>

        {/* States */}
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
            Chargement du journal...
          </div>
        )}
        {isError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <div style={{ fontSize: 13, color: '#dc2626' }}>{error?.message || 'Erreur'}</div>
            <button onClick={() => refetch()} style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Reessayer</button>
          </div>
        )}

        {data && data.content.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Aucune entree</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {action || tenantId !== 'tous' ? 'Aucune entree pour ces filtres.' : 'Le journal est vide.'}
            </div>
          </div>
        )}

        {data && data.content.length > 0 && (
          <>
            <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden', marginBottom: 14 }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Date</th>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Action</th>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Etablissement</th>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Role</th>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Ressource</th>
                    <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((log, i) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: '#f1f5f9', color: '#64748b' }}>{displayText(log.action)}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#334155' }}>{tenantName(log.tenantId)}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>{displayText(log.role)}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>
                        {displayText(log.resourceType)}
                        {log.resourceId ? <span style={{ color: '#94a3b8' }}> · {shortId(log.resourceId)}</span> : null}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{displayText(log.ipAddress)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748b' }}>
              <span>Page {data.page + 1} sur {Math.max(1, data.totalPages)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={data.first}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: data.first ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: data.first ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Precedent
                </button>
                <button
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: data.last ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: data.last ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Suivant
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Side panel (detail) */}
      {selected && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#fff', borderLeft: `1px solid ${B}`, zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Backdrop */}
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 480, bottom: 0, background: 'rgba(0,0,0,0.15)', zIndex: 49 }}
          />
          <div style={{ position: 'relative', zIndex: 51, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${B}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Detail de l&apos;entree</div>
              <button onClick={() => setSelected(null)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['Date', formatDateTime(selected.createdAt)],
                  ['Action', displayText(selected.action)],
                  ['Etablissement', tenantName(selected.tenantId)],
                  ['Role', displayText(selected.role)],
                  ['Type de ressource', displayText(selected.resourceType)],
                  ['Ressource', shortId(selected.resourceId)],
                  ['Utilisateur', shortId(selected.utilisateurId)],
                  ['Adresse IP', displayText(selected.ipAddress)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>{label}</div>
                    <div style={{ marginTop: 2, fontSize: 13, color: '#0f172a', wordBreak: 'break-word' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8' }}>Navigateur</div>
                <div style={{ marginTop: 2, fontSize: 11, color: '#64748b', wordBreak: 'break-word' }}>{displayText(selected.userAgent)}</div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#94a3b8', marginBottom: 4 }}>Details</div>
                <pre style={{ maxHeight: 320, overflow: 'auto', background: '#0f172a', padding: 12, fontSize: 11, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selected.details ? JSON.stringify(selected.details, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
