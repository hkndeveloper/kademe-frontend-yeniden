"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, FileText, GraduationCap, Loader2, Mail, Phone, Search, Star, Users, X, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface ParticipantItem {
  id: number;
  status: string;
  graduation_status?: string | null;
  graduation_note?: string | null;
  credit?: number | null;
  enrolled_at?: string | null;
  graduated_at?: string | null;
  project: {
    id: number;
    name: string;
  };
  period?: {
    id: number | null;
    name: string | null;
  } | null;
  user: {
    id: number;
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    university?: string | null;
    department?: string | null;
    class_year?: string | null;
    hometown?: string | null;
    status?: string | null;
    profile_photo?: string | null;
    public_profile_visible?: boolean;
    public_photo_visible?: boolean;
    public_alumni_visible?: boolean;
    cv?: {
      has_digital_cv?: boolean;
      digital_cv_data?: Record<string, unknown> | null;
      linkedin_url?: string | null;
      github_url?: string | null;
    } | null;
  };
}

interface ParticipantsResponse {
  projects: Project[];
  summary: {
    total: number;
    active: number;
    graduates: number;
    average_credit: number;
  };
  participants: ParticipantItem[];
}

export default function PanelParticipantsPage() {
  const { canAccessProject, hasPermission, hasAnyPermission } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("status") ?? "all";
  });
  const [cvParticipant, setCvParticipant] = useState<ParticipantItem | null>(null);
  const [cvLoadingId, setCvLoadingId] = useState<number | null>(null);
  const [graduationLoadingId, setGraduationLoadingId] = useState<number | null>(null);
  const [visibilityLoadingId, setVisibilityLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    graduates: 0,
    average_credit: 0,
  });

  useEffect(() => {
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id") ?? "all";

    const fetchParticipants = async () => {
      try {
        const response = await api.get<ParticipantsResponse>("/panel/participants", {
          timeout: 30000,
          params: {
            project_id: initialProjectId !== "all" ? initialProjectId : undefined,
            period_id: new URLSearchParams(window.location.search).get("period_id") ?? undefined,
          },
        });
        const projectItems = response.data.projects ?? [];
        setProjects(projectItems);
        const initialPeriodId = new URLSearchParams(window.location.search).get("period_id");
        if (initialProjectId !== "all" && !initialPeriodId) {
          const project = projectItems.find((item) => String(item.id) === initialProjectId);
          setPeriodFilter(defaultPeriodIdForProject(project) || "all");
        }
        setParticipants(response.data.participants ?? []);
        setSummary(response.data.summary);
      } catch (error) {
        console.error("Katilimci listesi yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void fetchParticipants();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const selectedProjectName = useMemo(
    () => projects.find((project) => String(project.id) === projectFilter)?.name,
    [projectFilter, projects]
  );

  const cvEntries = useMemo(() => {
    const data = cvParticipant?.user.cv?.digital_cv_data ?? {};
    return Object.entries(data).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== "";
    });
  }, [cvParticipant]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const fullName = `${participant.user.name} ${participant.user.surname}`.toLowerCase();
      const searchableText = `${fullName} ${participant.user.email ?? ""} ${participant.user.university ?? ""} ${participant.user.department ?? ""}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesProject = projectFilter === "all" || String(participant.project.id) === projectFilter;
      const matchesPeriod = periodFilter === "all" || String(participant.period?.id ?? "") === periodFilter;
      const matchesStatus =
        statusFilter === "all" ||
        participant.status === statusFilter ||
        participant.graduation_status === statusFilter;

      return matchesSearch && matchesProject && matchesPeriod && matchesStatus;
    });
  }, [participants, periodFilter, projectFilter, searchTerm, statusFilter]);

  const manageableIdsInView = useMemo(() => {
    return filteredParticipants
      .filter(
        (p) =>
          hasPermission("projects.participants.manage") && canAccessProject("projects.participants.manage", p.project.id),
      )
      .map((p) => p.id);
  }, [filteredParticipants, hasPermission, canAccessProject]);

  const participantIds = useMemo(() => new Set(participants.map((participant) => participant.id)), [participants]);
  const selectedIdsInDataset = useMemo(
    () => selectedIds.filter((id) => participantIds.has(id)),
    [participantIds, selectedIds],
  );

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllManageableInView = () => setSelectedIds([...manageableIdsInView]);

  const clearSelection = () => setSelectedIds([]);

  const openCvDetails = async (participant: ParticipantItem) => {
    setCvLoadingId(participant.id);
    setMessage("");
    try {
      const response = await api.get<{ participant: ParticipantItem }>(`/panel/participants/${participant.id}/cv`, {
        timeout: 30000,
      });
      setCvParticipant({
        ...participant,
        user: {
          ...participant.user,
          ...(response.data.participant?.user ?? {}),
          cv: response.data.participant?.user?.cv ?? participant.user.cv,
        },
      });
    } catch (error) {
      console.error("CV bilgisi yuklenemedi", error);
      setMessage("CV bilgisi yuklenemedi.");
    } finally {
      setCvLoadingId(null);
    }
  };

  const refreshParticipants = async () => {
    const response = await api.get<ParticipantsResponse>("/panel/participants", {
      timeout: 30000,
      params: {
        project_id: projectFilter !== "all" ? projectFilter : undefined,
        period_id: periodFilter !== "all" ? periodFilter : undefined,
        status: !["all", "graduated", "completed"].includes(statusFilter) ? statusFilter : undefined,
        graduation_status: ["graduated", "completed"].includes(statusFilter) ? statusFilter : undefined,
        search: searchTerm || undefined,
      },
    });
    setProjects(response.data.projects ?? []);
    setParticipants(response.data.participants ?? []);
    setSummary(response.data.summary);
  };

  const updateGraduationStatus = async (
    participant: ParticipantItem,
    graduationStatus: "completed" | "graduated" | "not_completed",
  ) => {
    const note =
      graduationStatus === "not_completed"
        ? window.prompt("Tamamlayamama gerekcesini yazin")?.trim()
        : window.prompt("Not eklemek ister misiniz? Bos birakabilirsiniz.")?.trim();

    if (graduationStatus === "not_completed" && !note) {
      setMessage("Tamamlayamadi durumu icin gerekce zorunludur.");
      return;
    }

    setGraduationLoadingId(participant.id);
    setMessage("");
    try {
      const response = await api.patch(`/panel/participants/${participant.id}/graduation`, {
        graduation_status: graduationStatus,
        graduation_note: note || undefined,
      });
      setMessage(response.data?.message ?? "Katilimci durumu guncellendi.");
      await refreshParticipants();
    } catch (error) {
      console.error("Mezuniyet durumu guncellenemedi", error);
      setMessage("Mezuniyet durumu guncellenemedi.");
    } finally {
      setGraduationLoadingId(null);
    }
  };

  const updatePublicVisibility = async (
    participant: ParticipantItem,
    patch: Partial<Pick<ParticipantItem["user"], "public_profile_visible" | "public_photo_visible" | "public_alumni_visible">>
  ) => {
    if (!hasPermission("projects.participants.manage") || !canAccessProject("projects.participants.manage", participant.project.id)) {
      setMessage("Public gorunurluk icin katilimci yonetim yetkisi gerekir.");
      return;
    }

    const nextVisibility = {
      public_profile_visible: participant.user.public_profile_visible ?? false,
      public_photo_visible: participant.user.public_photo_visible ?? false,
      public_alumni_visible: participant.user.public_alumni_visible ?? false,
      ...patch,
    };
    if (!nextVisibility.public_profile_visible) {
      nextVisibility.public_photo_visible = false;
    }

    setVisibilityLoadingId(participant.id);
    setMessage("");
    try {
      await api.patch(`/panel/participants/${participant.id}/public-visibility`, nextVisibility);
      setParticipants((current) =>
        current.map((item) =>
          item.id === participant.id ? { ...item, user: { ...item.user, ...nextVisibility } } : item
        )
      );
      setMessage("Public gorunurluk ayarlari guncellendi.");
    } catch (error) {
      console.error("Public gorunurluk guncellenemedi", error);
      setMessage("Public gorunurluk guncellenemedi.");
    } finally {
      setVisibilityLoadingId(null);
    }
  };

  const bulkUpdateGraduation = async (graduationStatus: "completed" | "graduated" | "not_completed") => {
    if (selectedIdsInDataset.length === 0) return;

    let graduationNote: string | undefined;
    if (graduationStatus === "not_completed") {
      const note = window.prompt("Secili tum katilimcilar icin tamamlayamama gerekcesini yazin")?.trim();
      if (!note) {
        setMessage("Tamamlayamadi durumu icin gerekce zorunludur.");
        return;
      }
      graduationNote = note;
    }

    setBulkLoading(true);
    setMessage("");
    try {
      const response = await api.post<{
        message?: string;
        results?: Array<{ participant_id: number; ok: boolean; error?: string }>;
      }>("/panel/participants/bulk-graduation", {
        participant_ids: selectedIdsInDataset,
        graduation_status: graduationStatus,
        graduation_note: graduationNote,
      });
      const results = response.data?.results ?? [];
      const failed = results.filter((r) => !r.ok);
      const baseMsg = response.data?.message ?? "Toplu guncelleme tamamlandi.";
      setMessage(
        failed.length === 0
          ? baseMsg
          : `${baseMsg} ${failed.length} kayit basarisiz.`,
      );
      clearSelection();
      await refreshParticipants();
    } catch (error) {
      console.error("Toplu mezuniyet guncellenemedi", error);
      setMessage("Toplu mezuniyet guncellenemedi.");
    } finally {
      setBulkLoading(false);
    }
  };

  const rowActionDisabled = bulkLoading || graduationLoadingId !== null;

  return (
    <PermissionGate
      permissions={["projects.participants.view", "projects.alumni.view", "projects.student_cv.view"]}
      require="any"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Katilimci, mezun veya CV goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Users className="h-7 w-7" />
          </div>
        <div>
            <h1 className="text-2xl font-bold">
              {hasPermission("projects.participants.view")
                ? "Katilimcilar"
                : hasPermission("projects.alumni.view")
                  ? "Mezunlar"
                  : "Ogrenci CV'leri"}
            </h1>
            <p className="text-sm text-muted-foreground">Yetkili oldugunuz projelerdeki katilimci, mezun ve CV kayitlarini scope bazli takip edin.</p>
            {selectedProjectName ? <p className="mt-1 text-xs font-bold uppercase tracking-widest text-accent">Filtre: {selectedProjectName}</p> : null}
          </div>
        </div>
        <PermissionGate
          permission="projects.participants.view"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
        <ExportButtons
          endpoint="/panel/participants/export"
          filename="panel_katilimcilar"
          params={{
            project_id: projectFilter !== "all" ? projectFilter : undefined,
            period_id: periodFilter !== "all" ? periodFilter : undefined,
            status: !["all", "graduated", "completed"].includes(statusFilter) ? statusFilter : undefined,
            graduation_status: ["graduated", "completed"].includes(statusFilter) ? statusFilter : undefined,
            search: searchTerm || undefined,
          }}
          buttonLabel="Katilimcilari Disa Aktar"
        />
        </PermissionGate>
      </div>

      {hasAnyPermission(["projects.participants.view", "projects.alumni.view"]) ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="glass-panel rounded-3xl p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam Kayit</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.total}</div>
          </div>
          <div className="glass-panel rounded-3xl p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Katilimci</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.active}</div>
          </div>
          <div className="glass-panel rounded-3xl p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mezun</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.graduates}</div>
          </div>
          <div className="glass-panel rounded-3xl p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ortalama Kredi</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.average_credit}</div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-slate-900">
          {message}
        </div>
      ) : null}

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Isim, e-posta, universite veya bolum ara"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-border bg-input py-3 pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <ProjectPeriodFilters
            projects={projects}
            selectedProjectId={projectFilter}
            selectedPeriodId={periodFilter}
            onProjectChange={(value) => {
              setProjectFilter(value);
              const project = projects.find((item) => String(item.id) === value);
              setPeriodFilter(value === "all" ? "all" : defaultPeriodIdForProject(project) || "all");
              setSelectedIds([]);
            }}
            onPeriodChange={(value) => {
              setPeriodFilter(value);
              setSelectedIds([]);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            selectClassName="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent">
            <option value="all">Tum durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
            <option value="graduated">Mezun</option>
            <option value="completed">Tamamladi</option>
          </select>
        </div>

        {hasPermission("projects.participants.manage") && manageableIdsInView.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-slate-900">
                {selectedIdsInDataset.length > 0 ? `${selectedIdsInDataset.length} katilimci secili` : "Toplu mezuniyet"}
              </span>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => selectAllManageableInView()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-muted disabled:opacity-50"
              >
                Filtredeki tumunu sec ({manageableIdsInView.length})
              </button>
              {selectedIdsInDataset.length > 0 ? (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => clearSelection()}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-muted disabled:opacity-50"
                >
                  Secimi temizle
                </button>
              ) : null}
            </div>
            {selectedIdsInDataset.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={rowActionDisabled}
                  onClick={() => void bulkUpdateGraduation("completed")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Secilenleri tamamladi
                </button>
                <button
                  type="button"
                  disabled={rowActionDisabled}
                  onClick={() => void bulkUpdateGraduation("graduated")}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-60"
                >
                  <GraduationCap className="h-4 w-4" />
                  Secilenleri mezun yap
                </button>
                <button
                  type="button"
                  disabled={rowActionDisabled}
                  onClick={() => void bulkUpdateGraduation("not_completed")}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-800 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Secilenleri tamamlayamadi
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Bu filtreye uygun katilimci bulunamadi.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredParticipants.map((participant) => (
            <div key={participant.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  {hasPermission("projects.participants.manage") &&
                  canAccessProject("projects.participants.manage", participant.project.id) ? (
                    <label className="mt-1 flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-accent"
                        checked={selectedIds.includes(participant.id)}
                        disabled={bulkLoading}
                        onChange={() => toggleSelected(participant.id)}
                      />
                    </label>
                  ) : null}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                    {participant.user.profile_photo ? (
                      <Image src={participant.user.profile_photo} alt={`${participant.user.name} ${participant.user.surname}`} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Users className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {participant.user.name} {participant.user.surname}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${participant.status === "active" ? "bg-green-500/10 text-green-400" : "bg-white/10 text-muted-foreground"}`}>
                        {participant.status}
                      </span>
                      {participant.graduation_status ? (
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                          {participant.graduation_status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{participant.project.name}</p>
                    <p className="text-xs text-muted-foreground">{participant.period?.name || "Donem baglantisi yok"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    <Star className="h-3 w-3" />
                    Kredi
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{participant.credit ?? 0}</div>
                </div>
              </div>

              {participant.user.cv && canAccessProject("projects.student_cv.view", participant.project.id) ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={cvLoadingId === participant.id}
                    onClick={() => void openCvDetails(participant)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-muted"
                  >
                    {cvLoadingId === participant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {cvLoadingId === participant.id ? "CV Yukleniyor" : "CV Bilgilerini Gor"}
                  </button>
                </div>
              ) : null}

              {hasPermission("projects.participants.manage") && canAccessProject("projects.participants.manage", participant.project.id) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "completed")}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500 hover:text-white disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Tamamladi
                  </button>
                  <button
                    type="button"
                    disabled={graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "graduated")}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-500 hover:text-white disabled:opacity-60"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Mezun Yap
                  </button>
                  <button
                    type="button"
                    disabled={graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "not_completed")}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Tamamlayamadi
                  </button>
                </div>
              ) : null}

              {hasPermission("projects.participants.manage") && canAccessProject("projects.participants.manage", participant.project.id) ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Public gorunurluk
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={visibilityLoadingId === participant.id}
                      onClick={() =>
                        void updatePublicVisibility(participant, {
                          public_profile_visible: !(participant.user.public_profile_visible ?? false),
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        participant.user.public_profile_visible
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      Profil {participant.user.public_profile_visible ? "Acik" : "Kapali"}
                    </button>
                    <button
                      type="button"
                      disabled={visibilityLoadingId === participant.id || !(participant.user.public_profile_visible ?? false)}
                      onClick={() =>
                        void updatePublicVisibility(participant, {
                          public_photo_visible: !(participant.user.public_photo_visible ?? false),
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        participant.user.public_photo_visible
                          ? "border-indigo-500/30 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      Fotograf {participant.user.public_photo_visible ? "Acik" : "Kapali"}
                    </button>
                    <button
                      type="button"
                      disabled={visibilityLoadingId === participant.id}
                      onClick={() =>
                        void updatePublicVisibility(participant, {
                          public_alumni_visible: !(participant.user.public_alumni_visible ?? false),
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        participant.user.public_alumni_visible
                          ? "border-amber-500/30 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      Mezun vitrini {participant.user.public_alumni_visible ? "Acik" : "Kapali"}
                    </button>
                    {visibilityLoadingId === participant.id ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
                  <div className="font-bold text-slate-900">{participant.user.university || "Universite yok"}</div>
                  <div>{participant.user.department || "Bolum yok"}</div>
                  <div>{participant.user.class_year || "Sinif bilgisi yok"}</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent" />
                    <span>{participant.user.email || "E-posta yok"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-accent" />
                    <span>{participant.user.phone || "Telefon yok"}</span>
                  </div>
                  <div className="mt-2">{participant.user.hometown || "Memleket yok"}</div>
                </div>
              </div>

              {(participant.graduated_at || participant.graduation_note) && (
                <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <GraduationCap className="h-4 w-4" />
                    Mezuniyet Bilgisi
                  </div>
                  {participant.graduated_at ? <div>Mezuniyet Tarihi: {new Date(participant.graduated_at).toLocaleDateString("tr-TR")}</div> : null}
                  {participant.graduation_note ? <div className="mt-1">{participant.graduation_note}</div> : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {cvParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {cvParticipant.user.name} {cvParticipant.user.surname}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Dijital CV ve profil baglantilari</p>
              </div>
              <button
                type="button"
                onClick={() => setCvParticipant(null)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <div className="font-bold text-slate-900">LinkedIn</div>
                <div className="mt-1 break-all text-muted-foreground">{cvParticipant.user.cv?.linkedin_url ?? "-"}</div>
              </div>
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <div className="font-bold text-slate-900">GitHub</div>
                <div className="mt-1 break-all text-muted-foreground">{cvParticipant.user.cv?.github_url ?? "-"}</div>
              </div>
            </div>

            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-border">
              {cvEntries.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Kayitli CV verisi bulunamadi.</div>
              ) : (
                <div className="divide-y divide-border">
                  {cvEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-1 gap-2 p-4 text-sm md:grid-cols-[180px_1fr]">
                      <div className="font-bold text-slate-900">{key}</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </PermissionGate>
  );
}
