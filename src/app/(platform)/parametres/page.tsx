'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { messageFromError } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import { personName } from '@/lib/format';

const B = '#e6ebf1';

const profilSchema = z.object({
  prenom: z.string().min(1, 'Prenom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
});
type ProfilForm = z.infer<typeof profilSchema>;

const passwordSchema = z
  .object({
    ancienMotDePasse: z.string().min(1, 'Mot de passe actuel requis'),
    nouveauMotDePasse: z.string().min(8, 'Minimum 8 caracteres'),
    confirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ParametresPage() {
  const { user, patchUser } = useAuthStore();
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profil' | 'securite' | 'plateforme'>('profil');

  const profilForm = useForm<ProfilForm>({ resolver: zodResolver(profilSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (!user) return;
    profilForm.reset({
      prenom: user.prenom ?? '',
      nom: user.nom ?? '',
      email: user.email ?? '',
      telephone: user.telephone ?? '',
    });
  }, [user, profilForm]);

  const saveProfil = async (values: ProfilForm) => {
    setSavingProfil(true);
    try {
      await authApi.updateMe(values);
      patchUser(values);
      toast.success('Profil mis a jour');
    } catch (error) {
      toast.error(messageFromError(error));
    } finally {
      setSavingProfil(false);
    }
  };

  const savePassword = async (values: PasswordForm) => {
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        ancienMotDePasse: values.ancienMotDePasse,
        nouveauMotDePasse: values.nouveauMotDePasse,
      });
      passwordForm.reset();
      toast.success('Mot de passe modifie');
    } catch (error) {
      toast.error(messageFromError(error));
    } finally {
      setSavingPassword(false);
    }
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 34,
    border: '1px solid #d9e0e8',
    background: '#fff',
    color: '#0f172a',
    fontSize: 13,
    padding: '0 12px',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#334155',
    display: 'block',
    marginBottom: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Parametres</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Votre compte plateforme</div>
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
        {/* User card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${B}`, padding: 16, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2ff', color: '#4f46e5' }}>
            {user?.role === 'SUPER_ADMIN' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {personName(user, user?.email ?? 'Compte plateforme')}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', background: user?.role === 'SUPER_ADMIN' ? '#eef2ff' : '#f1f5f9', color: user?.role === 'SUPER_ADMIN' ? '#4f46e5' : '#64748b' }}>
            {user?.role === 'SUPER_ADMIN' ? 'Super administrateur' : 'Gestionnaire'}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
          <button style={tabStyle(activeTab === 'profil')} onClick={() => setActiveTab('profil')}>Profil</button>
          <button style={tabStyle(activeTab === 'securite')} onClick={() => setActiveTab('securite')}>Securite</button>
          <button style={tabStyle(activeTab === 'plateforme')} onClick={() => setActiveTab('plateforme')}>Plateforme</button>
        </div>

        {/* Profil tab */}
        {activeTab === 'profil' && (
          <form
            onSubmit={profilForm.handleSubmit(saveProfil)}
            noValidate
            style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="prenom" style={labelStyle}>Prenom</label>
                <input id="prenom" {...profilForm.register('prenom')} style={inputStyle} />
                {profilForm.formState.errors.prenom && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{profilForm.formState.errors.prenom.message}</div>
                )}
              </div>
              <div>
                <label htmlFor="nom" style={labelStyle}>Nom</label>
                <input id="nom" {...profilForm.register('nom')} style={inputStyle} />
                {profilForm.formState.errors.nom && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{profilForm.formState.errors.nom.message}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input id="email" type="email" {...profilForm.register('email')} style={inputStyle} />
                {profilForm.formState.errors.email && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{profilForm.formState.errors.email.message}</div>
                )}
              </div>
              <div>
                <label htmlFor="telephone" style={labelStyle}>Telephone</label>
                <input id="telephone" placeholder="+221 77 000 00 00" {...profilForm.register('telephone')} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingProfil}
                style={{ height: 34, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, padding: '0 18px', cursor: savingProfil ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingProfil ? 0.7 : 1 }}
              >
                {savingProfil ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {/* Securite tab */}
        {activeTab === 'securite' && (
          <form
            onSubmit={passwordForm.handleSubmit(savePassword)}
            noValidate
            style={{ background: '#fff', border: `1px solid ${B}`, padding: 18, maxWidth: 400 }}
          >
            {([
              ['ancienMotDePasse', 'Mot de passe actuel', 'current-password'],
              ['nouveauMotDePasse', 'Nouveau mot de passe', 'new-password'],
              ['confirmation', 'Confirmer', 'new-password'],
            ] as const).map(([name, label, autoComplete]) => (
              <div key={name} style={{ marginBottom: 12 }}>
                <label htmlFor={name} style={labelStyle}>{label}</label>
                <input id={name} type="password" autoComplete={autoComplete} {...passwordForm.register(name)} style={inputStyle} />
                {passwordForm.formState.errors[name] && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{passwordForm.formState.errors[name]?.message}</div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="submit"
                disabled={savingPassword}
                style={{ height: 34, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, padding: '0 18px', cursor: savingPassword ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingPassword ? 0.7 : 1 }}
              >
                {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        )}

        {/* Plateforme tab */}
        {activeTab === 'plateforme' && <PlateformeTab />}
      </div>
    </div>
  );
}

// ─── Plateforme Tab ──────────────────────────────────────────────────────────

const PLANS = ['TRIAL', 'STARTER', 'STANDARD', 'PREMIUM'];

const LIMIT_KEYS = [
  { key: 'maxEleves', label: 'Eleves max', description: 'Nombre maximum d\'eleves par ecole' },
  { key: 'maxUsers', label: 'Utilisateurs max', description: 'Nombre total d\'utilisateurs' },
  { key: 'maxClasses', label: 'Classes max', description: 'Nombre maximum de classes' },
  { key: 'maxStorageMb', label: 'Stockage (Mo)', description: 'Espace de stockage en Mo' },
  { key: 'maxBulletinsParMois', label: 'Bulletins / mois', description: 'Generations de bulletins par mois' },
  { key: 'maxWhatsappParJour', label: 'WhatsApp / jour', description: 'Messages WhatsApp par jour' },
];

const B2 = '#e6ebf1';

interface PlatformConfig {
  plans: string[];
  limits: Record<string, Record<string, number>>;
  environment: {
    nodeEnv: string;
    redisConfigured: boolean;
    s3Configured: boolean;
    s3Bucket: string;
    s3Endpoint: string | null;
    whatsappProvider: string | null;
    corsOrigins: string;
    jwtIssuer: string;
    jwtAccessTokenLifespan: string;
  };
}

function PlateformeTab() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/platform/configuration');
      setConfig(res.data);
    } catch (err) {
      setError(messageFromError(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchConfig(); }, [fetchConfig]);

  async function saveLimit(plan: string, key: string, value: number) {
    const cellKey = `${plan}:${key}`;
    setSaving(cellKey);
    try {
      await apiClient.put(`/platform/configuration/limits/${plan}/${key}`, { value });
      setConfig((prev) => {
        if (!prev) return prev;
        const limits = { ...prev.limits };
        if (!limits[plan]) limits[plan] = {};
        limits[plan] = { ...limits[plan], [key]: value };
        return { ...prev, limits };
      });
      toast.success(`Quota mis a jour : ${plan} / ${key} = ${value}`);
    } catch (err) {
      toast.error(messageFromError(err));
    }
    setSaving(null);
    setEditingCell(null);
  }

  function startEdit(plan: string, key: string, currentValue: number) {
    const cellKey = `${plan}:${key}`;
    setEditingCell(cellKey);
    setEditValue(String(currentValue));
  }

  function commitEdit(plan: string, key: string) {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) {
      toast.error('Valeur invalide');
      return;
    }
    void saveLimit(plan, key, val);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chargement de la configuration...</div>;
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Impossible de charger la configuration</div>
        <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>{error}</div>
        <button onClick={() => void fetchConfig()} style={{ height: 30, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Reessayer
        </button>
      </div>
    );
  }

  if (!config) return null;

  const env = config.environment;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quotas par plan */}
      <div style={{ background: '#fff', border: `1px solid ${B2}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B2}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Quotas par plan</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Limites appliquees a chaque etablissement selon son abonnement. Cliquez sur une valeur pour la modifier.</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Quota</th>
              {PLANS.map((p) => (
                <th key={p} style={{ padding: '8px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIMIT_KEYS.map((lk, i) => (
              <tr key={lk.key} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{lk.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{lk.description}</div>
                </td>
                {PLANS.map((plan) => {
                  const cellKey = `${plan}:${lk.key}`;
                  const val = config.limits[plan]?.[lk.key] ?? 0;
                  const isEditing = editingCell === cellKey;
                  const isSaving = saving === cellKey;
                  return (
                    <td key={plan} style={{ padding: '8px 16px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(plan, lk.key);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            style={{ width: 70, height: 28, border: '1px solid #2563eb', textAlign: 'center', fontSize: 12, fontFamily: 'inherit', padding: '0 4px' }}
                          />
                          <button
                            onClick={() => commitEdit(plan, lk.key)}
                            style={{ width: 28, height: 28, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(plan, lk.key, val)}
                          disabled={isSaving}
                          style={{
                            background: val > 0 ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${val > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                            color: val > 0 ? '#16a34a' : '#94a3b8',
                            fontWeight: 700, fontSize: 13, padding: '4px 14px',
                            cursor: 'pointer', fontFamily: 'inherit',
                            opacity: isSaving ? 0.5 : 1,
                          }}
                        >
                          {isSaving ? '...' : val > 0 ? val.toLocaleString('fr-FR') : '—'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Environnement */}
      <div style={{ background: '#fff', border: `1px solid ${B2}`, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Environnement</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <EnvRow label="Mode" value={env.nodeEnv} color={env.nodeEnv === 'production' ? '#16a34a' : '#d97706'} />
          <EnvRow label="Redis" value={env.redisConfigured ? 'Configure' : 'Non configure'} color={env.redisConfigured ? '#16a34a' : '#dc2626'} />
          <EnvRow label="Stockage S3" value={env.s3Configured ? 'Configure' : 'Non configure'} color={env.s3Configured ? '#16a34a' : '#dc2626'} />
          <EnvRow label="Bucket S3" value={env.s3Bucket} />
          <EnvRow label="WhatsApp" value={env.whatsappProvider ?? 'Non configure'} color={env.whatsappProvider ? '#16a34a' : '#94a3b8'} />
          <EnvRow label="JWT Issuer" value={env.jwtIssuer} />
          <EnvRow label="Token TTL" value={env.jwtAccessTokenLifespan} />
          {env.s3Endpoint && <EnvRow label="S3 Endpoint" value={env.s3Endpoint} />}
        </div>
        {env.corsOrigins && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>CORS Origines autorisees</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {env.corsOrigins.split(',').filter(Boolean).map((origin) => (
                <span key={origin} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: '#f1f5f9', color: '#475569', fontFamily: 'monospace' }}>
                  {origin.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', fontSize: 11, color: '#1e40af', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Les variables d&apos;environnement sont en lecture seule. Modifiez-les dans Coolify puis redeployez le backend. Les quotas sont editables directement ici.</span>
      </div>
    </div>
  );
}

function EnvRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color ?? '#0f172a', marginTop: 1 }}>{value}</div>
    </div>
  );
}
