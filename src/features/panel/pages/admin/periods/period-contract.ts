export type PeriodStatus = "planned" | "active" | "closing" | "completed" | "cancelled" | "passive";

export type PeriodTransition = "activate" | "start_closing" | "cancel_closing" | "complete" | "reopen" | "cancel";

export interface PeriodLifecycleEvent {
  id: number;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  reason?: string | null;
  created_at?: string | null;
  actor?: { id: number; name: string } | null;
}

export interface PeriodItem {
  id: number;
  project_id: number;
  name: string;
  start_date: string;
  end_date: string;
  credit_start_amount: number;
  credit_threshold: number;
  status: PeriodStatus;
  project?: { id: number; name: string; current_period_id?: number | null } | null;
  lifecycle: {
    status: PeriodStatus;
    version: number;
    is_current: boolean;
    is_archive_mode: boolean;
    allowed_transitions: PeriodTransition[];
    write_capabilities: {
      configure_period: boolean;
      create_operations: boolean;
      resolve_operations: boolean;
      archive_correction_required: boolean;
    };
    activated_at?: string | null;
    closing_started_at?: string | null;
    completed_at?: string | null;
    reopened_at?: string | null;
    cancelled_at?: string | null;
    archive_integrity_status?: string | null;
  };
  latest_archive?: PeriodArchive | null;
  lifecycle_events?: PeriodLifecycleEvent[];
}

export interface ClosureCheck {
  code: string;
  count: number;
  message: string;
  severity: "blocker" | "warning";
  resolved: boolean;
}

export interface ClosureReadiness {
  ready: boolean;
  blockers: ClosureCheck[];
  warnings: ClosureCheck[];
  resolved_checks: ClosureCheck[];
  checks: ClosureCheck[];
  calculated_at: string;
  watermark: string;
}

export interface ClosureSummary {
  summary: {
    participants: { total: number; active: number; completed: number; graduated: number; not_completed: number };
    applications: { total: number; pending: number; interview_planned: number; waitlisted: number; accepted: number; rejected: number };
    programs: { total: number; open: number; completed: number; cancelled: number };
    assignments: { total: number; open: number };
    certificates: { total: number };
    materials: { digital_bohca: number; volunteer_opportunities: number; kademe_modules: number };
    kpd: { appointments: number; reports: number };
    financials: { total: number; pending: number; approved: number; paid: number };
    credit_snapshot: { average_credit: number; below_threshold_count: number; threshold: number; total_credit: number };
  };
  readiness: ClosureReadiness;
}

export interface PeriodArchive {
  id: number;
  archive_version: number;
  schema_version: number;
  closed_at?: string | null;
  integrity_hash: string;
  verification_status?: "not_verified" | "verified" | "invalid" | null;
  verified_at?: string | null;
  correction_reason?: string | null;
  notes?: string | null;
  summary?: Record<string, unknown> | null;
}
