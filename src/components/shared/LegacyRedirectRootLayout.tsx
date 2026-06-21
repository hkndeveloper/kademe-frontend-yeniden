import { Suspense, type ReactNode } from "react";
import { LegacyPanelRedirectLayout } from "@/components/shared/LegacyPanelRedirectLayout";

function LegacyRedirectFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF6B00] border-t-transparent"
        aria-hidden
      />
    </div>
  );
}

/** Wraps `useSearchParams` usage (CSR bailout) for legacy `/admin`, `/coordinator`, `/staff` roots. */
export function LegacyRedirectRootLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LegacyRedirectFallback />}>
      <LegacyPanelRedirectLayout>{children}</LegacyPanelRedirectLayout>
    </Suspense>
  );
}
