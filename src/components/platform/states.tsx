'use client';

import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { messageFromError } from '@/lib/errors';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/**
 * État vide — n'est affiché QUE lorsque la requête a réussi et renvoyé zéro élément.
 * Une panne serveur doit passer par ErrorState, jamais par ici : c'est le défaut
 * relevé sur le front tenant (« Aucun enfant inscrit » masquant un 503).
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <Inbox className="h-6 w-6 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <div>
        <p className="text-sm font-semibold text-red-700">Impossible de charger ces données</p>
        <p className="mt-1 max-w-md text-sm text-red-600">{messageFromError(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      )}
    </div>
  );
}

/**
 * Section non couverte par le backend. On l'annonce clairement plutôt que
 * d'inventer des données — le défaut de /caisse/paiements.
 */
export function NotAvailableState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
