"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Toasts: bottom right, auto-dismiss after 4 s, paused on hover */}
      <Toaster position="bottom-right" duration={4000} />
    </QueryClientProvider>
  );
}
