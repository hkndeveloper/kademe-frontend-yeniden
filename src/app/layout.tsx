import type { Metadata, Viewport } from "next";
import { Inter, Roboto, Urbanist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/shared/auth-provider";
import { AppShell } from "@/components/shared/AppShell";
import { PwaRegister } from "@/components/shared/pwa-register";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const urbanist = Urbanist({ subsets: ["latin", "latin-ext"], variable: "--font-urbanist", weight: ["300", "400", "500", "600", "700", "800", "900"] });
const roboto = Roboto({ subsets: ["latin", "latin-ext"], variable: "--font-roboto", weight: ["300", "400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "KADEME Yönetim Sistemi",
  description: "Öğrenci, mezun ve koordinatörler için yeni nesil kariyer gelişim portalı.",
  applicationName: "KADEME",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KADEME Yönetim Sistemi",
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
    <html lang="tr">
      <body className={`${inter.variable} ${urbanist.variable} ${roboto.variable} flex min-h-screen flex-col bg-background text-foreground antialiased`}>
        <AuthProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
