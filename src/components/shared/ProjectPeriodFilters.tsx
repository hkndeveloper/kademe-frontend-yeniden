"use client";

import { useEffect } from "react";

export interface PeriodOption {
  id: number;
  name: string;
  status?: "planned" | "active" | "closing" | "passive" | "completed" | "cancelled" | string;
  start_date?: string | null;
  end_date?: string | null;
  lifecycle?: {
    is_current?: boolean;
    is_archive_mode?: boolean;
    write_capabilities?: PeriodWriteCapabilities;
  };
}

export interface PeriodWriteCapabilities {
  configure_period: boolean;
  create_operations: boolean;
  resolve_operations: boolean;
  archive_correction_required: boolean;
}

export type PeriodWriteCapability = keyof PeriodWriteCapabilities;

export interface ProjectWithPeriods {
  id: number;
  name: string;
  periods?: PeriodOption[];
  current_period?: PeriodOption | null;
  /** @deprecated Backend compatibility alias; current_period is authoritative. */
  active_period?: PeriodOption | null;
}

interface ProjectPeriodFiltersProps {
  projects: ProjectWithPeriods[];
  selectedProjectId: string;
  selectedPeriodId: string;
  onProjectChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  projectLabel?: string;
  periodLabel?: string;
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
  labelTextClassName?: string;
  syncUrl?: boolean;
}

export function periodsForProject(project?: ProjectWithPeriods): PeriodOption[] {
  if (!project) return [];
  const currentPeriod = project.current_period ?? project.active_period;
  const periods = project.periods?.length ? project.periods : currentPeriod ? [currentPeriod] : [];
  return [...periods].sort((a, b) => {
    if (a.id === currentPeriod?.id && b.id !== currentPeriod?.id) return -1;
    if (b.id === currentPeriod?.id && a.id !== currentPeriod?.id) return 1;
    return String(b.start_date ?? "").localeCompare(String(a.start_date ?? ""));
  });
}

export function defaultPeriodIdForProject(project?: ProjectWithPeriods): string {
  const current = project?.current_period ?? project?.active_period;
  return current?.id ? String(current.id) : "";
}

export function periodOptionById(projects: ProjectWithPeriods[], periodId?: string | number | null): PeriodOption | undefined {
  if (periodId === undefined || periodId === null || periodId === "" || periodId === "all") return undefined;
  const normalizedId = String(periodId);
  return projects.flatMap((project) => periodsForProject(project)).find((period) => String(period.id) === normalizedId);
}

export function periodWriteCapabilities(period?: PeriodOption): PeriodWriteCapabilities | null {
  if (!period) return null;
  if (period.lifecycle?.write_capabilities) return period.lifecycle.write_capabilities;

  const status = period.status;
  const archiveMode = status === "completed" || status === "cancelled";
  return {
    configure_period: status === "planned" || status === "passive" || status === "active",
    create_operations: status === "active",
    resolve_operations: status === "active" || status === "closing",
    archive_correction_required: archiveMode,
  };
}

export function periodHasWriteCapability(period: PeriodOption | undefined, capability: PeriodWriteCapability): boolean {
  return periodWriteCapabilities(period)?.[capability] ?? false;
}

export function isPeriodArchiveMode(period?: PeriodOption): boolean {
  if (!period) return false;
  return period.lifecycle?.is_archive_mode ?? (period.status === "completed" || period.status === "cancelled");
}

export function PeriodArchiveModeNotice({ period }: { period?: PeriodOption }) {
  if (!isPeriodArchiveMode(period)) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <p className="font-semibold">Arşiv modu · salt okunur dönem</p>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        {period?.name} {period?.status === "cancelled" ? "iptal edilmiş" : "tamamlanmış"} bir dönemdir. Dönem kayıtları
        incelenebilir; normal ekleme, düzenleme ve silme işlemleri kapalıdır.
      </p>
    </div>
  );
}

export function ProjectPeriodFilters({
  projects,
  selectedProjectId,
  selectedPeriodId,
  onProjectChange,
  onPeriodChange,
  projectLabel = "Proje",
  periodLabel = "Donem",
  className = "grid grid-cols-1 gap-3 md:grid-cols-2",
  selectClassName = "panel-control",
  labelClassName = "panel-field",
  labelTextClassName = "panel-label",
  syncUrl = true,
}: ProjectPeriodFiltersProps) {
  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId);
  const periods = periodsForProject(selectedProject);
  const selectedPeriod = periods.find((period) => String(period.id) === selectedPeriodId);

  useEffect(() => {
    if (!syncUrl || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (selectedProjectId && selectedProjectId !== "all") url.searchParams.set("project_id", selectedProjectId);
    else url.searchParams.delete("project_id");
    if (selectedPeriodId && selectedPeriodId !== "all") url.searchParams.set("period_id", selectedPeriodId);
    else url.searchParams.delete("period_id");

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.replaceState(null, "", nextUrl);
  }, [selectedPeriodId, selectedProjectId, syncUrl]);

  return (
    <div className={className}>
      <label className={labelClassName}>
        <span className={labelTextClassName}>{projectLabel}</span>
        <select
          value={selectedProjectId}
          onChange={(event) => onProjectChange(event.target.value)}
          className={selectClassName}
        >
          <option value="all">Tum projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClassName}>
        <span className={labelTextClassName}>{periodLabel}</span>
        <select
          value={selectedPeriodId}
          onChange={(event) => onPeriodChange(event.target.value)}
          disabled={selectedProjectId === "all" || periods.length === 0}
          className={selectClassName}
        >
          <option value="all">{selectedProjectId === "all" ? "Proje secince donem filtrelenir" : "Tum donemler"}</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}{period.id === (selectedProject?.current_period ?? selectedProject?.active_period)?.id ? " (guncel)" : period.status === "completed" ? " (tamamlandi)" : ""}
            </option>
          ))}
        </select>
      </label>
      {isPeriodArchiveMode(selectedPeriod) ? (
        <div className="col-span-full"><PeriodArchiveModeNotice period={selectedPeriod} /></div>
      ) : null}
    </div>
  );
}
