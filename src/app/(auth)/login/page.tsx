'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/endpoints';
import { decodeJwt } from '@/lib/auth/decode';
import { loginErrorMessage } from '@/lib/errors';
import { isPlatformRole, type PlatformRole } from '@/types/auth';

const loginSchema = z.object({
  login: z.string().min(1, 'Email requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

const TENANT_REDIRECT =
  "Cet espace est réservé à l'administration de la plateforme. Les comptes d'établissement se connectent sur l'espace Edusen.";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { setSession, patchUser } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const { accessToken, refreshToken, passwordChangeRequired } = await authApi.login(data);
      const payload = decodeJwt(accessToken);
      const role = payload.role;

      // Garde de rôle : un compte d'établissement n'entre pas ici.
      if (!isPlatformRole(role)) {
        setFormError(TENANT_REDIRECT);
        return;
      }

      const allRoles = Array.isArray(payload.allRoles)
        ? (payload.allRoles as string[]).filter(isPlatformRole)
        : [];

      setSession({
        accessToken,
        refreshToken,
        expiresAt: ((payload.exp as number) ?? 0) * 1000,
        user: {
          id: (payload.userId as string) ?? (payload.sub as string) ?? '',
          email: (payload.email as string) ?? '',
          telephone: (payload.telephone as string) ?? undefined,
          // Le JWT ne porte ni nom ni prénom — complétés juste après via /v1/auth/me.
          nom: '',
          prenom: '',
          role: role as PlatformRole,
          allRoles: allRoles.length ? (allRoles as PlatformRole[]) : [role as PlatformRole],
        },
      });

      // Identité complète : sans ça, l'appbar afficherait un nom vide.
      try {
        const me = await authApi.me();
        patchUser({
          nom: me.nom ?? me.lastName ?? '',
          prenom: me.prenom ?? me.firstName ?? '',
          email: me.email ?? '',
          telephone: me.telephone ?? undefined,
        });
      } catch {
        // Profil indisponible : on garde la session, le nom sera retenté au chargement du layout.
      }

      if (passwordChangeRequired) {
        router.push('/change-password');
        return;
      }

      toast.success('Connexion réussie');
      router.push('/dashboard');
    } catch (error) {
      setFormError(loginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', height: '100vh', background: '#fff' }}>
      {/* Left panel — photo */}
      <div style={{ position: 'relative', background: '#0f172a' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=900&q=80"
          alt="Plateforme"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,.2) 0%, rgba(15,23,42,.82) 100%)' }} />

        {/* Logo top-left */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, padding: '36px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: 40, height: 40, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-.02em' }}>E</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Edusen</span>
          <span style={{ marginLeft: 8, background: 'rgba(255,255,255,.12)', padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '.08em' }}>PLATEFORME</span>
        </div>

        {/* Tagline bottom-left */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '44px' }}>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-.02em', maxWidth: 380 }}>
            L&apos;administration de la plateforme, en un seul endroit.
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 15, marginTop: 14, maxWidth: 360, lineHeight: 1.55 }}>
            Établissements, supervision, audit et configuration — centralisés.
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-.02em' }}>Connexion</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 7 }}>Accédez à l&apos;espace d&apos;administration.</div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 0 }}>
          {/* Email */}
          <div style={{ marginTop: 34 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 7 }}>
              Email
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${errors.login ? '#dc2626' : '#d9e0e8'}`, padding: '0 13px', height: 46, background: '#fff' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <input
                {...register('login')}
                placeholder="admin@edusen.sn"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent' }}
              />
            </div>
            {errors.login && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.login.message}</p>}
          </div>

          {/* Password */}
          <div style={{ marginTop: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 7 }}>
              Mot de passe
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${errors.password ? '#dc2626' : '#d9e0e8'}`, padding: '0 13px', height: 46, background: '#fff' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent', letterSpacing: showPassword ? 'normal' : '.18em' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
                {showPassword
                  ? <EyeOff size={17} color="#94a3b8" />
                  : <Eye size={17} color="#94a3b8" />
                }
              </button>
            </div>
            {errors.password && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.password.message}</p>}
          </div>

          {/* Form-level error */}
          {formError && (
            <div style={{ marginTop: 16, border: '1px solid #fca5a5', background: '#fef2f2', padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#b91c1c' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{ marginTop: 26, height: 48, width: '100%', border: 'none', background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isLoading ? <><Loader2 size={16} className="animate-spin" />Connexion...</> : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Accès réservé aux administrateurs de la plateforme.
        </div>
      </div>
    </div>
  );
}
