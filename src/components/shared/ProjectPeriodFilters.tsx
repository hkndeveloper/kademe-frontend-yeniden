"use client";

export interface PeriodOption {
  id: number;
  name: string;
  status?: "active" | "passive" | "completed" | string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProjectWithPeriods {
  id: number;
  name: string;
  periods?: PeriodOption[];
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
}

export function periodsForProject(project?: ProjectWithPeriods): PeriodOption[] {
  if (!project) return [];
  const periods = project.periods?.length ? project.periods : project.active_period ? [project.active_period] : [];
  return [...periods].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return String(b.start_date ?? "").localeCompare(String(a.start_date ?? ""));
  });
}

export function defaultPeriodIdForProject(project?: ProjectWithPeriods): string {
  const active = project?.periods?.find((period) => period.status === "active") ?? project?.active_period;
  return active?.id ? String(active.id) : "";
}

export function ProjectPeriodFilters({
  projects,
  selectedProjectId,
  selectedPeriodId,
  onProjectChange,
  onPeriodChange,
  projectLabel = "Proje",
  periodLabel = "Donem",
  className = "grid grid-cols-1 gap-4 md:grid-cols-2",
  selectClassName = "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20",
}: ProjectPeriodFiltersProps) {
  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId);
  const periods = periodsForProject(selectedProject);

  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{projectLabel}</span>
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
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{periodLabel}</span>
        <select
          value={selectedPeriodId}
          onChange={(event) => onPeriodChange(event.target.value)}
          disabled={selectedProjectId === "all" || periods.length === 0}
          className={selectClassName}
        >
          <option value="all">{selectedProjectId === "all" ? "Proje secince donem filtrelenir" : "Tum donemler"}</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
