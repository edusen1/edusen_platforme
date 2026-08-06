'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { TENANT_PLANS, type Tenant, type TenantPayload } from '@/types/platform';

const B = '#e6ebf1';

const schema = z.object({
  nom: z.string().min(1, "Nom de l'etablissement requis"),
  slug: z.string().optional(),
  emailContact: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  plan: z.string().optional(),
  durationMonths: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) > 0), 'Nombre de mois invalide'),
  initialAdminEmail: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  initialAdminTelephone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', height: 38, border: '1px solid #d9e0e8', background: '#fff', color: '#0f172a', fontSize: 13, padding: '0 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const err: React.CSSProperties = { fontSize: 11, color: '#dc2626', marginTop: 2 };

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant?: Tenant | null;
  isSubmitting: boolean;
  onSubmit: (payload: TenantPayload) => void;
}) {
  const isEdit = Boolean(tenant);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'TRIAL' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nom: tenant?.nom ?? '',
      slug: tenant?.slug ?? '',
      emailContact: tenant?.emailContact ?? '',
      telephone: tenant?.telephone ?? '',
      adresse: tenant?.adresse ?? '',
      plan: tenant?.plan ?? 'TRIAL',
      durationMonths: '',
      initialAdminEmail: '',
      initialAdminTelephone: '',
    });
    setLogoPreview(tenant?.logoUrl ?? '');
  }, [open, tenant, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = (values: FormValues) => {
    const clean = <T,>(v: T | '' | undefined): T | undefined =>
      v === '' || v === undefined ? undefined : v;
    const months = values.durationMonths ? Number(values.durationMonths) : undefined;
    onSubmit({
      nom: values.nom,
      slug: clean(values.slug),
      emailContact: clean(values.emailContact),
      telephone: clean(values.telephone),
      adresse: clean(values.adresse),
      logoUrl: logoPreview || undefined,
      plan: clean(values.plan),
      durationMonths: months,
      ...(isEdit
        ? {}
        : {
            initialAdminEmail: clean(values.initialAdminEmail),
            initialAdminTelephone: clean(values.initialAdminTelephone),
          }),
    });
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)' }} onClick={() => onOpenChange(false)} />
      <div style={{ position: 'relative', width: 520, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {isEdit ? "Modifier l'etablissement" : 'Nouvel etablissement'}
          </div>
          <button onClick={() => onOpenChange(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={form.handleSubmit(submit)} noValidate style={{ padding: 24 }}>
          {/* Logo */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 64, height: 64, border: `1px solid #d9e0e8`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                )}
              </div>
              <div>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoChange} style={{ display: 'none' }} />
                <button type="button" onClick={() => logoInputRef.current?.click()} style={{ height: 30, padding: '0 12px', border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'block', marginBottom: 4 }}>
                  Choisir une image
                </button>
                {logoPreview && (
                  <button type="button" onClick={() => setLogoPreview('')} style={{ height: 26, padding: '0 10px', border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                    Supprimer
                  </button>
                )}
                <div style={{ marginTop: 2, fontSize: 10, color: '#94a3b8' }}>PNG, JPEG, WEBP, SVG — max 2 Mo</div>
              </div>
            </div>
          </div>

          {/* Nom */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Nom de l&apos;etablissement *</label>
            <input {...form.register('nom')} placeholder="Lycee Seydi Jamil" style={inp} />
            {form.formState.errors.nom && <div style={err}>{form.formState.errors.nom.message}</div>}
          </div>

          {/* Slug */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Identifiant court</label>
            <input {...form.register('slug')} placeholder="Genere automatiquement si vide" style={inp} />
          </div>

          {/* Email + Telephone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Email de contact</label>
              <input {...form.register('emailContact')} type="email" placeholder="contact@ecole.sn" style={inp} />
              {form.formState.errors.emailContact && <div style={err}>{form.formState.errors.emailContact.message}</div>}
            </div>
            <div>
              <label style={lbl}>Telephone</label>
              <input {...form.register('telephone')} placeholder="+221 77 000 00 00" style={inp} />
            </div>
          </div>

          {/* Adresse */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Adresse</label>
            <input {...form.register('adresse')} placeholder="Dakar, Senegal" style={inp} />
          </div>

          {/* Plan + Durée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Plan</label>
              <select
                value={form.watch('plan') ?? 'TRIAL'}
                onChange={(e) => form.setValue('plan', e.target.value, { shouldDirty: true })}
                style={{ ...inp, cursor: 'pointer' }}
              >
                {TENANT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Duree (mois)</label>
              <input {...form.register('durationMonths')} type="number" placeholder="12" style={inp} />
              {form.formState.errors.durationMonths && <div style={err}>{form.formState.errors.durationMonths.message}</div>}
            </div>
          </div>

          {/* Admin initial — creation uniquement */}
          {!isEdit && (
            <div style={{ background: '#f8fafc', border: `1px solid ${B}`, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Administrateur initial</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                Un compte administrateur sera cree pour l&apos;etablissement. Les identifiants s&apos;afficheront apres la creation.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input {...form.register('initialAdminEmail')} type="email" placeholder="admin@ecole.sn" style={inp} />
                  {form.formState.errors.initialAdminEmail && <div style={err}>{form.formState.errors.initialAdminEmail.message}</div>}
                </div>
                <div>
                  <label style={lbl}>Telephone</label>
                  <input {...form.register('initialAdminTelephone')} placeholder="+221 77 000 00 00" style={inp} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: `1px solid ${B}` }}>
            <button type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}
              style={{ height: 36, border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              style={{ height: 36, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, padding: '0 16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
