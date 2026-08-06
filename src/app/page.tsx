'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(useAuthStore.getState().session ? '/dashboard' : '/login');
    }, 50);
    return () => clearTimeout(t);
  }, [router]);

  return <div style={{ height: '100vh', background: '#0f172a' }} />;
}
