import { LegacyRedirectRootLayout } from "@/components/shared/LegacyRedirectRootLayout";

export default function AdminLegacyLayout({ children }: { children: React.ReactNode }) {
  return <LegacyRedirectRootLayout>{children}</LegacyRedirectRootLayout>;
}
