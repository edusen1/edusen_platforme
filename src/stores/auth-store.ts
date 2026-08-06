import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTH_STORAGE_KEY } from '@/lib/api/client';
import type { AuthSession, PlatformRole, SessionUser } from '@/types/auth';

interface AuthState {
  session: AuthSession | null;
  user: SessionUser | null;
  setSession: (session: AuthSession) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      setSession: (session) => set({ session, user: session.user }),
      patchUser: (patch) =>
        set((state) => {
          if (!state.session) return state;
          const user = { ...state.session.user, ...patch };
          return { session: { ...state.session, user }, user };
        }),
      clearSession: () => set({ session: null, user: null }),
    }),
    { name: AUTH_STORAGE_KEY }
  )
);

export function useCurrentRole(): PlatformRole | null {
  return useAuthStore((s) => s.user?.role ?? null);
}

/** Les actions sensibles (archiver un tenant, trancher une demande d'audit) sont réservées au SUPER_ADMIN. */
export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => s.user?.role === 'SUPER_ADMIN');
}
