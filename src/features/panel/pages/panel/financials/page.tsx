"use client";

import AdminFinancialsPage from "@/features/panel/pages/admin/financials/page";
import ContributorFinancialsPage from "@/features/panel/pages/panel/financials/contributor-page";
import { useAuth } from "@/store/useAuth";

export default function PanelFinancialsPage() {
  const hasAnyPermission = useAuth((s) => s.hasAnyPermission);
  const hasFinancialAdminActions = hasAnyPermission([
    "financial.approve",
    "financial.reject",
    "financial.delete",
    "financial.mark_paid",
  ]);

  if (!hasFinancialAdminActions) {
    return <ContributorFinancialsPage />;
  }

  return <AdminFinancialsPage />;
}
