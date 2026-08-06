'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { CredentialsPanel } from '@/components/platform/credentials-panel';
import { useCreatePlatformUser, usePlatformUsers, useSetUserActive } from '@/hooks/use-platform';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, initials, personName } from '@/lib/format';
import { messageFromError } from '@/lib/errors';
import type { PlatformRole } from '@/types/auth';
import type { PlatformUser } from '@/types/platform';

/* ── Inline SVGs (16x16) ── */

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={spinning ? { animation: 'spin 1s linear infinite' } : undefined}
  >
    <path d="M13.5 2.5v3.5h-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <path d="M2.5 8a5.5 5.5 0 019.37-3.9L13.5 6M2.5 13.5V10h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <path d="M13.5 8a5.5 5.5 0 01-9.37 3.9L2.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconShield = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1z" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M5.5 8L7 9.5 10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconArchive = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="4" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 6v7h12V6M6 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconArchiveRestore = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="4" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 6v7h12V6M8 8v4M6 10l2-2 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

const IconLoader = () => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ animation: 'spin 1s linear infinite' }}
  >
    <circle cx="8" cy="8" r="6" stroke="#d9e0e8" strokeWidth="2" />
    <path d="M8 2a6 6 0 014.24 1.76" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const IconInbox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12h5l2 3h4l2-3h5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="square" />
    <path d="M5 7l2-4h10l2 4v10a1 1 0 01-1 1H6a1 1 0 01-1-1V7z" stroke="#94a3b8" strokeWidth="1.6" />
  </svg>
);

const IconWarning = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L1 21h22L12 2z" stroke="#dc2626" strokeWidth="1.6" fill="none" />
    <path d="M12 9v4M12 16v1" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

/* ── Schema ── */

const schema = z.object({
  prenom: z.string().min(1, 'Prenom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  password: z.union([z.string().min(8, 'Minimum 8 caracteres'), z.literal('')]).optional(),
  rolePlateforme: z.enum(['SUPER_ADMIN', 'GESTIONNAIRE']),
});
type FormValues = z.infer<typeof schema>;

type StatusFilter = 'actifs' | 'archives' | 'tous';

/* ── Spin keyframes (injected once) ── */

const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

export default function UtilisateursPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('actifs');
  const [roleFilter, setRoleFilter] = useState<'tous' | 'SUPER_ADMIN' | 'GESTIONNAIRE'>('tous');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<PlatformUser | null>(null);
  const [detailUser, setDetailUser] = useState<PlatformUser | null>(null);
  const [created, setCreated] = useState<{ identifiant: string; motDePasse?: string | null } | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformUsers();
  const createUser = useCreatePlatformUser();
  const setActive = useSetUserActive();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rolePlateforme: 'GESTIONNAIRE' },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((u) => {
      if (status === 'actifs' && !u.actif) return false;
      if (status === 'archives' && u.actif) return false;
      if (roleFilter !== 'tous' && u.rolePlateforme !== roleFilter) return false;
      if (!q) return true;
      return [u.nom, u.prenom, u.email, u.telephone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status]);

  const activeSuperAdmins = useMemo(
    () => (data ?? []).filter((u) => u.actif && u.rolePlateforme === 'SUPER_ADMIN').length,
    [data]
  );

  const canArchive = (user: PlatformUser): string | null => {
    if (!user.actif) return null;
    if (user.id === currentUser?.id) return 'Vous ne pouvez pas archiver votre propre compte.';
    if (user.rolePlateforme === 'SUPER_ADMIN' && activeSuperAdmins <= 1) {
      return 'Il doit rester au moins un super administrateur actif.';
    }
    return null;
  };

  const submit = (values: FormValues) => {
    createUser.mutate(
      {
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        telephone: values.telephone || undefined,
        password: values.password || undefined,
        rolePlateforme: values.rolePlateforme as PlatformRole,
      },
      {
        onSuccess: (user) => {
          setDialogOpen(false);
          form.reset({ rolePlateforme: 'GESTIONNAIRE' });
          setCreated({
            identifiant: user?.email ?? values.email,
            motDePasse: values.password || null,
          });
        },
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <style>{spinStyle}</style>

      {/* ── Header bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 62,
          flexShrink: 0,
          position: 'sticky' as const,
          top: 0,
          zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid #e6ebf1',
          padding: '0 28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Utilisateurs plateforme
          </h1>
          {data && (
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              {data.length} compte(s)
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              height: 34,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#0f172a',
              background: '#fff',
              border: '1px solid #d9e0e8',
              borderRadius: 0,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            <IconRefresh spinning={isFetching} />
            Rafraichir
          </button>
          <button
            type="button"
            onClick={() => {
              form.reset({ rolePlateforme: 'GESTIONNAIRE' });
              setDialogOpen(true);
            }}
            style={{
              height: 34,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            <IconPlus />
            Ajouter
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
      {/* ── Credentials panel ── */}
      {created && (
        <CredentialsPanel
          identifiant={created.identifiant}
          motDePasse={created.motDePasse}
          onDismiss={() => setCreated(null)}
        />
      )}

      {/* ── Search + filter row ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              padding: '0 12px 0 36px',
              fontSize: 13,
              color: '#0f172a',
              border: '1px solid #d9e0e8',
              borderRadius: 0,
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          style={{
            height: 38,
            padding: '0 12px',
            fontSize: 13,
            color: '#0f172a',
            border: '1px solid #d9e0e8',
            borderRadius: 0,
            outline: 'none',
            background: '#fff',
            minWidth: 140,
            cursor: 'pointer',
          }}
        >
          <option value="actifs">Actifs</option>
          <option value="archives">Archives</option>
          <option value="tous">Tous</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'tous' | 'SUPER_ADMIN' | 'GESTIONNAIRE')}
          style={{
            height: 38,
            padding: '0 12px',
            fontSize: 13,
            color: '#0f172a',
            border: '1px solid #d9e0e8',
            outline: 'none',
            background: '#fff',
            minWidth: 140,
            cursor: 'pointer',
          }}
        >
          <option value="tous">Tous les roles</option>
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="GESTIONNAIRE">Gestionnaire</option>
        </select>
      </div>

      {/* ── Loading state ── */}
      {isPending && !data && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '1px dashed #e6ebf1',
            background: '#fff',
            marginTop: 14,
            padding: '40px 0',
            color: '#64748b',
            borderRadius: 0,
          }}
        >
          <IconLoader />
          <p style={{ fontSize: 13, margin: 0 }}>Chargement des comptes...</p>
        </div>
      )}

      {/* ── Error state ── */}
      {isError && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '1px solid #dc2626',
            background: '#fef2f2',
            marginTop: 14,
            padding: '40px 0',
            textAlign: 'center',
            borderRadius: 0,
          }}
        >
          <IconWarning />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', margin: 0 }}>
              Impossible de charger ces donnees
            </p>
            <p style={{ fontSize: 13, color: '#dc2626', margin: '4px 0 0' }}>
              {messageFromError(error)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              height: 34,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#dc2626',
              background: '#fff',
              border: '1px solid #dc2626',
              borderRadius: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconRefresh />
            Reessayer
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {data && filtered.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: '1px dashed #e6ebf1',
            background: '#fff',
            marginTop: 14,
            padding: '40px 0',
            textAlign: 'center',
            borderRadius: 0,
          }}
        >
          <IconInbox />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            {data.length === 0 ? 'Aucun compte plateforme' : 'Aucun resultat'}
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 360 }}>
            {data.length === 0
              ? 'Creez un premier compte pour administrer la plateforme.'
              : 'Aucun compte ne correspond a ces filtres.'}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {filtered.length > 0 && (
        <div
          style={{
            overflow: 'hidden',
            marginTop: 14,
            border: '1px solid #e6ebf1',
            background: '#fff',
            borderRadius: 0,
          }}
        >
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f7fa', textAlign: 'left' }}>
                {['Utilisateur', 'Role', 'Telephone', 'Cree le', 'Statut', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 16px',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em',
                      color: '#64748b',
                      borderBottom: '1px solid #e6ebf1',
                      textAlign: i === 5 ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const blockReason = canArchive(user);
                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid #f5f7fa' }}
                  >
                    {/* Utilisateur */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#94a3b8',
                            flexShrink: 0,
                            borderRadius: 0,
                          }}
                        >
                          {initials(personName(user), '?')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 500,
                              color: '#0f172a',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {personName(user)}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          background: user.rolePlateforme === 'SUPER_ADMIN' ? '#e0e7ff' : '#f5f7fa',
                          color: user.rolePlateforme === 'SUPER_ADMIN' ? '#4338ca' : '#64748b',
                          borderRadius: 0,
                        }}
                      >
                        {user.rolePlateforme === 'SUPER_ADMIN' ? <IconShield /> : <IconUser />}
                        {user.rolePlateforme === 'SUPER_ADMIN' ? 'Super admin' : 'Gestionnaire'}
                      </span>
                    </td>

                    {/* Telephone */}
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>
                      {user.telephone || '\u2014'}
                    </td>

                    {/* Cree le */}
                    <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          background: user.actif ? '#dcfce7' : '#fef3c7',
                          color: user.actif ? '#16a34a' : '#d97706',
                          borderRadius: 0,
                        }}
                      >
                        {user.actif ? 'Actif' : 'Archive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          title="Details"
                          onClick={() => setDetailUser(user)}
                          style={{
                            height: 30,
                            padding: '0 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#334155',
                            background: '#fff',
                            border: '1px solid #d9e0e8',
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Details
                        </button>
                        <button
                          type="button"
                          title={blockReason ?? (user.actif ? 'Archiver' : 'Reactiver')}
                          onClick={() => {
                            if (blockReason) {
                              toast.error(blockReason);
                              return;
                            }
                            setTarget(user);
                          }}
                          style={{
                            height: 30,
                            width: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            background: '#fff',
                            border: '1px solid #d9e0e8',
                            cursor: 'pointer',
                          }}
                        >
                          {user.actif ? <IconArchive /> : <IconArchiveRestore />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {/* ── Creation dialog (custom modal overlay) ── */}
      {dialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 440,
              border: '1px solid #e6ebf1',
              borderRadius: 0,
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,.12)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
              Nouveau compte plateforme
            </h2>

            <form onSubmit={form.handleSubmit(submit)} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Prenom *
                  </label>
                  <input
                    {...form.register('prenom')}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      fontSize: 13,
                      color: '#0f172a',
                      border: '1px solid #d9e0e8',
                      borderRadius: 0,
                      outline: 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                  {form.formState.errors.prenom && (
                    <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>
                      {form.formState.errors.prenom.message}
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Nom *
                  </label>
                  <input
                    {...form.register('nom')}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      fontSize: 13,
                      color: '#0f172a',
                      border: '1px solid #d9e0e8',
                      borderRadius: 0,
                      outline: 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                  {form.formState.errors.nom && (
                    <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>
                      {form.formState.errors.nom.message}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="prenom.nom@edusen.sn"
                  {...form.register('email')}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    fontSize: 13,
                    color: '#0f172a',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                {form.formState.errors.email && (
                  <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                  Telephone
                </label>
                <input
                  placeholder="+221 77 000 00 00"
                  {...form.register('telephone')}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    fontSize: 13,
                    color: '#0f172a',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                  Role plateforme
                </label>
                <select
                  value={form.watch('rolePlateforme')}
                  onChange={(e) => form.setValue('rolePlateforme', e.target.value as PlatformRole)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    fontSize: 13,
                    color: '#0f172a',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="GESTIONNAIRE">Gestionnaire</option>
                  <option value="SUPER_ADMIN">Super administrateur</option>
                </select>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  Le gestionnaire ne peut ni archiver un etablissement ni trancher une demande d&apos;audit.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                  Mot de passe
                </label>
                <input
                  type="text"
                  placeholder="Laissez vide pour un mot de passe genere"
                  {...form.register('password')}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    fontSize: 13,
                    color: '#0f172a',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                {form.formState.errors.password && (
                  <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  disabled={createUser.isPending}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#0f172a',
                    background: '#fff',
                    border: '1px solid #d9e0e8',
                    borderRadius: 0,
                    cursor: createUser.isPending ? 'not-allowed' : 'pointer',
                    opacity: createUser.isPending ? 0.6 : 1,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: 0,
                    cursor: createUser.isPending ? 'not-allowed' : 'pointer',
                    opacity: createUser.isPending ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {createUser.isPending ? <IconLoader /> : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm archive/reactivate dialog (custom modal overlay) ── */}
      {target && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !setActive.isPending) setTarget(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 440,
              border: '1px solid #e6ebf1',
              borderRadius: 0,
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,.12)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              {target.actif ? 'Archiver ce compte ?' : 'Reactiver ce compte ?'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              {target.actif ? (
                <>
                  <strong>{personName(target)}</strong> ne pourra plus se connecter.{' '}
                  <strong>Le compte n&apos;est pas supprime</strong> — son historique d&apos;audit est conserve et il
                  reste reactivable.
                </>
              ) : (
                <>
                  <strong>{personName(target)}</strong> pourra de nouveau se connecter.
                </>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={setActive.isPending}
                style={{
                  height: 36,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#0f172a',
                  background: '#fff',
                  border: '1px solid #d9e0e8',
                  borderRadius: 0,
                  cursor: setActive.isPending ? 'not-allowed' : 'pointer',
                  opacity: setActive.isPending ? 0.6 : 1,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={setActive.isPending}
                onClick={() => {
                  if (!target) return;
                  setActive.mutate({ id: target.id, actif: !target.actif }, { onSuccess: () => setTarget(null) });
                }}
                style={{
                  height: 36,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 0,
                  cursor: setActive.isPending ? 'not-allowed' : 'pointer',
                  opacity: setActive.isPending ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {setActive.isPending ? <IconLoader /> : (target.actif ? 'Archiver' : 'Reactiver')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {detailUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)' }} onClick={() => setDetailUser(null)} />
          <div style={{ position: 'relative', width: 440, maxWidth: '92vw', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,.1)' }}>
            {/* Drawer header */}
            <div style={{ flexShrink: 0, borderBottom: '1px solid #e6ebf1', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Details utilisateur</div>
              <button onClick={() => setDetailUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* Avatar + nom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                  {initials(personName(detailUser), '?')}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{personName(detailUser)}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{detailUser.email}</div>
                </div>
              </div>

              {/* Infos */}
              <div style={{ background: '#fff', border: '1px solid #e6ebf1', marginBottom: 16 }}>
                {([
                  ['Prenom', detailUser.prenom || '—'],
                  ['Nom', detailUser.nom || '—'],
                  ['Email', detailUser.email || '—'],
                  ['Telephone', detailUser.telephone || '—'],
                  ['Role', detailUser.rolePlateforme === 'SUPER_ADMIN' ? 'Super administrateur' : 'Gestionnaire'],
                  ['Statut', detailUser.actif ? 'Actif' : 'Archive'],
                  ['Cree le', formatDate(detailUser.createdAt)],
                ] as [string, string][]).map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', padding: '10px 16px', borderBottom: i < 6 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</div>
                    <div style={{ flex: 1, fontSize: 13, color: '#0f172a', fontWeight: label === 'Statut' ? 600 : 400 }}>
                      {label === 'Statut' ? (
                        <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, background: detailUser.actif ? '#dcfce7' : '#fef3c7', color: detailUser.actif ? '#16a34a' : '#d97706' }}>{value}</span>
                      ) : label === 'Role' ? (
                        <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, background: detailUser.rolePlateforme === 'SUPER_ADMIN' ? '#e0e7ff' : '#f1f5f9', color: detailUser.rolePlateforme === 'SUPER_ADMIN' ? '#4338ca' : '#64748b' }}>{value}</span>
                      ) : value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(() => {
                  const reason = detailUser.id === currentUser?.id
                    ? 'Vous ne pouvez pas archiver votre propre compte'
                    : currentUser?.role !== 'SUPER_ADMIN' && detailUser.rolePlateforme === 'SUPER_ADMIN'
                      ? 'Seul un super admin peut archiver un autre super admin'
                      : null;
                  return (
                    <button
                      onClick={() => {
                        if (reason) { toast.error(reason); return; }
                        setTarget(detailUser);
                        setDetailUser(null);
                      }}
                      style={{
                        height: 34,
                        padding: '0 14px',
                        border: '1px solid #d9e0e8',
                        background: '#fff',
                        color: '#334155',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {detailUser.actif ? <IconArchive /> : <IconArchiveRestore />}
                      {detailUser.actif ? 'Archiver' : 'Reactiver'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
