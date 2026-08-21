export type StatusTone = "positive" | "pending" | "negative" | "neutral";

const positiveStatuses = new Set([
  "accepted",
  "active",
  "approved",
  "completed",
  "delivered",
  "graduated",
  "interview_passed",
  "open",
  "paid",
  "passed",
  "present",
  "published",
  "resolved",
  "success",
  "valid",
]);

const pendingStatuses = new Set([
  "closing",
  "draft",
  "given",
  "in_progress",
  "interview_planned",
  "pending",
  "planned",
  "reviewed",
  "scheduled",
  "submitted",
  "waiting",
  "waitlisted",
]);

const negativeStatuses = new Set([
  "absent",
  "cancelled",
  "canceled",
  "closed",
  "declined",
  "denied",
  "expired",
  "failed",
  "inactive",
  "interview_failed",
  "invalid",
  "no_show",
  "passive",
  "rejected",
  "unsuccessful",
]);

export function statusTone(status?: string | null): StatusTone {
  const normalizedStatus = status?.trim().toLocaleLowerCase("tr-TR") ?? "";

  if (positiveStatuses.has(normalizedStatus)) return "positive";
  if (pendingStatuses.has(normalizedStatus)) return "pending";
  if (negativeStatuses.has(normalizedStatus)) return "negative";
  return "neutral";
}

const badgeClasses: Record<StatusTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  negative: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
};

const panelChipClasses: Record<StatusTone, string> = {
  positive: "panel-chip-success",
  pending: "panel-chip-info",
  negative: "panel-chip-danger",
  neutral: "",
};

const panelActionClasses: Record<StatusTone, string> = {
  positive: "panel-card-action-success",
  pending: "panel-card-action-info",
  negative: "panel-card-action-danger",
  neutral: "",
};

export function statusBadgeClass(status?: string | null): string {
  return badgeClasses[statusTone(status)];
}

export function panelStatusChipClass(status?: string | null): string {
  return panelChipClasses[statusTone(status)];
}

export function panelStatusActionClass(status?: string | null): string {
  return panelActionClasses[statusTone(status)];
}
