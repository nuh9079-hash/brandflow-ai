"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

const publicPrefixes = ["/sign-in", "/sign-up"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicAuthPage = publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPublicAuthPage) return children;

  return (
    <>
      <Sidebar />
      <div className="min-h-screen pt-16">{children}</div>
    </>
  );
}
