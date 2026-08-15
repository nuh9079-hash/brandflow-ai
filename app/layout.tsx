import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import "./globals.css";

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
      </body>
    </html>
  );
}
