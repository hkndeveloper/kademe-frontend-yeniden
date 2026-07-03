import type { ActivityCauser, ActivityLog, ActivityProperties, LogFilters } from "./types";

export const actionColors: Record<string, string> = {
  viewed: "bg-slate-100 text-slate-700",
  created: "bg-green-500/10 text-green-600",
  updated: "bg-blue-500/10 text-blue-600",
  deleted: "bg-red-500/10 text-red-600",
  forbidden: "bg-amber-500/10 text-amber-700",
  failed: "bg-red-500/10 text-red-600",
  registered: "bg-green-500/10 text-green-600",
  login: "bg-indigo-500/10 text-indigo-600",
  login_failed: "bg-red-500/10 text-red-600",
  login_blocked: "bg-amber-500/10 text-amber-700",
  logout: "bg-gray-500/10 text-gray-600",
  password_reset_requested: "bg-blue-500/10 text-blue-600",
  password_reset: "bg-green-500/10 text-green-600",
  password_reset_failed: "bg-red-500/10 text-red-600",
  assigned: "bg-amber-500/10 text-amber-700",
  status_changed: "bg-purple-500/10 text-purple-600",
};

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export function normalizeActivityRow(raw: Record<string, unknown>): ActivityLog {
  const causer = raw.causer as ActivityCauser | undefined;
  const properties = raw.properties as ActivityProperties | undefined;
  const event = raw.event != null && String(raw.event).length > 0 ? String(raw.event) : null;
  const path = stringOrNull(properties?.path) ?? stringOrNull(properties?.route_uri);

  return {
    id: Number(raw.id),
    user_id: causer?.id ?? null,
    action: event ?? String(raw.description ?? "log"),
    description: String(raw.description ?? ""),
    model_type: stringOrNull(raw.subject_type),
    model_id: numberOrNull(raw.subject_id),
    ip_address: stringOrNull(properties?.ip_address) ?? stringOrNull(raw.ip_address),
    created_at: String(raw.created_at ?? ""),
    user: causer
      ? {
          name: String(causer.name ?? ""),
          surname: String(causer.surname ?? ""),
          role: String(causer.role ?? ""),
        }
      : null,
    log_name: stringOrNull(raw.log_name),
    path,
    status_code: numberOrNull(properties?.status_code),
    outcome: stringOrNull(properties?.outcome),
    duration_ms: numberOrNull(properties?.duration_ms),
    request_id: stringOrNull(properties?.request_id),
    permission_checked: stringOrNull(properties?.permission_checked),
    properties: properties ?? null,
  };
}

export function compactLogSource(source?: string | null): string {
  if (!source) return "system";
  return source.replaceAll("_", " ");
}

export function exportableFilterParams(filters: LogFilters): Record<string, string | number | undefined> {
  return {
    search: filters.search.trim() || undefined,
    log_name: filters.log_name || undefined,
    event: filters.event || undefined,
    outcome: filters.outcome || undefined,
    status_code: filters.status_code ? Number(filters.status_code) : undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  };
}