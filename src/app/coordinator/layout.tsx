import { LegacyRedirectRootLayout } from "@/components/shared/LegacyRedirectRootLayout";

export default function CoordinatorLegacyLayout({ children }: { children: React.ReactNode }) {
  return <LegacyRedirectRootLayout>{children}</LegacyRedirectRootLayout>;
}
