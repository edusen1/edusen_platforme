'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authApi } from '@/lib/api/endpoints';
import { messageFromError } from '@/lib/errors';

const schema = z
  .object({
    ancienMotDePasse: z.string().min(1, 'Mot de passe actuel requis'),
    nouveauMotDePasse: z.string().min(8, 'Minimum 8 caractères'),
    confirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });

type Form = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setIsLoading(true);
    setFormError(null);
    try {
      await authApi.changePassword({
        ancienMotDePasse: data.ancienMotDePasse,
        nouveauMotDePasse: data.nouveauMotDePasse,
      });
      toast.success('Mot de passe modifié');
      router.push('/dashboard');
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (name: keyof Form, label: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        type="password"
        autoComplete={autoComplete}
        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register(name)}
      />
      {errors[name] && <p className="text-xs text-red-500">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-900">Changer le mot de passe</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vous devez définir un nouveau mot de passe avant de continuer.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
          {field('ancienMotDePasse', 'Mot de passe actuel', 'current-password')}
          {field('nouveauMotDePasse', 'Nouveau mot de passe', 'new-password')}
          {field('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}

          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
