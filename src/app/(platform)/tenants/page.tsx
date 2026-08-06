'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { TenantFormDialog } from '@/components/platform/tenant-form-dialog';
import { ConfirmDialog } from '@/components/platform/confirm-dialog';
import { useArchiveTenant, useCreateTenant, useTenants, useUpdateTenant } from '@/hooks/use-platform';
import { useIsSuperAdmin } from '@/stores/auth-store';
import { formatDate, daysUntil } from '@/lib/format';
import type { Tenant, TenantPayload } from '@/types/platform';

type StatusFilter = 'actifs' | 'archives' | 'tous';

/* ──── inline SVG icons (16x16) ──── */

const IconRefresh = ({ spin }: { spin?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={spin ? { animation: 'spin 1s linear infinite' } : undefined}>
    <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" />
  </svg>
);

const IconPencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconArchive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="5" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />
  </svg>
);

const IconRestore = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="5" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="m9.5 14 2-2 2 2" /><path d="M11.5 16v-4" />
  </svg>
);

/* ──── spin keyframes injected once ──── */
const spinStyle = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('actifs');
  const [plan, setPlan] = useState('tous');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Tenant | null>(null);

  const isSuperAdmin = useIsSuperAdmin();
  const { data, isPending, isError, error, refetch, isFetching } = useTenants();

  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant(editing?.id ?? '');
  const archiveTenant = useArchiveTenant();

  const plans = useMemo(() => {
    const set = new Set((data ?? []).map((t) => t.plan).filter(Boolean));
    return Array.from(set) as string[];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (status === 'actifs' && !t.actif) return false;
      if (status === 'archives' && t.actif) return false;
      if (plan !== 'tous' && t.plan !== plan) return false;
      if (!q) return true;
      return [t.nom, t.slug, t.emailContact, t.adresse]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status, plan]);

  const handleSubmit = (payload: TenantPayload) => {
    if (editing) {
      updateTenant.mutate(payload, { onSuccess: () => setFormOpen(false) });
    } else {
      createTenant.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setFormOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* inject spin keyframes */}
      <style dangerouslySetInnerHTML={{ __html: spinStyle }} />

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
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Etablissements</h1>
          {data && (
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              {data.length} etablissement(s) sur la plateforme
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              height: 34,
              border: '1px solid #d9e0e8',
              background: '#fff',
              color: '#0f172a',
              fontSize: 13,
              fontWeight: 500,
              padding: '0 14px',
              cursor: isFetching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isFetching ? 0.6 : 1,
              borderRadius: 0,
            }}
          >
            <IconRefresh spin={isFetching} />
            Rafraichir
          </button>
          <button
            onClick={openCreate}
            style={{
              height: 34,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '0 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 0,
            }}
          >
            <IconPlus />
            Ajouter
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
      {/* ──── Search & filters row ──── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, identifiant, email..."
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
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
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
          <option value="actifs">Actifs</option>
          <option value="archives">Archives</option>
          <option value="tous">Tous</option>
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
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
      </div>

      {/* ──── Loading state ──── */}
      {isPending && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Chargement des etablissements...
        </div>
      )}

      {/* ──── Error state ──── */}
      {isError && (
        <div style={{
          padding: '24px 0',
          background: '#fff',
          border: '1px solid #e6ebf1',
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>
            {error?.message || 'Erreur lors du chargement'}
          </p>
          <button
            onClick={() => refetch()}
            style={{
              height: 34,
              border: '1px solid #d9e0e8',
              background: '#fff',
              color: '#0f172a',
              fontSize: 13,
              fontWeight: 500,
              padding: '0 14px',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            Reessayer
          </button>
        </div>
      )}

      {/* ──── Empty state ──── */}
      {data && filtered.length === 0 && (
        <div style={{
          padding: '40px 28px',
          background: '#fff',
          border: '1px solid #e6ebf1',
          marginTop: 14,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
            {data.length === 0 ? 'Aucun etablissement' : 'Aucun resultat'}
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
            {data.length === 0
              ? 'Creez un premier etablissement pour demarrer.'
              : 'Aucun etablissement ne correspond a ces filtres.'}
          </p>
          {data.length === 0 && (
            <button
              onClick={openCreate}
              style={{
                height: 34,
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                padding: '0 16px',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              Creer un etablissement
            </button>
          )}
        </div>
      )}

      {/* ──── Cards grid ──── */}
      {filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          marginTop: 14,
        }}>
          {filtered.map((tenant) => {
            const remaining = daysUntil(tenant.dateExpiration);
            return (
              <div
                key={tenant.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e6ebf1',
                  padding: 16,
                }}
              >
                {/* Top row: icon + name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: tenant.actif ? '#e6ebf1' : '#f5f7fa',
                    color: tenant.actif ? '#2563eb' : '#94a3b8',
                    borderRadius: 0,
                  }}>
                    {tenant.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tenant.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <IconBuilding />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0f172a',
                        textDecoration: 'none',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tenant.nom}
                    </Link>
                    <p style={{
                      fontSize: 12,
                      color: '#64748b',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {tenant.slug || '\u2014'}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
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
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    background: tenant.actif ? '#dcfce7' : '#fef3c7',
                    color: tenant.actif ? '#16a34a' : '#d97706',
                    borderRadius: 0,
                  }}>
                    {tenant.actif ? 'Actif' : 'Archive'}
                  </span>
                  {remaining !== null && remaining <= 30 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      background: remaining < 0 ? '#fee2e2' : '#fef3c7',
                      color: remaining < 0 ? '#dc2626' : '#d97706',
                      borderRadius: 0,
                    }}>
                      {remaining < 0 ? 'Expire' : `Expire dans ${remaining} j`}
                    </span>
                  )}
                </div>

                {/* Date */}
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  Cree le {formatDate(tenant.createdAt)}
                </p>

                {/* Actions */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', gap: 8 }}>
                  <Link
                    href={`/tenants/${tenant.id}`}
                    style={{
                      flex: 1,
                      height: 34,
                      border: '1px solid #d9e0e8',
                      background: '#fff',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      textDecoration: 'none',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Details
                  </Link>
                  <button
                    onClick={() => openEdit(tenant)}
                    style={{
                      height: 34,
                      padding: '0 14px',
                      border: '1px solid #d9e0e8',
                      background: '#fff',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <IconPencil />
                    Modifier
                  </button>
                  {isSuperAdmin && (
                    <button
                      title={tenant.actif ? 'Archiver' : 'Reactiver'}
                      onClick={() => setArchiveTarget(tenant)}
                      style={{
                        width: 34,
                        height: 34,
                        border: '1px solid #d9e0e8',
                        background: '#fff',
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        borderRadius: 0,
                      }}
                    >
                      {tenant.actif ? <IconArchive /> : <IconRestore />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenant={editing}
        isSubmitting={createTenant.isPending || updateTenant.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(v) => !v && setArchiveTarget(null)}
        title={archiveTarget?.actif ? "Archiver l'etablissement ?" : "Reactiver l'etablissement ?"}
        description={
          archiveTarget?.actif ? (
            <>
              <strong>{archiveTarget?.nom}</strong> n&apos;aura plus acces a la plateforme.{' '}
              <strong>Aucune donnee n&apos;est effacee</strong> &mdash; l&apos;etablissement reste consultable dans le
              filtre &laquo; Archives &raquo; et peut etre reactive a tout moment.
            </>
          ) : (
            <>
              <strong>{archiveTarget?.nom}</strong> retrouvera l&apos;acces a la plateforme.
            </>
          )
        }
        confirmLabel={archiveTarget?.actif ? 'Archiver' : 'Reactiver'}
        isLoading={archiveTenant.isPending}
        onConfirm={() => {
          if (!archiveTarget) return;
          archiveTenant.mutate(
            { id: archiveTarget.id, archive: archiveTarget.actif },
            { onSuccess: () => setArchiveTarget(null) }
          );
        }}
      />
    </div>
  );
}
