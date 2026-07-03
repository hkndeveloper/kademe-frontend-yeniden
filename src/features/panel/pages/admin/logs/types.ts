export type ActivityCauser = {
  id?: number;
  name?: string;
  surname?: string;
  role?: string;
};

export type ActivityProperties = {
  ip_address?: unknown;
  path?: unknown;
  route_uri?: unknown;
  status_code?: unknown;
  outcome?: unknown;
  duration_ms?: unknown;
  request_id?: unknown;
  permission_checked?: unknown;
  permission_any_checked?: unknown;
  permission_scope?: unknown;
  domain?: unknown;
  attribute_changes?: unknown;
};

export type ActivityLog = {
  id: number;
  user_id: number | null;
  action: string;
  description: string;
  model_type: string | null;
  model_id: number | null;
  ip_address: string | null;
  created_at: string;
  user?: { name: string; surname: string; role: string } | null;
  log_name?: string | null;
  path?: string | null;
  status_code?: number | null;
  outcome?: string | null;
  duration_ms?: number | null;
  request_id?: string | null;
  permission_checked?: string | null;
  properties?: ActivityProperties | null;
};

export type PaginatedLogs = {
  data: ActivityLog[];
  current_page: number;
  last_page: number;
  total: number;
  per_page?: number;
};

export type LogSummary = {
  total: number;
  success: number;
  failed: number;
  sources: Record<string, number>;
  events: Record<string, number>;
};

export type LogFilterOptions = {
  log_names: string[];
  events: string[];
};

export type LogFilters = {
  search: string;
  log_name: string;
  event: string;
  outcome: string;
  status_code: string;
  date_from: string;
  date_to: string;
};