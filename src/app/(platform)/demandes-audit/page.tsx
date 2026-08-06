'use client';

import { useMemo, useState } from 'react';

import { useDemandesAudit, useTraiterDemandeAudit } from '@/hooks/use-platform';
import { useIsSuperAdmin } from '@/stores/auth-store';
import { displayText, formatDate, formatDateTime, personName } from '@/lib/format';
import type { DemandeAudit, StatutDemandeAudit } from '@/types/platform';

const B = '#e6ebf1';
const DUREES = [7, 15, 30, 90];

const STATUT_STYLE: Record<StatutDemandeAudit, { bg: string; color: string }> = {
  EN_ATTENTE: { bg: '#fffbeb', color: '#d97706' },
  APPROUVEE: { bg: '#f0fdf4', color: '#16a34a' },
  REJETEE: { bg: '#fef2f2', color: '#dc2626' },
};
const STATUT_LABEL: Record<StatutDemandeAudit, string> = {
  EN_ATTENTE: 'En attente',
  APPROUVEE: 'Approuvee',
  REJETEE: 'Rejetee',
};

export default function DemandesAuditPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const { data, isPending, isError, error, refetch, isFetching } = useDemandesAudit();
  const traiter = useTraiterDemandeAudit();

  const [target, setTarget] = useState<{ demande: DemandeAudit; decision: 'approuver' | 'rejeter' } | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [duree, setDuree] = useState('7');
  const [activeTab, setActiveTab] = useState<StatutDemandeAudit>('EN_ATTENTE');

  const groups = useMemo(() => {
    const list = data ?? [];
    return {
      EN_ATTENTE: list.filter((d) => d.statut === 'EN_ATTENTE'),
      APPROUVEE: list.filter((d) => d.statut === 'APPROUVEE'),
      REJETEE: list.filter((d) => d.statut === 'REJETEE'),
    };
  }, [data]);

  const openDecision = (demande: DemandeAudit, decision: 'approuver' | 'rejeter') => {
    setCommentaire('');
    setDuree('7');
    setTarget({ demande, decision });
  };

  const confirm = () => {
    if (!target) return;
    traiter.mutate(
      {
        id: target.demande.id,
        decision: target.decision,
        commentaire: commentaire.trim() || undefined,
        dureeAccesJours: target.decision === 'approuver' ? Number(duree) : undefined,
      },
      { onSuccess: () => setTarget(null) }
    );
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

  const renderList = (list: DemandeAudit[], statut: StatutDemandeAudit) => {
    if (list.length === 0) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            {statut === 'EN_ATTENTE'
              ? 'Aucune demande en attente'
              : statut === 'APPROUVEE'
                ? 'Aucune demande approuvee'
                : 'Aucune demande rejetee'}
          </div>
          {statut === 'EN_ATTENTE' && (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Toutes les demandes ont ete traitees.</div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((d) => (
          <div key={d.id} style={{ background: '#fff', border: `1px solid ${B}`, padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.tenant?.nom ?? '—'}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: STATUT_STYLE[d.statut].bg, color: STATUT_STYLE[d.statut].color }}>
                    {STATUT_LABEL[d.statut]}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>{displayText(d.motif, 'Aucun motif renseigne')}</div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                  Demande par <span style={{ fontWeight: 600, color: '#334155' }}>{personName(d.demandeur)}</span>
                  {d.demandeur?.role ? ` · ${d.demandeur.role}` : ''} · {formatDateTime(d.createdAt)}
                </div>
                {(d.periodeDebut || d.periodeFin) && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                    Periode : {formatDate(d.periodeDebut)} &rarr; {formatDate(d.periodeFin)}
                  </div>
                )}
                {d.commentaire && (
                  <div style={{ marginTop: 8, background: '#f8fafc', padding: 8, fontSize: 11, fontStyle: 'italic', color: '#64748b' }}>
                    {d.commentaire}
                  </div>
                )}
                {d.statut === 'APPROUVEE' && d.expirationAcces && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#16a34a' }}>
                    Acces valable jusqu&apos;au {formatDate(d.expirationAcces)}
                  </div>
                )}
              </div>

              {d.statut === 'EN_ATTENTE' && isSuperAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openDecision(d, 'approuver')}
                    style={{ height: 34, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Approuver
                  </button>
                  <button
                    onClick={() => openDecision(d, 'rejeter')}
                    style={{ height: 34, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Demandes d&apos;audit</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Acces temporaire aux journaux d&apos;un etablissement</div>
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
        {/* Info banner for non-super-admin */}
        {!isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, border: `1px solid ${B}`, background: '#f8fafc', padding: 12, fontSize: 13, color: '#64748b', marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="1"/><path d="M12 13v2"/>
            </svg>
            <span>Consultation seule. Seul un super administrateur peut approuver ou rejeter une demande.</span>
          </div>
        )}

        {/* States */}
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
            Chargement des demandes...
          </div>
        )}
        {isError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <div style={{ fontSize: 13, color: '#dc2626' }}>{error?.message || 'Erreur'}</div>
            <button onClick={() => refetch()} style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Reessayer</button>
          </div>
        )}

        {data && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
              <button style={tabStyle(activeTab === 'EN_ATTENTE')} onClick={() => setActiveTab('EN_ATTENTE')}>
                En attente
                {groups.EN_ATTENTE.length > 0 && (
                  <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                    {groups.EN_ATTENTE.length}
                  </span>
                )}
              </button>
              <button style={tabStyle(activeTab === 'APPROUVEE')} onClick={() => setActiveTab('APPROUVEE')}>
                Approuvees ({groups.APPROUVEE.length})
              </button>
              <button style={tabStyle(activeTab === 'REJETEE')} onClick={() => setActiveTab('REJETEE')}>
                Rejetees ({groups.REJETEE.length})
              </button>
            </div>

            {renderList(groups[activeTab], activeTab)}
          </>
        )}
      </div>

      {/* Decision dialog */}
      {target && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setTarget(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'relative', zIndex: 51, background: '#fff', border: `1px solid ${B}`, width: 440, maxWidth: '90vw', padding: 0 }}>
            {/* Dialog header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {target.decision === 'approuver' ? "Approuver l'acces aux journaux" : 'Rejeter la demande'}
              </div>
            </div>

            {/* Dialog body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{target.demande.tenant?.nom ?? '—'}</span>
                {' — '}
                {displayText(target.demande.motif, 'aucun motif')}
              </div>

              {target.decision === 'approuver' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Duree de l&apos;acces</label>
                  <select
                    value={duree}
                    onChange={(e) => setDuree(e.target.value)}
                    style={{ width: '100%', height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 12, padding: '0 10px', fontFamily: 'inherit', outline: 'none' }}
                  >
                    {DUREES.map((d) => (
                      <option key={d} value={String(d)}>{d} jours</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>L&apos;acces expirera automatiquement a cette echeance.</div>
                </div>
              )}

              <div>
                <label htmlFor="commentaire" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Commentaire (optionnel)</label>
                <textarea
                  id="commentaire"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={
                    target.decision === 'approuver'
                      ? 'Ex : acces accorde pour verification comptable'
                      : 'Ex : motif insuffisamment justifie'
                  }
                  style={{ width: '100%', border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 12, padding: 10, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Dialog footer */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${B}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setTarget(null)}
                disabled={traiter.isPending}
                style={{ height: 34, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={confirm}
                disabled={traiter.isPending}
                style={{
                  height: 34,
                  border: 'none',
                  background: target.decision === 'approuver' ? '#16a34a' : '#dc2626',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '0 18px',
                  cursor: traiter.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: traiter.isPending ? 0.7 : 1,
                }}
              >
                {traiter.isPending
                  ? 'Traitement...'
                  : target.decision === 'approuver'
                    ? "Confirmer l'approbation"
                    : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
