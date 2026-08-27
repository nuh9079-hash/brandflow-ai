import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { ExecutiveAssistant } from "@/components/assistant/ExecutiveAssistant";
import "./globals.css";

// rebuild: 2026-08-27T19:26:19Z — force fresh build to pick up updated staging env vars

export const metadata: Metadata = {
  title: "BrandFlow AI",
  description: "AI destekli sosyal medya içerik üretim paneli",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AnimatedBackground />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <ClerkProvider>{children}</ClerkProvider>
        </div>
        <ExecutiveAssistant />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fbrandflow3678back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}
