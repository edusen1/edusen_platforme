'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';

/**
 * Affiche les identifiants générés à la création d'un compte.
 * Sans cet écran, l'administrateur n'a aucun moyen de transmettre l'accès —
 * c'est exactement ce qui manque à la création d'un professeur sur le front tenant.
 */
export function CredentialsPanel({
  identifiant,
  motDePasse,
  onDismiss,
}: {
  identifiant: string;
  motDePasse?: string | null;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const text = motDePasse
    ? `Identifiant : ${identifiant}\nMot de passe : ${motDePasse}`
    : `Identifiant : ${identifiant}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible — l'utilisateur peut sélectionner le texte
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <KeyRound size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900">Compte créé</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            {motDePasse
              ? 'Transmettez ces identifiants — le mot de passe ne sera plus affiché.'
              : "Le mot de passe n'est pas renvoyé par le serveur. Utilisez « Mot de passe oublié » pour l'initialiser."}
          </p>

          <dl className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3 font-mono text-xs">
            <div className="flex gap-2">
              <dt className="shrink-0 text-emerald-700">Identifiant :</dt>
              <dd className="min-w-0 break-all font-semibold text-emerald-900">{identifiant}</dd>
            </div>
            {motDePasse && (
              <div className="flex gap-2">
                <dt className="shrink-0 text-emerald-700">Mot de passe :</dt>
                <dd className="min-w-0 break-all font-semibold text-emerald-900">{motDePasse}</dd>
              </div>
            )}
          </dl>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
