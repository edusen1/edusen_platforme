'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { isServerDown } from '@/lib/errors';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            // Le backend renvoie des 503 intermittents : on retente les lectures,
            // mais jamais une erreur métier (4xx).
            retry: (failureCount, error) => isServerDown(error) && failureCount < 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
