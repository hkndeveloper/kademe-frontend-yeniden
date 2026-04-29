"use client";

import { PanelRouteContent } from "@/features/panel/page-resolver";

export function PanelRouteRenderer({ routeKey }: { routeKey: string }) {
  return <PanelRouteContent routeKey={routeKey} />;
}

