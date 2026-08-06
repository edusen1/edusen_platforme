'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/components/platform/states';
import { TenantFormDialog } from '@/components/platform/tenant-form-dialog';
import { ConfirmDialog } from '@/components/platform/confirm-dialog';
import { useArchiveTenant, useAuditLogs, useTenant, useUpdateTenant, useUploadTenantLogo } from '@/hooks/use-platform';
import { useIsSuperAdmin } from '@/stores/auth-store';
import { daysUntil, displayText, formatDate, formatDateTime, personName, shortId } from '@/lib/format';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

type Tab = 'identite' | 'abonnement' | 'activite';

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14V6H2V4ZM3 7H13V13H3V7ZM6 9H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const ArchiveRestoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14V6H2V4ZM3 7H13V13H3V7ZM8 9V11M6 11H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 21V3H14V9H20V21H4ZM6 19H8V17H6V19ZM6 15H8V13H6V15ZM6 11H8V9H6V11ZM6 7H8V5H6V7ZM10 19H12V17H10V19ZM10 15H12V13H10V15ZM10 11H12V9H10V11ZM10 7H12V5H10V7ZM16 19H18V17H16V19ZM16 15H18V13H16V15ZM16 11H18V9H16V11Z" fill="currentColor" />
  </svg>
);

const ImageUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 13V3H14V13H2ZM8 5V9M6 7H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const isSuperAdmin = useIsSuperAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('identite');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tenant, isPending, isError, error, refetch } = useTenant(id);
  const updateTenant = useUpdateTenant(id);
  const archiveTenant = useArchiveTenant();
  const uploadLogo = useUploadTenantLogo(id);

  const logs = useAuditLogs({ page: 0, size: 20, tenantId: id });

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_LOGO.includes(file.type)) {
      toast.error('Format invalide. PNG, JPEG, WebP ou SVG uniquement.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo trop lourd. Maximum 2 Mo.');
      return;
    }
    uploadLogo.mutate(file);
  };

  if (isPending) return <LoadingState label="Chargement de l'etablissement..." />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!tenant) return <EmptyState title="Etablissement introuvable" />;

  const remaining = daysUntil(tenant.dateExpiration);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'identite', label: 'Identite' },
    { key: 'abonnement', label: 'Abonnement' },
    { key: 'activite', label: 'Activite' },
  ];

  const infoFields: [string, unknown][] = [
    ['Nom', tenant.nom],
    ['Identifiant court', tenant.slug],
    ['Email de contact', tenant.emailContact],
    ['Telephone', tenant.telephone],
    ['Adresse', tenant.adresse],
    ['Cree le', formatDate(tenant.createdAt)],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #e6ebf1',
          height: 62,
          flexShrink: 0,
          position: 'sticky' as const,
          top: 0,
          zIndex: 10,
          padding: '0 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/tenants" style={{ display: 'inline-flex', alignItems: 'center', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeftIcon />
          </Link>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{tenant.nom}</h1>
          {tenant.slug && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>{tenant.slug}</p>
          )}
        </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            style={{
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#0f172a',
              background: '#fff',
              border: '1px solid #d9e0e8',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            <PencilIcon />
            Modifier
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              style={{
                height: 34,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                fontSize: 13,
                fontWeight: 500,
                color: '#0f172a',
                background: '#fff',
                border: '1px solid #d9e0e8',
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              {tenant.actif ? (
                <>
                  <ArchiveIcon />
                  Archiver
                </>
              ) : (
                <>
                  <ArchiveRestoreIcon />
                  Reactiver
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e6ebf1' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Identite */}
      {activeTab === 'identite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Logo card */}
          <div style={{ background: '#fff', border: '1px solid #e6ebf1', padding: 20, borderRadius: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: '#f5f7fa',
                  color: '#2563eb',
                  borderRadius: 0,
                }}
              >
                {tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tenant.logoUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <BuildingIcon />
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>Logo</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8px' }}>
                  PNG, JPEG, WebP ou SVG — 2 Mo maximum
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_LOGO.join(',')}
                  style={{ display: 'none' }}
                  onChange={(e) => handleLogo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  style={{
                    height: 34,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#0f172a',
                    background: '#fff',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    cursor: uploadLogo.isPending ? 'not-allowed' : 'pointer',
                    opacity: uploadLogo.isPending ? 0.6 : 1,
                  }}
                >
                  <ImageUpIcon />
                  {uploadLogo.isPending ? 'Envoi...' : 'Changer le logo'}
                </button>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              background: '#fff',
              border: '1px solid #e6ebf1',
              padding: 20,
              borderRadius: 0,
            }}
          >
            {infoFields.map(([label, value]) => (
              <div key={label as string}>
                <dt
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  {label}
                </dt>
                <dd style={{ fontSize: 13, color: '#0f172a', margin: '4px 0 0' }}>
                  {displayText(value)}
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Abonnement */}
      {activeTab === 'abonnement' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {/* Plan */}
          <div style={{ background: '#fff', border: '1px solid #e6ebf1', padding: 20, borderRadius: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                margin: 0,
              }}
            >
              Plan
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '6px 0 0' }}>
              {displayText(tenant.plan)}
            </p>
          </div>

          {/* Statut */}
          <div style={{ background: '#fff', border: '1px solid #e6ebf1', padding: 20, borderRadius: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                margin: 0,
              }}
            >
              Statut
            </p>
            <span
              style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 0,
                background: tenant.actif ? '#dcfce7' : '#fef3c7',
                color: tenant.actif ? '#15803d' : '#a16207',
              }}
            >
              {tenant.actif ? 'Actif' : 'Archive'}
            </span>
          </div>

          {/* Expiration */}
          <div style={{ background: '#fff', border: '1px solid #e6ebf1', padding: 20, borderRadius: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                margin: 0,
              }}
            >
              Expiration
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '6px 0 0' }}>
              {formatDate(tenant.dateExpiration)}
            </p>
            {remaining !== null && (
              <p
                style={{
                  fontSize: 12,
                  color: remaining < 0 ? '#dc2626' : '#64748b',
                  margin: '4px 0 0',
                }}
              >
                {remaining < 0
                  ? `Expire depuis ${Math.abs(remaining)} j`
                  : `${remaining} j restants`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Activite */}
      {activeTab === 'activite' && (
        <div>
          {logs.isPending && <LoadingState label="Chargement de l'activite..." />}
          {logs.isError && <ErrorState error={logs.error} onRetry={() => logs.refetch()} />}
          {logs.data && logs.data.content.length === 0 && (
            <EmptyState
              title="Aucune activite enregistree"
              description="Aucune action auditee pour cet etablissement."
            />
          )}
          {logs.data && logs.data.content.length > 0 && (
            <div
              style={{
                overflow: 'hidden',
                border: '1px solid #e6ebf1',
                background: '#fff',
                borderRadius: 0,
              }}
            >
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f7fa', textAlign: 'left' }}>
                    <th
                      style={{
                        padding: '10px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#64748b',
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: '10px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#64748b',
                      }}
                    >
                      Action
                    </th>
                    <th
                      style={{
                        padding: '10px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#64748b',
                      }}
                    >
                      Utilisateur
                    </th>
                    <th
                      style={{
                        padding: '10px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#64748b',
                      }}
                    >
                      Ressource
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.content.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderTop: '1px solid #e6ebf1' }}
                    >
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 500,
                            background: '#f5f7fa',
                            color: '#0f172a',
                            borderRadius: 0,
                          }}
                        >
                          {displayText(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#0f172a' }}>
                        {personName(null) === '\u2014' && !log.utilisateurId
                          ? '\u2014'
                          : shortId(log.utilisateurId)}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>
                        {displayText(log.resourceType)}{' '}
                        {log.resourceId ? `\u00b7 ${shortId(log.resourceId)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      </div>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenant={tenant}
        isSubmitting={updateTenant.isPending}
        onSubmit={(payload) => updateTenant.mutate(payload, { onSuccess: () => setFormOpen(false) })}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={tenant.actif ? "Archiver l'etablissement ?" : "Reactiver l'etablissement ?"}
        description={
          tenant.actif ? (
            <>
              <strong>{tenant.nom}</strong> n&apos;aura plus acces a la plateforme.{' '}
              <strong>Aucune donnee n&apos;est effacee</strong> — reactivable a tout moment.
            </>
          ) : (
            <>
              <strong>{tenant.nom}</strong> retrouvera l&apos;acces a la plateforme.
            </>
          )
        }
        confirmLabel={tenant.actif ? 'Archiver' : 'Reactiver'}
        isLoading={archiveTenant.isPending}
        onConfirm={() =>
          archiveTenant.mutate({ id, archive: tenant.actif }, { onSuccess: () => setArchiveOpen(false) })
        }
      />
    </div>
  );
}
