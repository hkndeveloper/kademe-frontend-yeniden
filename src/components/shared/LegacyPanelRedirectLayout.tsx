"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const legacyPrefixes = ["/admin", "/coordinator", "/staff"];

function targetPanelPath(pathname: string, query: string): string {
  const prefix = legacyPrefixes.find((item) => pathname === item || pathname.startsWith(`${item}/`));
  const suffix = prefix ? pathname.slice(prefix.length) : "";
  const target = `/panel${suffix || "/dashboard"}`;

  return query ? `${target}?${query}` : target;
}

export function LegacyPanelRedirectLayout() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(targetPanelPath(pathname, searchParams.toString()));
  }, [pathname, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
    </div>
  );
}
