'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

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
        {activeTab === 'plateforme' && (
          <div style={{ background: '#fff', border: `1px solid ${B}`, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Parametres globaux de la plateforme — non disponibles</div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Branding, quotas par plan et politique de retention n&apos;ont pas encore d&apos;endpoint cote backend. Cette section sera activee des que /platform/configuration existera.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
