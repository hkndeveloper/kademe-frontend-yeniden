import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/shared/auth-provider";
import { AppShell } from "@/components/shared/AppShell";
import { PwaRegister } from "@/components/shared/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KADEME Yönetim Sistemi",
  description: "Ogrenci, Mezun ve Koordinatorler icin yeni nesil kariyer gelisim portali.",
  applicationName: "KADEME",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="scroll-smooth">
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground flex flex-col`}>
        <AuthProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
