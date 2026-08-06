'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PlatformSidebar } from '@/components/layout/platform-sidebar';
import { useAuthStore } from '@/stores/auth-store';
import { useDemandesAudit } from '@/hooks/use-platform';
import { authApi } from '@/lib/api/endpoints';
import { isPlatformRole } from '@/types/auth';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const { session, user, patchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('platform-sidebar-collapsed') === 'true');
  }, []);

  // Garde : session valide ET rôle plateforme.
  useEffect(() => {
    const t = setTimeout(() => {
      const current = useAuthStore.getState();
      if (!current.session || !isPlatformRole(current.user?.role)) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [session, router]);

  // Le JWT ne porte pas le nom : on complète l'identité si elle manque.
  useEffect(() => {
    if (!ready || !user || (user.nom && user.prenom)) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        patchUser({
          nom: me.nom ?? me.lastName ?? '',
          prenom: me.prenom ?? me.firstName ?? '',
          email: me.email ?? user.email,
          telephone: me.telephone ?? user.telephone,
        });
      })
      .catch(() => {
        // profil indisponible — la sidebar retombe sur l'email
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, patchUser]);

  const { data: demandes } = useDemandesAudit({ statut: 'EN_ATTENTE' });
  const enAttente = Array.isArray(demandes) ? demandes.length : 0;

  const toggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem('platform-sidebar-collapsed', String(next));
      return next;
    });
  };

  if (!ready || !session) {
    return <div style={{ height: '100vh', background: '#0f172a' }} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ flexShrink: 0 }}>
        <PlatformSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          demandesEnAttente={enAttente}
        />
      </div>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" style={{ padding: 0, width: 264, background: '#0f172a', border: 'none' }}>
          <PlatformSidebar onClose={() => setSidebarOpen(false)} demandesEnAttente={enAttente} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Mobile header with hamburger */}
        <div className="flex lg:hidden" style={{ background: '#0f172a', height: 48, flexShrink: 0, alignItems: 'center', padding: '0 16px', gap: 12 }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Edusen</span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: '#a5b4fc' }}>PLATEFORME</span>
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
