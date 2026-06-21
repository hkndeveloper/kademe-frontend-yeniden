import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/shared/auth-provider";
import { AppShell } from "@/components/shared/AppShell";
import { PwaRegister } from "@/components/shared/pwa-register";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "KADEME Yönetim Sistemi",
  description: "Öğrenci, mezun ve koordinatörler için yeni nesil kariyer gelişim portalı.",
  applicationName: "KADEME",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KADEME",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/branding/kademe-logo-turuncu.svg",
    apple: "/branding/kademe-logo-turuncu.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.className} flex min-h-screen flex-col bg-background text-foreground antialiased`}>
        <AuthProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
