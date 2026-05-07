"use client";

import AdminFinancialsPage from "@/features/panel/pages/admin/financials/page";
import ContributorFinancialsPage from "@/features/panel/pages/panel/financials/contributor-page";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export default function PanelFinancialsPage() {
  const hasAnyPermission = useAuth((s) => s.hasAnyPermission);
  const { hasGlobalScope } = usePermissions();
  const hasFinancialAdminActions = hasAnyPermission([
    "financial.approve",
    "financial.reject",
    "financial.delete",
    "financial.mark_paid",
  ]);
  const hasGlobalFinancialAdminScope = [
    "financial.approve",
    "financial.reject",
    "financial.delete",
    "financial.mark_paid",
  ].some((permission) => hasGlobalScope(permission));

  if (!hasFinancialAdminActions || !hasGlobalFinancialAdminScope) {
    return <ContributorFinancialsPage />;
  }

  return <AdminFinancialsPage />;
}
