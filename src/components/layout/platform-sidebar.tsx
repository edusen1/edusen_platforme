'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/endpoints';
import { initials, personName } from '@/lib/format';

const SIDEBAR_W = 264;
const SIDEBAR_COLLAPSED_W = 72;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}
interface NavSection {
  label?: string;
  items: NavItem[];
}

export function PlatformSidebar({
  collapsed = false,
  onToggleCollapse,
  onClose,
  demandesEnAttente = 0,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  demandesEnAttente?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();

  const sections: NavSection[] = [
    {
      items: [
        { label: 'Tableau de bord', href: '/dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
      ],
    },
    {
      label: 'GESTION',
      items: [
        { label: 'Établissements', href: '/tenants', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg> },
        { label: 'Utilisateurs', href: '/utilisateurs', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { label: 'Abonnements', href: '/abonnements', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
        { label: 'Paiements', href: '/paiements', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
      ],
    },
    {
      label: 'SUPERVISION',
      items: [
        { label: 'Analytics', href: '/analytics', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
        { label: 'Supervision', href: '/supervision', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
        { label: "Journal d'audit", href: '/audit', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/><circle cx="18" cy="18" r="4"/><path d="m20.5 20.5-1.5-1.5"/></svg> },
        {
          label: "Demandes d'audit",
          href: '/demandes-audit',
          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>,
          badge: demandesEnAttente || undefined,
        },
      ],
    },
    {
      label: 'COMPTE',
      items: [
        { label: 'Paramètres', href: '/parametres', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9"/></svg> },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // même si l'appel échoue, on nettoie la session locale
    }
    clearSession();
    router.replace('/login');
  };

  const displayName = personName(user, '');

  return (
    <aside style={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W, flexShrink: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', height: '100%', transition: 'width 180ms ease', overflow: 'hidden' }}>
      {/* Logo section */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={onToggleCollapse ? (collapsed ? 'Développer la sidebar' : 'Réduire la sidebar') : undefined}
        aria-label={onToggleCollapse ? (collapsed ? 'Développer la sidebar' : 'Réduire la sidebar') : undefined}
        style={{ width: '100%', padding: collapsed ? '16px 18px' : '16px 14px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, border: 'none', borderBottom: '1px solid #1e293b', background: 'transparent', minHeight: 64, cursor: onToggleCollapse ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}
      >
        {/* Logo avatar */}
        <div style={{ width: 36, height: 36, flexShrink: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 6, border: '1px solid #334155' }}>
          <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>E</span>
        </div>
        {/* Name + tag */}
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, lineHeight: 1.25, display: 'block' }}>Edusen</span>
            <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', display: 'block' }}>PLATEFORME</span>
          </div>
        )}
      </button>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', scrollbarWidth: 'none' }}>
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && !collapsed && (
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '.08em', padding: '10px 10px 4px' }}>
                {section.label}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 10,
                      padding: collapsed ? '10px 8px' : '8px 10px',
                      color: isActive ? '#fff' : '#94a3b8',
                      fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                      background: isActive ? '#1d4ed8' : 'transparent',
                      borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: isActive ? '#fff' : '#64748b', lineHeight: 0, flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {!collapsed && item.badge ? <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center' }}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: collapsed ? '10px 8px' : '12px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: collapsed ? 8 : 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: collapsed ? 0 : 10, flex: collapsed ? 'none' : 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, background: '#1e293b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {initials(displayName || user?.email, 'E')}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || user?.email || 'Compte plateforme'}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {user?.role === 'SUPER_ADMIN' ? 'Super administrateur' : 'Gestionnaire'}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Déconnexion"
          aria-label="Déconnexion"
          style={{ width: 32, height: 32, background: 'transparent', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
