export interface ProgramCredit {
  deducted: boolean;
  deduction_amount: number;
  deducted_at?: string | null;
  restored: boolean;
  restore_amount: number;
  restored_at?: string | null;
  net_amount: number;
}

export interface ProgramAttendance {
  id: number;
  method?: string | null;
  is_valid: boolean;
  recorded_at?: string | null;
}

export interface StudentProgram {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  location_place_name?: string | null;
  location_place_address?: string | null;
  location_place_id?: string | null;
  location_place_provider?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  radius_meters?: number | null;
  start_at: string;
  end_at?: string | null;
  status: "scheduled" | "active" | "completed";
  credit_deduction?: number | null;
  attendance_status: "present" | "invalid" | "absent" | "pending";
  attendance?: ProgramAttendance | null;
  credit?: ProgramCredit;
  feedback_submitted?: boolean;
  participation?: { id: number; credit: number } | null;
  project?: { id: number; name: string; slug?: string; type?: string } | null;
  period?: { id: number; name: string } | null;
}

export type ProgramFilter = "all" | "upcoming" | "completed" | "attended" | "missed";

export const programStatusLabels: Record<StudentProgram["status"], string> = {
  scheduled: "Planlandı",
  active: "Aktif",
  completed: "Tamamlandı",
};

export const attendanceLabels: Record<StudentProgram["attendance_status"], string> = {
  present: "Katıldın",
  invalid: "Geçersiz yoklama",
  absent: "Katılım yok",
  pending: "Yoklama bekleniyor",
};

export const attendanceStyles: Record<StudentProgram["attendance_status"], string> = {
  present: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  invalid: "border-red-500/20 bg-red-500/10 text-red-700",
  absent: "border-red-500/20 bg-red-500/10 text-red-700",
  pending: "border-blue-500/20 bg-blue-500/10 text-blue-700",
};

export const programFilters: Array<{ value: ProgramFilter; label: string }> = [
  { value: "all", label: "Tüm Programlar" },
  { value: "upcoming", label: "Yaklaşan/Aktif" },
  { value: "completed", label: "Geçmiş" },
  { value: "attended", label: "Katıldıklarım" },
  { value: "missed", label: "Puan Kesilenler" },
];

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

export function formatProgramDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatProgramTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hasProgramCoordinates(program: StudentProgram): boolean {
  return (
    program.latitude !== null &&
    program.latitude !== undefined &&
    program.latitude !== "" &&
    program.longitude !== null &&
    program.longitude !== undefined &&
    program.longitude !== ""
  );
}

export function programCreditText(program: StudentProgram): string {
  const credit = program.credit;
  if (!credit?.deducted && program.status !== "completed") return "Puan işlemi yok";
  if (!credit?.deducted && program.status === "completed") return "Puan kesintisi yok";
  if (!credit) return "Puan işlemi yok";
  if (credit.restored) return `-${credit.deduction_amount} kesildi, +${credit.restore_amount} iade edildi`;
  return `-${credit.deduction_amount} puan kesildi`;
}
