'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Confirmation applicative — jamais `window.confirm`, qui bloque le rendu
 * et sort du design system.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  tone = 'default',
  requireText,
  isLoading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  /** Si fourni, l'utilisateur doit ressaisir exactement ce texte. */
  requireText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const blocked = Boolean(requireText) && typed.trim() !== requireText;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setTyped('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>}
        </DialogHeader>

        {requireText && (
          <div className="space-y-1.5 py-2">
            <Label>
              Saisissez <span className="font-semibold text-slate-900">{requireText}</span> pour confirmer
            </Label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={blocked || isLoading}
            className={
              tone === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
