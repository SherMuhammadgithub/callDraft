// Client-side providers — wraps the app in HeroUI + toast notifications.
// HeroUI needs the Next.js router for its internal Link handling.
"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ToastProvider } from "@heroui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    // Pass router.push so HeroUI components can do client-side navigation
    <HeroUIProvider navigate={router.push}>
      <ToastProvider placement="top-center" />
      {children}
    </HeroUIProvider>
  );
}
