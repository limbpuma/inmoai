"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/lib/trpc";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </SessionProvider>
  );
}
