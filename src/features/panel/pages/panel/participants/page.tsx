"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Coins, Download, FileText, GraduationCap, History, Loader2, Mail, Phone, Save, Search, Star, Users, X, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadBlobResponse } from "@/lib/download";
import { panelStatusChipClass } from "@/lib/status-style";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface CreditLogItem {
  id: number;
  amount: number;
  type?: string | null;
  reason?: string | null;
  created_at?: string | null;
  created_by?: string | null;
}
interface ParticipantItem {
  id: number;
  status: string;
  graduation_status?: string | null;
  graduation_note?: string | null;
  credit?: number | null;
  credit_logs?: CreditLogItem[];
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


type CvRecord = Record<string, unknown>;

type CvListSection = {
  key: string;
  title: string;
  items: CvRecord[];
};

const cvFieldLabels: Record<string, string> = {
  fullName: "Ad Soyad",
  email: "E-posta",
  phone: "Telefon",
  location: "Konum",
  summary: "Profesyonel Ozet",
  university: "Universite",
  department: "Bolum",
  classYear: "Sinif",
  linkedin: "LinkedIn",
  github: "GitHub",
  instagram: "Instagram",
  skills: "Yetkinlikler",
  languages: "Diller",
};

const cvListLabels: Record<string, string> = {
  experience: "Deneyim",
  education: "Egitim Ekleri",
  projects: "Projeler",
  certificates: "Sertifikalar",
};

const cvTextKeys = ["fullName", "email", "phone", "location", "summary", "university", "department", "classYear", "linkedin", "github", "instagram", "skills", "languages"];
const cvListKeys = ["experience", "education", "projects", "certificates"];
const ignoredCvKeys = new Set(["saved_at", "savedAt", "updated_at", "created_at"]);

function isRecord(value: unknown): value is CvRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlankCvValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.values(value).every(isBlankCvValue);
  return false;
}

function cvFormFromData(data?: Record<string, unknown> | null): CvRecord {
  if (!data) return {};
  const form = isRecord(data.form) ? data.form : data;
  return Object.fromEntries(Object.entries(form).filter(([, value]) => !isBlankCvValue(value)));
}

function cvValueText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => (isRecord(item) ? Object.values(item).filter((part) => !isBlankCvValue(part)).map(cvValueText).join(" / ") : cvValueText(item)))
      .filter(Boolean)
      .join(", ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([, nested]) => !isBlankCvValue(nested))
      .map(([key, nested]) => `${cvFieldLabels[key] ?? key}: ${cvValueText(nested)}`)
      .join("\n");
  }

  return String(value ?? "");
}

function cvRecordList(value: unknown): CvRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).filter((item) => !isBlankCvValue(item));
}

function cvItemTitle(item: CvRecord): string {
  return cvValueText(item.title ?? item.school ?? item.name ?? item.company ?? item.organization ?? item.position ?? "Kayit");
}

function cvItemMeta(item: CvRecord): string {
  return [item.subtitle, item.date, item.period, item.department, item.location]
    .filter((value) => !isBlankCvValue(value))
    .map(cvValueText)
    .join(" / ");
}

function cvItemDescription(item: CvRecord): string {
  return cvValueText(item.description ?? item.summary ?? item.detail ?? "");
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
  const [cvDownloadingId, setCvDownloadingId] = useState<number | null>(null);
  const [graduationLoadingId, setGraduationLoadingId] = useState<number | null>(null);
  const [visibilityLoadingId, setVisibilityLoadingId] = useState<number | null>(null);
  const [creditParticipant, setCreditParticipant] = useState<ParticipantItem | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);
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

  const cvForm = useMemo(() => cvFormFromData(cvParticipant?.user.cv?.digital_cv_data), [cvParticipant]);
  const cvTextFields = useMemo(() => {
    const baseEntries = cvTextKeys
      .filter((key) => !isBlankCvValue(cvForm[key]))
      .map((key) => [key, cvForm[key]] as const);
    const extraEntries = Object.entries(cvForm)
      .filter(([key, value]) => !cvTextKeys.includes(key) && !cvListKeys.includes(key) && !ignoredCvKeys.has(key) && !isBlankCvValue(value) && !Array.isArray(value));

    return [...baseEntries, ...extraEntries];
  }, [cvForm]);
  const cvListSections = useMemo<CvListSection[]>(() => cvListKeys
    .map((key) => ({ key, title: cvListLabels[key], items: cvRecordList(cvForm[key]) }))
    .filter((section) => section.items.length > 0), [cvForm]);
  const hasCvContent = cvTextFields.length > 0 || cvListSections.length > 0;
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
          hasPermission("projects.participants.manage") &&
          canAccessProject("projects.participants.manage", p.project.id) &&
          periodHasWriteCapability(periodOptionById(projects, p.period?.id), "resolve_operations"),
      )
      .map((p) => p.id);
  }, [filteredParticipants, hasPermission, canAccessProject, projects]);

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

  const openCreditModal = (participant: ParticipantItem) => {
    if (!hasPermission("projects.participants.manage") || !canAccessProject("projects.participants.manage", participant.project.id)) {
      setMessage("Kredi guncellemek icin katilimci yonetim yetkisi gerekir.");
      return;
    }

    setCreditParticipant(participant);
    setCreditAmount("");
    setCreditReason("");
    setMessage("");
  };

  const closeCreditModal = () => {
    if (creditSubmitting) return;
    setCreditParticipant(null);
    setCreditAmount("");
    setCreditReason("");
  };

  const creditAmountNumber = Number.parseInt(creditAmount, 10);
  const creditPreview = creditParticipant && Number.isInteger(creditAmountNumber)
    ? (creditParticipant.credit ?? 0) + creditAmountNumber
    : null;

  const adjustCredit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creditParticipant) return;

    if (!hasPermission("projects.participants.manage") || !canAccessProject("projects.participants.manage", creditParticipant.project.id)) {
      setMessage("Kredi guncellemek icin katilimci yonetim yetkisi gerekir.");
      return;
    }

    if (!Number.isInteger(creditAmountNumber) || creditAmountNumber === 0) {
      setMessage("Kredi miktari sifirdan farkli bir tam sayi olmalidir.");
      return;
    }

    const reason = creditReason.trim();
    if (!reason) {
      setMessage("Kredi guncelleme aciklamasi zorunludur.");
      return;
    }

    setCreditSubmitting(true);
    setMessage("");
    try {
      const response = await api.post<{
        message?: string;
        current_credit: number;
        log?: {
          id: number;
          amount: number;
          type?: string | null;
          reason?: string | null;
          created_at?: string | null;
          creator?: { name?: string | null; surname?: string | null } | null;
        };
      }>("/admin/credits/adjust", {
        participant_id: creditParticipant.id,
        amount: creditAmountNumber,
        reason,
      });

      const nextLog: CreditLogItem | null = response.data.log
        ? {
            id: response.data.log.id,
            amount: response.data.log.amount,
            type: response.data.log.type,
            reason: response.data.log.reason,
            created_at: response.data.log.created_at,
            created_by: response.data.log.creator
              ? `${response.data.log.creator.name ?? ""} ${response.data.log.creator.surname ?? ""}`.trim()
              : null,
          }
        : null;

      const updateCredit = (participant: ParticipantItem): ParticipantItem => ({
        ...participant,
        credit: response.data.current_credit,
        credit_logs: nextLog
          ? [nextLog, ...(participant.credit_logs ?? [])].slice(0, 5)
          : participant.credit_logs ?? [],
      });

      setParticipants((current) => current.map((item) => (item.id === creditParticipant.id ? updateCredit(item) : item)));
      setCreditParticipant((current) => (current ? updateCredit(current) : current));
      setCreditAmount("");
      setCreditReason("");
      setMessage(response.data.message ?? "Kredi basariyla guncellendi.");
      await refreshParticipants();
    } catch (error) {
      console.error("Kredi guncellenemedi", error);
      const apiMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setMessage(apiMessage ?? "Kredi guncellenemedi.");
    } finally {
      setCreditSubmitting(false);
    }
  };
  const downloadCvPdf = async (participant: ParticipantItem) => {
    if (!participant.user.cv?.digital_cv_data) {
      setMessage("Kayitli CV verisi bulunamadi.");
      return;
    }

    setCvDownloadingId(participant.id);
    setMessage("");
    try {
      const response = await api.get(`/panel/participants/${participant.id}/cv/pdf`, { responseType: "blob", timeout: 30000 });
      await downloadBlobResponse(response.data, response.headers, `cv_${participant.user.name}_${participant.user.surname}`);
    } catch (error) {
      console.error("CV PDF indirilemedi", error);
      setMessage("CV PDF indirilemedi.");
    } finally {
      setCvDownloadingId(null);
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
        <div className="panel-empty-card text-amber-700">
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
          <div className="panel-stat-card">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam Kayit</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.total}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Katilimci</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.active}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mezun</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.graduates}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ortalama Kredi</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary.average_credit}</div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="panel-notice panel-notice-success">
          {message}
        </div>
      ) : null}

      <div className="panel-filter-card">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,420px)_180px] xl:items-end">
          <label className="panel-field">
            <span className="panel-label">Arama</span>
            <div className="relative">
              <Search className="panel-control-icon" />
              <input
                type="text"
                placeholder="Isim, e-posta, universite veya bolum ara"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="panel-control pl-10"
              />
            </div>
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
          />

          <label className="panel-field">
            <span className="panel-label">Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="panel-control">
              <option value="all">Tum durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
              <option value="graduated">Mezun</option>
              <option value="completed">Tamamladi</option>
            </select>
          </label>
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
                className="panel-card-action py-1.5"
              >
                Filtredeki tumunu sec ({manageableIdsInView.length})
              </button>
              {selectedIdsInDataset.length > 0 ? (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => clearSelection()}
                  className="panel-card-action py-1.5"
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
                  className="panel-card-action panel-card-action-success"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Secilenleri tamamladi
                </button>
                <button
                  type="button"
                  disabled={rowActionDisabled}
                  onClick={() => void bulkUpdateGraduation("graduated")}
                  className="panel-card-action panel-card-action-info"
                >
                  <GraduationCap className="h-4 w-4" />
                  Secilenleri mezun yap
                </button>
                <button
                  type="button"
                  disabled={rowActionDisabled}
                  onClick={() => void bulkUpdateGraduation("not_completed")}
                  className="panel-card-action panel-card-action-danger"
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
        <div className="panel-empty-card py-16">Bu filtreye uygun katilimci bulunamadi.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredParticipants.map((participant) => {
            const participantPeriod = periodOptionById(projects, participant.period?.id);
            const canResolveParticipant = periodHasWriteCapability(participantPeriod, "resolve_operations");
            return (
            <div key={participant.id} className="panel-list-card">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  {hasPermission("projects.participants.manage") &&
                  canAccessProject("projects.participants.manage", participant.project.id) ? (
                    <label className="mt-1 flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-accent"
                        checked={selectedIds.includes(participant.id)}
                        disabled={bulkLoading || !canResolveParticipant}
                        onChange={() => toggleSelected(participant.id)}
                      />
                    </label>
                  ) : null}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
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
                      <span className={`panel-chip ${panelStatusChipClass(participant.status)}`}>
                        {participant.status}
                      </span>
                      {participant.graduation_status ? (
                        <span className="panel-chip panel-chip-info">
                          {participant.graduation_status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{participant.project.name}</p>
                    <p className="text-xs text-muted-foreground">{participant.period?.name || "Donem baglantisi yok"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                    <Star className="h-3 w-3" />
                    Kredi
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{participant.credit ?? 0}</div>
                  {hasPermission("projects.participants.manage") && canAccessProject("projects.participants.manage", participant.project.id) ? (
                    <button
                      type="button"
                      disabled={!canResolveParticipant || (creditSubmitting && creditParticipant?.id === participant.id)}
                      title={!canResolveParticipant ? "Bu dönemde kredi güncelleme işlemi kapalıdır." : undefined}
                      onClick={() => openCreditModal(participant)}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creditSubmitting && creditParticipant?.id === participant.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                      Guncelle
                    </button>
                  ) : null}
                </div>
              </div>

              {participant.user.cv && canAccessProject("projects.student_cv.view", participant.project.id) ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={cvLoadingId === participant.id}
                    onClick={() => void openCvDetails(participant)}
                    className="panel-card-action"
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
                    disabled={!canResolveParticipant || graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "completed")}
                    className="panel-card-action panel-card-action-success"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Tamamladi
                  </button>
                  <button
                    type="button"
                    disabled={!canResolveParticipant || graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "graduated")}
                    className="panel-card-action panel-card-action-info"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Mezun Yap
                  </button>
                  <button
                    type="button"
                    disabled={!canResolveParticipant || graduationLoadingId === participant.id || bulkLoading}
                    onClick={() => void updateGraduationStatus(participant, "not_completed")}
                    className="panel-card-action panel-card-action-danger"
                  >
                    <XCircle className="h-4 w-4" />
                    Tamamlayamadi
                  </button>
                </div>
              ) : null}

              {hasPermission("projects.participants.manage") && canAccessProject("projects.participants.manage", participant.project.id) ? (
                <div className="panel-card-muted mt-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Public gorunurluk
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canResolveParticipant || visibilityLoadingId === participant.id}
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
                      disabled={!canResolveParticipant || visibilityLoadingId === participant.id || !(participant.user.public_profile_visible ?? false)}
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
                      disabled={!canResolveParticipant || visibilityLoadingId === participant.id}
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
                <div className="panel-card-muted">
                  <div className="font-bold text-slate-900">{participant.user.university || "Universite yok"}</div>
                  <div>{participant.user.department || "Bolum yok"}</div>
                  <div>{participant.user.class_year || "Sinif bilgisi yok"}</div>
                </div>
                <div className="panel-card-muted">
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
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <GraduationCap className="h-4 w-4" />
                    Mezuniyet Bilgisi
                  </div>
                  {participant.graduated_at ? <div>Mezuniyet Tarihi: {new Date(participant.graduated_at).toLocaleDateString("tr-TR")}</div> : null}
                  {participant.graduation_note ? <div className="mt-1">{participant.graduation_note}</div> : null}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      {creditParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={(event) => void adjustCredit(event)} className="panel-modal-card w-full max-w-2xl p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Kredi Guncelle</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {creditParticipant.user.name} {creditParticipant.user.surname} / {creditParticipant.project.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreditModal}
                disabled={creditSubmitting}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-slate-900 disabled:opacity-50"
                aria-label="Kredi penceresini kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Mevcut Kredi</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{creditParticipant.credit ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Islem Sonrasi</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{creditPreview ?? "-"}</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[180px,1fr]">
              <label className="panel-field">
                <span className="panel-label">Miktar</span>
                <input
                  type="number"
                  step="1"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                  className="panel-control"
                  placeholder="Orn: 10 veya -10"
                  required
                />
              </label>
              <label className="panel-field">
                <span className="panel-label">Aciklama</span>
                <input
                  value={creditReason}
                  onChange={(event) => setCreditReason(event.target.value)}
                  className="panel-control"
                  maxLength={255}
                  placeholder="Aylik manuel kredi guncelleme nedeni"
                  required
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <History className="h-4 w-4" />
                Son Kredi Hareketleri
              </div>
              {creditParticipant.credit_logs?.length ? (
                <div className="space-y-2">
                  {creditParticipant.credit_logs.map((log) => (
                    <div key={log.id} className="flex flex-col gap-1 rounded-xl bg-muted px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{log.reason || "Manuel guncelleme"}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : "-"}
                          {log.created_by ? ` / ${log.created_by}` : ""}
                        </div>
                      </div>
                      <div className={`text-sm font-black ${log.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {log.amount > 0 ? "+" : ""}{log.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                  Bu katilimci icin gosterilecek son manuel kredi hareketi yok.
                </div>
              )}
            </div>

            <div className="panel-modal-footer mt-6">
              <button type="button" onClick={closeCreditModal} disabled={creditSubmitting} className="panel-button panel-button-secondary">
                Vazgec
              </button>
              <button
                type="submit"
                disabled={
                  creditSubmitting ||
                  !creditAmount.trim() ||
                  !creditReason.trim() ||
                  creditAmountNumber === 0 ||
                  !periodHasWriteCapability(periodOptionById(projects, creditParticipant.period?.id), "resolve_operations")
                }
                className="panel-button panel-button-primary"
              >
                {creditSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {cvParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="panel-modal-card w-full max-w-4xl p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {cvParticipant.user.name} {cvParticipant.user.surname}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Dijital CV ve profil baglantilari</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasCvContent || cvDownloadingId === cvParticipant.id}
                  onClick={() => void downloadCvPdf(cvParticipant)}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cvDownloadingId === cvParticipant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  PDF Indir
                </button>
                <button
                  type="button"
                  onClick={() => setCvParticipant(null)}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-slate-900"
                  aria-label="CV penceresini kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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

            <div className="mt-4 max-h-[56vh] overflow-y-auto rounded-2xl border border-border bg-white">
              {!hasCvContent ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Kayitli CV verisi bulunamadi.</div>
              ) : (
                <div className="divide-y divide-border">
                  {cvTextFields.length > 0 ? (
                    <section className="p-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Temel Bilgiler</h3>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {cvTextFields.map(([key, value]) => (
                          <div key={key} className={key === "summary" ? "rounded-2xl bg-muted p-4 text-sm md:col-span-2" : "rounded-2xl bg-muted p-4 text-sm"}>
                            <div className="font-bold text-slate-900">{cvFieldLabels[key] ?? key}</div>
                            <div className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{cvValueText(value)}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {cvListSections.map((section) => (
                    <section key={section.key} className="p-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{section.title}</h3>
                      <div className="mt-4 space-y-3">
                        {section.items.map((item, index) => {
                          const meta = cvItemMeta(item);
                          const description = cvItemDescription(item);
                          return (
                            <div key={`${section.key}-${index}`} className="rounded-2xl border border-border bg-muted/60 p-4 text-sm">
                              <div className="font-bold text-slate-900">{cvItemTitle(item)}</div>
                              {meta ? <div className="mt-1 text-xs font-semibold text-muted-foreground">{meta}</div> : null}
                              {description ? <div className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{description}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
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







