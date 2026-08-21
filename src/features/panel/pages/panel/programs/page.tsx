"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  GlobeLock,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquareText,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  SquareCheckBig,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import type { AxiosError } from "axios";
import { fixMojibake } from "@/lib/text";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  active_period?: ActivePeriod | null;
  periods?: PeriodOption[];
}

type ProjectsPayload = Project[] | { data?: Project[] };

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

interface ProgramPhoto {
  id: number;
  url: string;
  caption: string | null;
  sort_order: number;
}

interface Program {
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
  start_at: string;
  end_at?: string | null;
  status?: ProgramFormState["status"];
  radius_meters?: number | null;
  credit_deduction?: number | null;
  application_quota?: number | null;
  target_audience?: Array<"student" | "alumni"> | null;
  feedback_form_template_id?: number | null;
  project_id: number;
  project?: { id: number; name: string } | null;
  period?: { id: number; name: string } | null;
  attendance_count?: number;
  feedback_count?: number;
  is_public?: boolean;
  is_featured?: boolean;
}

interface AttendanceRecord {
  id?: number | null;
  participant_id?: number | null;
  student: string;
  email?: string | null;
  role?: "student" | "alumni" | string | null;
  credit_applicable?: boolean;
  method?: string | null;
  is_valid: boolean;
  attendance_status?: "present" | "absent";
  feedback_submitted: boolean;
  credit_deducted?: boolean;
  credit_restored?: boolean;
  recorded_at?: string | null;
}

interface AttendanceSummary {
  attendance_count: number;
  participant_count?: number;
  absent_count?: number;
  feedback_count: number;
  deduction_count?: number;
  restore_count?: number;
}

interface FeedbackQuestionStat {
  label: string;
  type?: "rating" | "choice";
  count: number;
  average?: number | null;
  min?: number | null;
  max?: number | null;
  distribution: Record<string, number>;
}

interface FeedbackResponse {
  id: number;
  anonymous_report_id?: string | null;
  is_anonymous?: boolean;
  identity_redacted?: boolean;
  comment: string | null;
  submitted_at: string | null;
}

interface FeedbackTextResponse {
  anonymous_report_id: string;
  question_id: string;
  question: string;
  answer: string;
  submitted_at?: string | null;
}

interface FeedbackStatsData {
  program: { id: number; title: string; project: string | null; period: string | null };
  summary: { total_feedback: number; with_comment: number; overall_average: number | null; rating_question_count?: number; choice_question_count?: number; text_question_count?: number; text_response_count?: number; anonymous?: boolean; identity_redacted?: boolean; public_id_enabled?: boolean };
  question_stats: Record<string, FeedbackQuestionStat>;
  text_responses?: FeedbackTextResponse[];
  responses: FeedbackResponse[];
}

interface FeedbackComparisonRow {
  name: string;
  program_count: number;
  feedback_count: number;
  with_comment: number;
  overall_average: number | null;
}

interface FeedbackSummaryData {
  summary: { program_count: number; total_feedback: number; with_comment: number; overall_average: number | null };
  programs: Array<{ id: number; title: string; project?: string | null; period?: string | null; feedback_count: number; with_comment: number; overall_average: number | null }>;
  project_breakdown?: FeedbackComparisonRow[];
  period_breakdown?: FeedbackComparisonRow[];
  question_stats: Record<string, FeedbackQuestionStat>;
  recent_comments: Array<{ program_id: number; program_title: string; project?: string | null; question: string; comment: string; submitted_at?: string | null }>;
}

interface FeedbackFormTemplate {
  id: number;
  project_id?: number | null;
  description?: string | null;
  name: string;
  is_default: boolean;
  is_active: boolean;
  questions?: FeedbackTemplateQuestion[];
}

interface FeedbackTemplateQuestion {
  id?: number;
  question_key: string;
  label: string;
  type: "rating" | "text" | "choice";
  options?: string[] | null;
  min_value?: number | null;
  max_value?: number | null;
  is_required?: boolean;
}

interface FeedbackTemplateQuestionForm {
  question_key: string;
  label: string;
  type: "rating" | "text" | "choice";
  options: string[];
  min_value: string;
  max_value: string;
  is_required: boolean;
}

interface FeedbackTemplateFormState {
  project_id: string;
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  questions: FeedbackTemplateQuestionForm[];
}

interface ProgramFormState {
  project_id: string;
  period_id: string;
  title: string;
  description: string;
  location: string;
  location_place_name: string;
  location_place_address: string;
  location_place_id: string;
  location_place_provider: string;
  latitude: string;
  longitude: string;
  start_at: string;
  end_at: string;
  radius_meters: string;
  credit_deduction: string;
  application_quota: string;
  feedback_form_template_id: string;
  target_audience: Array<"student" | "alumni">;
  status: "scheduled" | "active" | "completed" | "cancelled";
  is_public: boolean;
  is_featured: boolean;
}

const initialForm: ProgramFormState = {
  project_id: "",
  period_id: "",
  title: "",
  description: "",
  location: "",
  location_place_name: "",
  location_place_address: "",
  location_place_id: "",
  location_place_provider: "",
  latitude: "",
  longitude: "",
  start_at: "",
  end_at: "",
  radius_meters: "100",
  credit_deduction: "10",
  application_quota: "",
  feedback_form_template_id: "",
  target_audience: ["student"],
  status: "scheduled",
  is_public: false,
  is_featured: false,
};

const newTemplateQuestion = (index = 1): FeedbackTemplateQuestionForm => ({
  question_key: `question_${index}`,
  label: "Yeni soru",
  type: "rating",
  options: ["Evet", "Hayir"],
  min_value: "1",
  max_value: "5",
  is_required: true,
});

const initialTemplateForm: FeedbackTemplateFormState = {
  project_id: "",
  name: "",
  description: "",
  is_default: false,
  is_active: true,
  questions: [newTemplateQuestion()],
};

const statusLabels: Record<ProgramFormState["status"], string> = {
  scheduled: "Planlandi",
  active: "Aktif",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

const statusConfig: Record<ProgramFormState["status"], { bg: string; text: string; dot: string }> = {
  scheduled: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  active: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50 border-red-200", text: "text-red-700", dot: "bg-red-400" },
};

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

const formatIstanbulDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const toIstanbulOffsetDateTime = (value: string) => {
  if (!value) return value;
  return `${value}${value.length === 16 ? ":00" : ""}+03:00`;
};

const formatIstanbulDateTimeDisplay = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatIstanbulTimeDisplay = (value: Date) =>
  value.toLocaleTimeString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const isProgramAttendanceWindowOpen = (program: Program) => {
  const now = Date.now();
  const start = new Date(program.start_at).getTime();
  const end = program.end_at ? new Date(program.end_at).getTime() : null;

  if (Number.isFinite(start) && now < start) return false;
  if (end !== null && Number.isFinite(end) && now > end) return false;

  return true;
};
const normalizeStatus = (status?: Program["status"]): ProgramFormState["status"] => {
  if (status === "active" || status === "completed" || status === "cancelled") return status;
  return "scheduled";
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const responseMessage = axiosError.response?.data?.message;
  const validationMessage = Object.values(axiosError.response?.data?.errors ?? {})
    .flat()
    .join(" ");
  return validationMessage || responseMessage || fallback;
}

const inputClass =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const audienceLabels: Record<"student" | "alumni", string> = {
  student: "Öğrenci",
  alumni: "Mezun",
};

const formatCoordinate = (value: number) => value.toFixed(8);

export default function PanelProgramsPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creatableProjects, setCreatableProjects] = useState<Project[]>([]);
  const [updatableProjects, setUpdatableProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormState>(initialForm);
  const [feedbackTemplates, setFeedbackTemplates] = useState<FeedbackFormTemplate[]>([]);
  const [feedbackTemplatesLoading, setFeedbackTemplatesLoading] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState<FeedbackTemplateFormState>(initialTemplateForm);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<number | null>(null);
  const [attendanceModalProgram, setAttendanceModalProgram] = useState<Program | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceUpdatedAt, setAttendanceUpdatedAt] = useState<Date | null>(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState<number | null>(null);
  const [feedbackModalProgram, setFeedbackModalProgram] = useState<Program | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStatsData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSummaryOpen, setFeedbackSummaryOpen] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummaryData | null>(null);
  const [feedbackSummaryLoading, setFeedbackSummaryLoading] = useState(false);
  const [galleryModalProgram, setGalleryModalProgram] = useState<Program | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<ProgramPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<number | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [visibilityTogglingId, setVisibilityTogglingId] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const handledDeepLinkRef = useRef<string | null>(null);

  const canViewAttendanceStats = hasPermission("programs.attendance.view");
  const canManageAttendance = hasPermission("programs.attendance.manage");
  const canUpdatePrograms = hasPermission("programs.update");
  const canCompletePrograms = hasPermission("programs.complete");
  const canManageQr = hasPermission("programs.qr.manage");
  const canViewMedia = hasPermission("programs.view");
  const canManageMedia = hasPermission("programs.media.upload");
  const canManageTemplates = hasPermission("programs.create") || hasPermission("programs.update");
  const selectedFilterPeriod = periodOptionById(projects, selectedPeriodId);
  const canCreateInSelectedFilter = selectedPeriodId === "all" || periodHasWriteCapability(selectedFilterPeriod, "create_operations");
  const selectedFormPeriod = periodOptionById([...projects, ...creatableProjects, ...updatableProjects], form.period_id);
  const canWriteSelectedProgramPeriod = periodHasWriteCapability(selectedFormPeriod, "create_operations");
  const attendanceModalPeriod = periodOptionById(projects, attendanceModalProgram?.period?.id);
  const canResolveAttendancePeriod = periodHasWriteCapability(attendanceModalPeriod, "resolve_operations");
  const galleryModalPeriod = periodOptionById(projects, galleryModalProgram?.period?.id);
  const canWriteGalleryPeriod = periodHasWriteCapability(galleryModalPeriod, "create_operations");

  const normalizeProjectsPayload = useCallback((payload: ProjectsPayload | undefined): Project[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }, []);

  const loadProjectsByPermission = useCallback(
    async (permission: "programs.view" | "programs.create" | "programs.update") => {
      try {
        const response = await api.get<{ projects: ProjectsPayload }>("/panel/projects/manageable", {
          params: { permission },
        });
        return normalizeProjectsPayload(response.data.projects);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 403) return [];
        if (axiosError.response?.status === 422) {
          const fallback = await api.get<{ projects: ProjectsPayload }>("/panel/projects/manageable");
          return normalizeProjectsPayload(fallback.data.projects).filter((p) => canAccessProject(permission, p.id));
        }
        throw error;
      }
    },
    [canAccessProject, normalizeProjectsPayload],
  );

  const loadPrograms = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const viewableProjects = await loadProjectsByPermission("programs.view");
      const creatableProjectsRaw = await loadProjectsByPermission("programs.create");
      const updatableProjectsRaw = await loadProjectsByPermission("programs.update");

      const manageableProjects = viewableProjects.filter((p) => canAccessProject("programs.view", p.id));
      const allowedCreateProjects = creatableProjectsRaw.filter(
        (p) => p.active_period?.id && canAccessProject("programs.create", p.id),
      );
      const allowedUpdateProjects = updatableProjectsRaw.filter((p) => canAccessProject("programs.update", p.id));

      setProjects(manageableProjects);
      setCreatableProjects(allowedCreateProjects);
      setUpdatableProjects(allowedUpdateProjects);
      if (selectedProjectId !== "all" && selectedPeriodId === "all") {
        const project = manageableProjects.find((item) => String(item.id) === selectedProjectId);
        setSelectedPeriodId(defaultPeriodIdForProject(project) || "all");
      }

      const allPrograms: Program[] = [];
      for (const project of manageableProjects) {
        try {
          const response = await api.get<{ programs: Program[] }>("/panel/programs", {
            params: {
              project_id: project.id,
              period_id:
                selectedProjectId !== "all" &&
                Number(selectedProjectId) === project.id &&
                selectedPeriodId !== "all"
                  ? selectedPeriodId
                  : undefined,
            },
          });
          const projectPrograms = (response.data.programs ?? []).map((program) => ({
            ...program,
            project_id: program.project_id ?? project.id,
            status: normalizeStatus(program.status),
          }));
          allPrograms.push(...projectPrograms);
        } catch (err) {
          console.error(`Proje #${project.id} programlari yuklenemedi`, err);
        }
      }
      setPrograms(allPrograms);
    } catch (err) {
      console.error("Panel programlari yuklenemedi", err);
      setErrorMessage("Program listesi yuklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccessProject, loadProjectsByPermission, selectedPeriodId, selectedProjectId]);

  const loadFeedbackTemplatesForProject = useCallback(async (projectId: string) => {
    if (!projectId) {
      setFeedbackTemplates([]);
      return;
    }

    setFeedbackTemplatesLoading(true);
    try {
      const response = await api.get<{ templates: FeedbackFormTemplate[] }>("/panel/feedback-form-templates", {
        params: { project_id: projectId },
      });
      setFeedbackTemplates(response.data.templates ?? []);
    } catch (error) {
      console.error("Degerlendirme form sablonlari yuklenemedi", error);
      setFeedbackTemplates([]);
    } finally {
      setFeedbackTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPrograms(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPrograms]);

  useEffect(() => {
    const projectId = showTemplateEditor ? templateForm.project_id : form.project_id;
    if ((!showForm && !showTemplateEditor) || !projectId) return;
    const timer = window.setTimeout(() => void loadFeedbackTemplatesForProject(projectId), 0);
    return () => window.clearTimeout(timer);
  }, [form.project_id, loadFeedbackTemplatesForProject, showForm, showTemplateEditor, templateForm.project_id]);

  const projectNameMap = useMemo(
    () =>
      projects.reduce<Record<number, string>>((acc, p) => {
        acc[p.id] = fixMojibake(p.name);
        return acc;
      }, {}),
    [projects],
  );

  const templateProjects = useMemo(() => {
    const map = new Map<number, Project>();
    [...creatableProjects, ...updatableProjects].forEach((project) => map.set(project.id, project));
    return Array.from(map.values());
  }, [creatableProjects, updatableProjects]);

  const filteredPrograms = useMemo(
    () =>
      [...programs]
        .filter((p) => (selectedProjectId === "all" ? true : p.project_id === Number(selectedProjectId)))
        .filter((p) => (selectedPeriodId === "all" ? true : String(p.period?.id ?? "") === selectedPeriodId))
        .filter((p) => {
          const projectName = p.project?.name ?? projectNameMap[p.project_id] ?? "";
          return `${p.title} ${projectName} ${p.location ?? ""} ${p.location_place_name ?? ""} ${p.location_place_address ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()),
    [programs, projectNameMap, searchTerm, selectedPeriodId, selectedProjectId],
  );

  const openCreateForm = () => {
    setEditingProgramId(null);
    const projectId = selectedProjectId !== "all" ? selectedProjectId : "";
    const project = creatableProjects.find((item) => String(item.id) === projectId);
    setForm({
      ...initialForm,
      project_id: projectId,
      period_id: selectedPeriodId !== "all" ? selectedPeriodId : project ? defaultPeriodIdForProject(project) : "",
    });
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const openTemplateEditor = () => {
    const projectId = selectedProjectId !== "all" ? selectedProjectId : (creatableProjects[0]?.id ?? updatableProjects[0]?.id ?? "");
    setTemplateForm({
      ...initialTemplateForm,
      project_id: projectId ? String(projectId) : "",
    });
    setEditingTemplateId(null);
    setShowTemplateEditor(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const normalizeTemplateForForm = (template: FeedbackFormTemplate): FeedbackTemplateFormState => ({
    project_id: template.project_id ? String(template.project_id) : "",
    name: template.name,
    description: template.description ?? "",
    is_default: template.is_default,
    is_active: template.is_active,
    questions: (template.questions?.length ? template.questions : [newTemplateQuestion()]).map((question, index) => ({
      question_key: question.question_key || `question_${index + 1}`,
      label: question.label,
      type: question.type,
      options: question.options?.length ? question.options : ["Evet", "Hayir"],
      min_value: String(question.min_value ?? 1),
      max_value: String(question.max_value ?? 5),
      is_required: question.is_required !== false,
    })),
  });

  const editTemplate = (template: FeedbackFormTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm(normalizeTemplateForForm(template));
    setShowTemplateEditor(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const updateTemplateQuestion = (index: number, updates: Partial<FeedbackTemplateQuestionForm>) => {
    setTemplateForm((current) => ({
      ...current,
      questions: current.questions.map((question, itemIndex) => (itemIndex === index ? { ...question, ...updates } : question)),
    }));
  };

  const handleSaveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!templateForm.project_id) {
      setErrorMessage("Anket sablonu icin proje secilmelidir.");
      return;
    }

    const payload = {
      project_id: Number(templateForm.project_id),
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || null,
      is_default: templateForm.is_default,
      is_active: templateForm.is_active,
      questions: templateForm.questions.map((question) => ({
        question_key: question.question_key.trim(),
        label: question.label.trim(),
        type: question.type,
        options: question.type === "choice" ? question.options.map((option) => option.trim()).filter(Boolean) : undefined,
        min_value: question.type === "rating" ? Number(question.min_value || 1) : null,
        max_value: question.type === "rating" ? Number(question.max_value || 5) : null,
        is_required: question.is_required,
      })),
    };

    setTemplateSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      if (editingTemplateId) {
        await api.put(`/panel/feedback-form-templates/${editingTemplateId}`, payload);
        setMessage("Degerlendirme sablonu guncellendi.");
      } else {
        await api.post("/panel/feedback-form-templates", payload);
        setMessage("Degerlendirme sablonu olusturuldu.");
      }

      await loadFeedbackTemplatesForProject(templateForm.project_id);
      setEditingTemplateId(null);
      setTemplateForm({ ...initialTemplateForm, project_id: templateForm.project_id });
    } catch (error) {
      console.error("Degerlendirme sablonu kaydedilemedi", error);
      setErrorMessage(apiErrorMessage(error, "Degerlendirme sablonu kaydedilemedi."));
    } finally {
      setTemplateSaving(false);
    }
  };

  const deleteTemplate = async (template: FeedbackFormTemplate) => {
    setTemplateDeletingId(template.id);
    setErrorMessage(null);
    setMessage(null);
    try {
      await api.delete(`/panel/feedback-form-templates/${template.id}`);
      setMessage("Degerlendirme sablonu silindi.");
      if (editingTemplateId === template.id) {
        setEditingTemplateId(null);
        setTemplateForm({ ...initialTemplateForm, project_id: template.project_id ? String(template.project_id) : templateForm.project_id });
      }
      await loadFeedbackTemplatesForProject(template.project_id ? String(template.project_id) : templateForm.project_id);
    } catch (error) {
      console.error("Degerlendirme sablonu silinemedi", error);
      setErrorMessage(apiErrorMessage(error, "Degerlendirme sablonu silinemedi."));
    } finally {
      setTemplateDeletingId(null);
    }
  };

  const openEditForm = (program: Program) => {
    setEditingProgramId(program.id);
    setForm({
      project_id: String(program.project_id),
      period_id: program.period?.id ? String(program.period.id) : "",
      title: fixMojibake(program.title),
      description: fixMojibake(program.description),
      location: fixMojibake(program.location),
      location_place_name: fixMojibake(program.location_place_name),
      location_place_address: fixMojibake(program.location_place_address),
      location_place_id: program.location_place_id ?? "",
      location_place_provider: program.location_place_provider ?? "",
      latitude: program.latitude != null ? String(program.latitude) : "",
      longitude: program.longitude != null ? String(program.longitude) : "",
      start_at: formatIstanbulDateTimeInput(program.start_at),
      end_at: formatIstanbulDateTimeInput(program.end_at),
      radius_meters: String(program.radius_meters ?? 100),
      credit_deduction: String(program.credit_deduction ?? 10),
      application_quota: program.application_quota != null ? String(program.application_quota) : "",
      feedback_form_template_id: program.feedback_form_template_id != null ? String(program.feedback_form_template_id) : "",
      target_audience: program.target_audience?.length ? program.target_audience : ["student"],
      status: (program.status as ProgramFormState["status"]) || "scheduled",
      is_public: program.is_public === true,
      is_featured: program.is_featured === true,
    });
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const handleSaveProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const projectPool = editingProgramId ? updatableProjects : creatableProjects;
    const selectedProject = projectPool.find((p) => p.id === Number(form.project_id));
    const selectedPeriodIdForSave = form.period_id || (selectedProject ? defaultPeriodIdForProject(selectedProject) : "");
    if (!selectedProject || !selectedPeriodIdForSave) {
      setErrorMessage("Program kaydi icin proje ve donem secilmelidir.");
      return;
    }
    if (form.target_audience.length === 0) {
      setErrorMessage("Program icin en az bir hedef kitle secilmelidir.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);
    const payload = {
      project_id: selectedProject.id,
      period_id: Number(selectedPeriodIdForSave),
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      location_place_name: form.location_place_name || null,
      location_place_address: form.location_place_address || null,
      location_place_id: form.location_place_id || null,
      location_place_provider: form.location_place_provider || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      radius_meters: Number(form.radius_meters),
      credit_deduction: Number(form.credit_deduction),
      application_quota: form.application_quota ? Number(form.application_quota) : null,
      target_audience: form.target_audience,
      feedback_form_template_id: form.feedback_form_template_id ? Number(form.feedback_form_template_id) : null,
      start_at: toIstanbulOffsetDateTime(form.start_at),
      end_at: toIstanbulOffsetDateTime(form.end_at),
      status: form.status,
      is_public: form.is_public,
      is_featured: form.is_featured,
    };
    try {
      if (editingProgramId) {
        await api.put(`/panel/programs/${editingProgramId}`, payload);
        setMessage("Program guncellendi.");
      } else {
        await api.post("/panel/programs", payload);
        setMessage("Yeni program basariyla olusturuldu.");
      }
      setShowForm(false);
      setEditingProgramId(null);
      setForm(initialForm);
      await loadPrograms();
    } catch (error) {
      console.error("Program kaydedilemedi", error);
      setErrorMessage(apiErrorMessage(error, "Program kaydedilemedi. Alanlari ve yetkileri kontrol edin."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (programId: number) => {
    try {
      const response = await api.post<{ deducted_participant_count?: number }>(`/panel/programs/${programId}/complete`);
      const count = response.data.deducted_participant_count ?? 0;
      setPrograms((cur) => cur.map((p) => (p.id === programId ? { ...p, status: "completed" } : p)));
      setMessage(`Program tamamlandi. ${count} aktif katilimciya kredi kesintisi uygulandi.`);
      await loadPrograms();
    } catch (error) {
      console.error("Program tamamlanamadi", error);
      setErrorMessage("Program tamamlanamadi.");
    }
  };

  const openAttendanceModal = async (program: Program) => {
    setAttendanceModalProgram(program);
    setAttendanceLoading(true);
    setAttendanceRecords([]);
    setAttendanceSummary(null);
    setAttendanceUpdatedAt(null);
    try {
      const response = await api.get<{ summary?: AttendanceSummary; records?: AttendanceRecord[] }>(
        `/panel/programs/${program.id}/attendances`,
      );
      setAttendanceSummary(response.data.summary ?? null);
      setAttendanceRecords(response.data.records ?? []);
      setAttendanceUpdatedAt(new Date());
    } catch (error) {
      console.error("Yoklama detaylari yuklenemedi", error);
      setErrorMessage("Yoklama detaylari yuklenemedi.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const updateManualAttendance = async (record: AttendanceRecord, isValid: boolean) => {
    if (!attendanceModalProgram || !record.participant_id) return;
    setAttendanceActionLoading(record.participant_id);
    setErrorMessage(null);
    try {
      await api.put(`/panel/programs/${attendanceModalProgram.id}/attendances/${record.participant_id}`, {
        is_valid: isValid,
        manual_note: isValid ? "Panel uzerinden manuel katilim onayi." : "Panel uzerinden manuel gelmedi isaretlendi.",
      });
      await openAttendanceModal(attendanceModalProgram);
      await loadPrograms();
    } catch (error) {
      console.error("Manuel yoklama guncellenemedi", error);
      setErrorMessage("Manuel yoklama guncellenemedi.");
    } finally {
      setAttendanceActionLoading(null);
    }
  };

  const openGalleryModal = async (program: Program) => {
    setGalleryModalProgram(program);
    setGalleryPhotos([]);
    setGalleryLoading(true);
    setPhotoCaption("");
    try {
      const response = await api.get<{ photos: ProgramPhoto[] }>(`/panel/programs/${program.id}/photos`);
      setGalleryPhotos(response.data.photos ?? []);
    } catch {
      setErrorMessage("Fotograf listesi yuklenemedi.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    if (!galleryModalProgram) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      if (photoCaption.trim()) formData.append("caption", photoCaption.trim());
      const response = await api.post<{ photo: ProgramPhoto }>(
        `/panel/programs/${galleryModalProgram.id}/photos`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setGalleryPhotos((prev) => [...prev, response.data.photo]);
      setPhotoCaption("");
      if (photoInputRef.current) photoInputRef.current.value = "";
    } catch {
      setErrorMessage("Fotograf yuklenemedi.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!galleryModalProgram) return;
    setPhotoDeletingId(photoId);
    try {
      await api.delete(`/panel/programs/${galleryModalProgram.id}/photos/${photoId}`);
      setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setErrorMessage("Fotograf silinemedi.");
    } finally {
      setPhotoDeletingId(null);
    }
  };

  const handleToggleVisibility = async (program: Program, field: "is_public" | "is_featured") => {
    setVisibilityTogglingId(program.id);
    try {
      const newVal = field === "is_public" ? program.is_public !== false ? false : true : !program.is_featured;
      await api.patch(`/panel/programs/${program.id}/visibility`, { [field]: newVal });
      setPrograms((prev) => prev.map((p) => (p.id === program.id ? { ...p, [field]: newVal } : p)));
      if (galleryModalProgram?.id === program.id) {
        setGalleryModalProgram((prev) => (prev ? { ...prev, [field]: newVal } : prev));
      }
    } catch {
      setErrorMessage("Gorunurluk guncelleme basarisiz.");
    } finally {
      setVisibilityTogglingId(null);
    }
  };

  const openFeedbackModal = async (program: Program) => {
    setFeedbackModalProgram(program);
    setFeedbackLoading(true);
    setFeedbackStats(null);
    try {
      const response = await api.get<FeedbackStatsData>(`/panel/programs/${program.id}/feedback-stats`);
      setFeedbackStats(response.data);
    } catch (error) {
      console.error("Degerlendirme istatistikleri yuklenemedi", error);
      setErrorMessage("Degerlendirme istatistikleri yuklenemedi.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const openFeedbackSummary = async () => {
    setFeedbackSummaryOpen(true);
    setFeedbackSummaryLoading(true);
    setFeedbackSummary(null);
    try {
      const response = await api.get<FeedbackSummaryData>("/panel/programs/feedback-summary", {
        params: {
          project_id: selectedProjectId !== "all" ? selectedProjectId : undefined,
          period_id: selectedPeriodId !== "all" ? selectedPeriodId : undefined,
        },
      });
      setFeedbackSummary(response.data);
    } catch (error) {
      console.error("Toplu degerlendirme ozeti yuklenemedi", error);
      setErrorMessage("Toplu degerlendirme ozeti yuklenemedi.");
    } finally {
      setFeedbackSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (loading || programs.length === 0 || typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const actionEntries = [
      ["edit_id", "edit"],
      ["attendance_id", "attendance"],
      ["gallery_id", "gallery"],
      ["feedback_id", "feedback"],
    ] as const;
    const requested = actionEntries.find(([param]) => query.has(param));
    if (!requested) return;

    const [param, action] = requested;
    const requestedId = Number(query.get(param));
    const program = programs.find((item) => item.id === requestedId);
    const deepLinkKey = `${action}:${requestedId}`;
    if (!program || handledDeepLinkRef.current === deepLinkKey) return;

    const actionAllowed =
      (action === "edit" && canUpdatePrograms && canAccessProject("programs.update", program.project_id)) ||
      (action === "attendance" && canViewAttendanceStats && canAccessProject("programs.attendance.view", program.project_id)) ||
      (action === "gallery" && canViewMedia && canAccessProject("programs.view", program.project_id)) ||
      (action === "feedback" && normalizeStatus(program.status) === "completed" && canAccessProject("programs.view", program.project_id));

    handledDeepLinkRef.current = deepLinkKey;
    query.delete(param);
    window.history.replaceState(null, "", `${window.location.pathname}${query.size ? `?${query.toString()}` : ""}`);

    const timer = window.setTimeout(() => {
      if (!actionAllowed) {
        setErrorMessage("Bu program işlemi için gerekli yetkiniz veya proje kapsamınız bulunmuyor.");
        return;
      }
      if (action === "edit") openEditForm(program);
      if (action === "attendance") void openAttendanceModal(program);
      if (action === "gallery") void openGalleryModal(program);
      if (action === "feedback") void openFeedbackModal(program);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccessProject, canUpdatePrograms, canViewAttendanceStats, canViewMedia, loading, programs]);

  return (
    <PermissionGate
      permission="programs.view"
      fallback={
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-800">
          Programlari goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
      <div className="space-y-6 pb-6">
        {/* Panel bolumu */}
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Program Yönetimi</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Projelerinize bağlı programları planlayın, fotoğraf ekleyin, QR yoklamasını başlatın ve görünürlüğü yönetin.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="programs.export">
              <ExportButtons
                endpoint="/panel/programs/export"
                filename="panel_programlar"
                params={{
                  project_id: selectedProjectId !== "all" ? selectedProjectId : undefined,
                  period_id: selectedPeriodId !== "all" ? selectedPeriodId : undefined,
                }}
                buttonLabel="Dışa Aktar"
              />
            </PermissionGate>
            <button
              onClick={() => void loadPrograms()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Yenileniyor" : "Yenile"}
            </button>
            {canManageTemplates && (
              <button
                onClick={showTemplateEditor ? () => setShowTemplateEditor(false) : openTemplateEditor}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                  showTemplateEditor
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {showTemplateEditor ? <X className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                {showTemplateEditor ? "Sablonlari Kapat" : "Anket Sablonlari"}
              </button>
            )}
            {canViewAttendanceStats && (
              <button
                type="button"
                onClick={() => void openFeedbackSummary()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              >
                <BarChart3 className="h-4 w-4" />
                Toplu Değerlendirme
              </button>
            )}
            <PermissionGate permission="programs.create">
              <button
                disabled={!canCreateInSelectedFilter}
                title={!canCreateInSelectedFilter ? "Seçili dönemde yeni program oluşturulamaz." : undefined}
                onClick={showForm ? () => setShowForm(false) : openCreateForm}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  showForm
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
                }`}
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Formu Kapat" : "Yeni Program"}
              </button>
            </PermissionGate>
          </div>
        </header>

        {/* Panel bolumu */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={(e) => void handleSaveProgram(e)}
            className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-7"
          >
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                {editingProgramId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingProgramId ? "Programi Guncelle" : "Yeni Program Olustur"}
                </h2>
                <p className="text-xs text-slate-500">Programi aktif veya gecmis donem baglaminda kaydedebilirsiniz.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Proje</label>
                <select
                  value={form.project_id}
                  onChange={(e) => {
                    const nextProjectId = e.target.value;
                    const project = (editingProgramId ? updatableProjects : creatableProjects).find((item) => String(item.id) === nextProjectId);
                    setForm((prev) => ({
                      ...prev,
                      project_id: nextProjectId,
                      period_id: project ? defaultPeriodIdForProject(project) : "",
                      feedback_form_template_id: "",
                    }));
                  }}
                  className={inputClass}
                  required
                  disabled={!!editingProgramId}
                >
                  <option value="">Proje secin</option>
                  {(editingProgramId ? updatableProjects : creatableProjects).map((p) => (
                    <option key={p.id} value={p.id}>
                      {fixMojibake(p.name)} {p.active_period ? ` - ${fixMojibake(p.active_period.name)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Dönem</label>
                <select
                  value={form.period_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, period_id: e.target.value }))}
                  className={inputClass}
                  required
                  disabled={!form.project_id || !!editingProgramId}
                >
                  <option value="">Dönem seçin</option>
                  {((editingProgramId ? updatableProjects : creatableProjects).find((project) => String(project.id) === form.project_id)?.periods ?? []).map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (gecmis)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Program basligi</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ornek: Liderlik Zirvesi 2026"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Konum</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value, location_place_name: "", location_place_address: "", location_place_id: "", location_place_provider: "" }))}
                  placeholder="Adres veya yer adi"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Durum</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ProgramFormState["status"] }))}
                  className={inputClass}
                >
                  <option value="scheduled">Planlandi</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Tamamlandi</option>
                  <option value="cancelled">Iptal</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Baslangic tarihi / saati</label>
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Bitis tarihi / saati</label>
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Kredi dusumu</label>
                <input
                  type="number"
                  min={0}
                  value={form.credit_deduction}
                  onChange={(e) => setForm((prev) => ({ ...prev, credit_deduction: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Basvuru kontenjani (opsiyonel)</label>
                <input
                  type="number"
                  min={1}
                  value={form.application_quota}
                  onChange={(e) => setForm((prev) => ({ ...prev, application_quota: e.target.value }))}
                  placeholder="Bos birakilabilir"
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Hedef kitle</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["student", "alumni"] as const).map((audience) => {
                    const selected = form.target_audience.includes(audience);

                    return (
                      <button
                        key={audience}
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const exists = prev.target_audience.includes(audience);
                            const next = exists
                              ? prev.target_audience.filter((item) => item !== audience)
                              : [...prev.target_audience, audience];

                            return { ...prev, target_audience: next };
                          })
                        }
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-bold">{audienceLabels[audience]}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {audience === "student"
                              ? "Kredi dusumu ve iade kurali uygulanir."
                              : "Yoklama ve anket olur, kredi islemi uygulanmaz."}
                          </span>
                        </span>
                        <span className={`h-5 w-5 rounded-md border ${selected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
                          {selected ? <CheckCircle2 className="h-5 w-5 text-white" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Değerlendirme formu</label>
              <select
                value={form.feedback_form_template_id}
                onChange={(e) => setForm((prev) => ({ ...prev, feedback_form_template_id: e.target.value }))}
                className={inputClass}
                disabled={!form.project_id || feedbackTemplatesLoading}
              >
                <option value="">{feedbackTemplatesLoading ? "Formlar yukleniyor..." : "Varsayilan form"}</option>
                {(form.project_id ? feedbackTemplates : []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.is_default ? " (varsayilan)" : ""}
                    {template.project_id ? "" : " (global)"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Bos birakilirsa mevcut varsayilan degerlendirme sorulari kullanilir.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label className={labelClass}>Haritadan konum secimi</label>
                  <p className="text-xs text-slate-500">Haritaya tiklayin veya isaretciyi surukleyin; GPS alanlari otomatik guncellenir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, latitude: "", longitude: "", location_place_name: "", location_place_address: "", location_place_id: "", location_place_provider: "" }))}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Konumu temizle
                </button>
              </div>
              <ProgramLocationMap
                mode="picker"
                latitude={form.latitude}
                longitude={form.longitude}
                radiusMeters={form.radius_meters}
                placeName={form.location_place_name}
                placeAddress={form.location_place_address}
                placeId={form.location_place_id}
                placeProvider={form.location_place_provider}
                onChange={(selection) =>
                  setForm((prev) => ({
                    ...prev,
                    location: selection.placeName || selection.placeAddress || prev.location,
                    location_place_name: selection.placeName ?? "",
                    location_place_address: selection.placeAddress ?? "",
                    location_place_id: selection.placeId ?? "",
                    location_place_provider: selection.placeProvider ?? "",
                    latitude: formatCoordinate(selection.latitude),
                    longitude: formatCoordinate(selection.longitude),
                  }))
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>GPS enlem (opsiyonel)</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={form.latitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                  placeholder="41.0082..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>GPS boylam (opsiyonel)</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={form.longitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                  placeholder="28.9784..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Yoklama yaricapi (metre)</label>
                <input
                  type="number"
                  min={10}
                  value={form.radius_meters}
                  onChange={(e) => setForm((prev) => ({ ...prev, radius_meters: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Aciklama</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Program hakkında kısa bir açıklama..."
                className={inputClass}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className={labelClass}>Gorunurluk</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_public: !prev.is_public }))}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                    form.is_public
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {form.is_public ? <Globe className="h-4 w-4" /> : <GlobeLock className="h-4 w-4" />}
                  {form.is_public ? "Faaliyetler sayfasinda gorunur" : "Faaliyetler sayfasinda gizli"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_featured: !prev.is_featured }))}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                    form.is_featured
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {form.is_featured ? "Anasayfa one cikari adayi" : "Anasayfa one cikarma yok"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={submitting || !canWriteSelectedProgramPeriod}
                title={!canWriteSelectedProgramPeriod && form.period_id ? "Bu dönemde program ekleme veya düzenleme işlemi kapalıdır." : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {editingProgramId ? "Kaydet" : "Programi Olustur"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingProgramId(null); setForm(initialForm); }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Vazgec
              </button>
            </div>
          </motion.form>
        )}

        {showTemplateEditor && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-5 rounded-3xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm lg:grid-cols-[320px_1fr]"
          >
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Anket Sablonlari</h2>
                <p className="mt-1 text-xs text-slate-500">Sayısal sorular ortalamaya, seçimli sorular dağılıma, metin sorular yorumlara dahil edilir.</p>
              </div>
              <select
                value={templateForm.project_id}
                onChange={(event) => {
                  setEditingTemplateId(null);
                  setTemplateForm({ ...initialTemplateForm, project_id: event.target.value });
                }}
                className={inputClass}
              >
                <option value="">Proje secin</option>
                {templateProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                {feedbackTemplatesLoading ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">Sablonlar yukleniyor...</div>
                ) : feedbackTemplates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-slate-500">Bu proje icin kayitli sablon yok.</div>
                ) : (
                  feedbackTemplates.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{template.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{template.questions?.length ?? 0} soru</p>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => editTemplate(template)} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" disabled={templateDeletingId === template.id} onClick={() => void deleteTemplate(template)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                            {templateDeletingId === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.is_default ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Varsayilan</span> : null}
                        {!template.is_active ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Pasif</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={(event) => void handleSaveTemplate(event)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900">{editingTemplateId ? "Sablonu Duzenle" : "Yeni Anket Sablonu"}</h3>
                  <p className="mt-1 text-xs text-slate-500">Program baslamadan once programa ozel sablon secilebilir.</p>
                </div>
                <button type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm({ ...initialTemplateForm, project_id: templateForm.project_id }); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Temizle
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Sablon adi</span>
                  <input value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} required />
                </label>
                <label>
                  <span className={labelClass}>Aciklama</span>
                  <input value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Kisa kullanim notu" />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={templateForm.is_default} onChange={(event) => setTemplateForm((current) => ({ ...current, is_default: event.target.checked }))} />
                  Varsayilan
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={templateForm.is_active} onChange={(event) => setTemplateForm((current) => ({ ...current, is_active: event.target.checked }))} />
                  Aktif
                </label>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Sorular</h4>
                  <button type="button" onClick={() => setTemplateForm((current) => ({ ...current, questions: [...current.questions, newTemplateQuestion(current.questions.length + 1)] }))} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                    <Plus className="h-3.5 w-3.5" />
                    Soru Ekle
                  </button>
                </div>

                {templateForm.questions.map((question, index) => (
                  <div key={`${question.question_key}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_150px_auto]">
                      <input value={question.question_key} onChange={(event) => updateTemplateQuestion(index, { question_key: event.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })} className={inputClass} placeholder="soru_anahtari" required />
                      <input value={question.label} onChange={(event) => updateTemplateQuestion(index, { label: event.target.value })} className={inputClass} placeholder="Soru metni" required />
                      <select value={question.type} onChange={(event) => updateTemplateQuestion(index, { type: event.target.value as FeedbackTemplateQuestionForm["type"] })} className={inputClass}>
                        <option value="rating">Sayısal puan</option>
                        <option value="choice">Seçenekli</option>
                        <option value="text">Metin</option>
                      </select>
                      <button type="button" disabled={templateForm.questions.length <= 1} onClick={() => setTemplateForm((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input type="checkbox" checked={question.is_required} onChange={(event) => updateTemplateQuestion(index, { is_required: event.target.checked })} />
                        Zorunlu
                      </label>
                      {question.type === "rating" ? (
                        <>
                          <input type="number" min={1} max={10} value={question.min_value} onChange={(event) => updateTemplateQuestion(index, { min_value: event.target.value })} className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                          <input type="number" min={1} max={10} value={question.max_value} onChange={(event) => updateTemplateQuestion(index, { max_value: event.target.value })} className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                          <span className="text-xs text-slate-500">Ortalamaya dahil edilir.</span>
                        </>
                      ) : question.type === "choice" ? (
                        <div className="flex flex-1 flex-wrap gap-2">
                          {question.options.map((option, optionIndex) => (
                            <input key={optionIndex} value={option} onChange={(event) => { const nextOptions = [...question.options]; nextOptions[optionIndex] = event.target.value; updateTemplateQuestion(index, { options: nextOptions }); }} className="min-w-[120px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder={`Seçenek ${optionIndex + 1}`} />
                          ))}
                          <button type="button" onClick={() => updateTemplateQuestion(index, { options: [...question.options, "Yeni seçenek"] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            Seçenek Ekle
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Yorum olarak saklanır; sayısal ortalamaya dahil edilmez.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={templateSaving || !templateForm.project_id} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60">
                  {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {editingTemplateId ? "�?ablonu Kaydet" : "�?ablon Oluştur"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Panel bolumu */}
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {/* Panel bolumu */}
        <div className="panel-filter-card">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_minmax(360px,440px)] lg:items-end">
            <label className="panel-field">
              <span className="panel-label">Arama</span>
              <div className="relative">
                <Search className="panel-control-icon" />
                <input
                  type="text"
                  placeholder="Program, proje veya konum ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="panel-control pl-10"
                />
              </div>
            </label>
            <ProjectPeriodFilters
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedPeriodId={selectedPeriodId}
              onProjectChange={(value) => {
                setSelectedProjectId(value);
                const project = projects.find((item) => String(item.id) === value);
                setSelectedPeriodId(value === "all" ? "all" : defaultPeriodIdForProject(project) || "all");
              }}
              onPeriodChange={setSelectedPeriodId}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            />
          </div>
        </div>
        {/* Panel bolumu */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="panel-empty-card py-16">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">Secili filtrelerde program bulunamadi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPrograms.map((program, index) => {
              const programStatus = normalizeStatus(program.status);
              const cfg = statusConfig[programStatus];
              const programPeriod = periodOptionById(projects, program.period?.id);
              const canWriteProgram = periodHasWriteCapability(programPeriod, "create_operations");
              const canResolveProgram = periodHasWriteCapability(programPeriod, "resolve_operations");
              const canCompleteThisProgram = canResolveProgram && programStatus !== "completed" && programStatus !== "cancelled";
              const qrWindowOpen = isProgramAttendanceWindowOpen(program);
              const canStartQrForProgram = canResolveProgram && (programStatus === "scheduled" || programStatus === "active") && qrWindowOpen;
              const canShowQrStatus = canManageQr && (programStatus === "scheduled" || programStatus === "active") && canAccessProject("programs.qr.manage", program.project_id);

              return (
                <motion.article
                  key={program.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="panel-list-card flex h-full flex-col overflow-hidden p-0 md:p-0"
                >
                  <Link href={`/panel/programs/${program.id}`} className="group flex flex-1 flex-col px-5 pb-4 pt-5 md:px-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.bg}`}>
                        <Calendar className={`h-4.5 w-4.5 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-900 transition group-hover:text-accent">
                            {fixMojibake(program.title)}
                          </h3>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-indigo-700">
                          {fixMojibake(program.project?.name ?? projectNameMap[program.project_id] ?? `Proje #${program.project_id}`)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{statusLabels[programStatus]}
                      </span>
                      {program.is_public === false ? (
                        <span className="panel-chip px-2.5"><EyeOff className="h-3 w-3" />Gizli</span>
                      ) : (
                        <span className="panel-chip panel-chip-success px-2.5"><Eye className="h-3 w-3" />Yayında</span>
                      )}
                      {program.is_featured ? <span className="panel-chip panel-chip-warning px-2.5"><Sparkles className="h-3 w-3" />Öne çıkan</span> : null}
                    </div>

                    <p className="mt-4 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">
                      {fixMojibake(program.description) || "Program açıklaması girilmemiş."}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{formatIstanbulDateTimeDisplay(program.start_at)}{program.end_at ? ` – ${formatIstanbulDateTimeDisplay(program.end_at)}` : ""}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="line-clamp-1">{fixMojibake(program.location_place_name ?? program.location) || "Konum belirtilmemiş"}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {program.period?.name ? <span className="panel-chip px-2.5">{fixMojibake(program.period.name)}</span> : null}
                      {(program.target_audience?.length ? program.target_audience : (["student"] as Array<"student" | "alumni">)).map((audience) => (
                        <span key={audience} className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${audience === "alumni" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {audienceLabels[audience]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center">
                      <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-sm font-black text-slate-800">{program.application_quota ?? "∞"}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Kontenjan</p></div>
                      {canViewAttendanceStats && canAccessProject("programs.attendance.view", program.project_id) ? (
                        <>
                          <div className="rounded-xl bg-emerald-50 px-2 py-2"><p className="text-sm font-black text-emerald-700">{program.attendance_count ?? 0}</p><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/70">Yoklama</p></div>
                          <div className="rounded-xl bg-indigo-50 px-2 py-2"><p className="text-sm font-black text-indigo-700">{program.feedback_count ?? 0}</p><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600/70">Görüş</p></div>
                        </>
                      ) : <div className="col-span-2 flex items-center justify-center rounded-xl bg-orange-50 px-2 py-2 text-[10px] font-bold text-orange-700">Detayı görüntüle</div>}
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                      {canViewAttendanceStats && canAccessProject("programs.attendance.view", program.project_id) && (
                        <button
                          onClick={() => void openAttendanceModal(program)}
                          className="panel-card-action w-full px-2.5"
                        >
                          <SquareCheckBig className="h-3.5 w-3.5" />
                          Yoklama
                        </button>
                      )}
                      {programStatus === "completed" && canAccessProject("programs.view", program.project_id) && (
                        <button
                          onClick={() => void openFeedbackModal(program)}
                          className="panel-card-action panel-card-action-info w-full px-2.5"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Degerlendirme
                        </button>
                      )}
                      {canViewMedia && canAccessProject("programs.view", program.project_id) && (
                        <button
                          onClick={() => void openGalleryModal(program)}
                          className="panel-card-action w-full px-2.5"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Galeri
                        </button>
                      )}
                      {canUpdatePrograms && canAccessProject("programs.update", program.project_id) && (
                        <button
                          type="button"
                          disabled={visibilityTogglingId === program.id || !canWriteProgram}
                          title={!canWriteProgram ? "Bu dönem normal değişikliklere kapalıdır." : undefined}
                          onClick={() => void handleToggleVisibility(program, "is_public")}
                          className={`panel-card-action w-full px-2.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                            program.is_public !== false
                              ? ""
                              : "panel-card-action-success"
                          }`}
                        >
                          {visibilityTogglingId === program.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : program.is_public !== false ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Globe className="h-3.5 w-3.5" />
                          )}
                          {program.is_public !== false ? "Gizle" : "Yayinla"}
                        </button>
                      )}
                      {canUpdatePrograms && canAccessProject("programs.update", program.project_id) && (
                        <button
                          disabled={!canWriteProgram}
                          title={!canWriteProgram ? "Bu dönem normal değişikliklere kapalıdır." : undefined}
                          onClick={() => openEditForm(program)}
                          className="panel-card-action w-full px-2.5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Duzenle
                        </button>
                      )}
                      {canCompletePrograms && canCompleteThisProgram && canAccessProject("programs.complete", program.project_id) && (
                        <button
                          onClick={() => void handleComplete(program.id)}
                          className="panel-card-action panel-card-action-success w-full px-2.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Tamamla
                        </button>
                      )}
                      {canShowQrStatus && canStartQrForProgram && (
                        <Link
                          href={`/panel/programs/${program.id}/qr?title=${encodeURIComponent(fixMojibake(program.title))}`}
                          className="panel-card-action panel-card-action-primary w-full px-2.5"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          QR Yoklama
                        </Link>
                      )}
                      {canShowQrStatus && !canStartQrForProgram && (
                        <button
                          type="button"
                          disabled
                          title="QR yoklama sadece program saat araliginda baslatilabilir."
                          className="panel-card-action w-full cursor-not-allowed bg-slate-100 px-2.5 text-slate-500"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          QR Saat Disi
                        </button>
                      )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Panel bolumu */}
        {attendanceModalProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Yoklama Detaylari</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {attendanceModalProgram.title}
                    {attendanceUpdatedAt ? ` - Son guncelleme: ${formatIstanbulTimeDisplay(attendanceUpdatedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void openAttendanceModal(attendanceModalProgram)}
                    disabled={attendanceLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {attendanceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Yenile
                  </button>
                  <PermissionGate
                    permission="programs.attendance.export"
                    requireProjectAccess={{
                      permission: "programs.attendance.export",
                      projectId: attendanceModalProgram.project_id,
                    }}
                  >
                    <ExportButtons
                      endpoint={`/panel/programs/${attendanceModalProgram.id}/attendances/export`}
                      filename={`program_${attendanceModalProgram.id}_yoklama`}
                      buttonLabel="Dışa Aktar"
                    />
                  </PermissionGate>
                  <button
                    type="button"
                    onClick={() => setAttendanceModalProgram(null)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {attendanceSummary && (
                <div className="shrink-0 grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-4 md:grid-cols-6">
                  {[
                    { label: "Katilimci", val: attendanceSummary.participant_count ?? 0 },
                    { label: "Gelen", val: attendanceSummary.attendance_count },
                    { label: "Gelmeyen", val: attendanceSummary.absent_count ?? 0 },
                    { label: "Geri bildirim", val: attendanceSummary.feedback_count },
                    { label: "Kredi kesildi", val: attendanceSummary.deduction_count ?? 0 },
                    { label: "Kredi iade", val: attendanceSummary.restore_count ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white p-3 text-center shadow-sm">
                      <p className="text-xl font-black text-slate-900">{item.val}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Katilimci</th>
                      <th className="px-5 py-3">Durum</th>
                      <th className="px-5 py-3">Yontem</th>
                      <th className="px-5 py-3">Kredi</th>
                      <th className="px-5 py-3">Geri bildirim</th>
                      <th className="px-5 py-3">Kayit zamani</th>
                      {canManageAttendance && canAccessProject("programs.attendance.manage", attendanceModalProgram.project_id) && (
                        <th className="px-5 py-3 text-right">Islem</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                        </td>
                      </tr>
                    ) : attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                          Kayit bulunamadi.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((record) => (
                        <tr key={record.id ?? record.participant_id ?? record.student} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-900">{record.student}</p>
                            <p className="text-xs text-slate-400">
                              {record.email ?? "-"} - {record.role === "alumni" ? "Mezun" : "Öğrenci"}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.is_valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {record.is_valid ? "Geldi" : "Gelmedi"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600">{record.method ?? "-"}</td>
                          <td className="px-5 py-3 text-xs text-slate-600">
                            {record.credit_applicable === false
                              ? "Kredi yok"
                              : record.credit_restored
                                ? "Iade edildi"
                                : record.credit_deducted
                                  ? "Kesildi"
                                  : "-"}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600">
                            {record.feedback_submitted ? "Gonderdi" : record.is_valid ? "Bekliyor" : "Hak yok"}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {record.recorded_at ? formatIstanbulDateTimeDisplay(record.recorded_at) : "-"}
                          </td>
                          {canManageAttendance && canAccessProject("programs.attendance.manage", attendanceModalProgram.project_id) && (
                            <td className="px-5 py-3 text-right">
                              {record.participant_id ? (
                                <button
                                  type="button"
                                  onClick={() => void updateManualAttendance(record, !record.is_valid)}
                                  disabled={attendanceActionLoading === record.participant_id || !canResolveAttendancePeriod}
                                  title={!canResolveAttendancePeriod ? "Bu dönemde yoklama sonuçlandırma işlemi kapalıdır." : undefined}
                                  className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                    record.is_valid
                                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {attendanceActionLoading === record.participant_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : record.is_valid ? (
                                    "Gelmedi Yap"
                                  ) : (
                                    "Katildi Yap"
                                  )}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Panel bolumu */}
        {feedbackSummaryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                    Toplu Değerlendirme Analizi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Seçili proje/dönem filtrelerine göre program değerlendirme özeti</p>
                </div>
                <div className="flex items-center gap-3">
                  <ExportButtons
                    endpoint="/panel/programs/feedback-summary/export"
                    filename="program_degerlendirme_ozeti"
                    params={{
                      project_id: selectedProjectId !== "all" ? selectedProjectId : undefined,
                      period_id: selectedPeriodId !== "all" ? selectedPeriodId : undefined,
                    }}
                    buttonLabel="Dışa Aktar"
                  />
                  <button type="button" onClick={() => setFeedbackSummaryOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {feedbackSummaryLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : !feedbackSummary || feedbackSummary.summary.total_feedback === 0 ? (
                <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-16 text-center text-sm text-slate-400">
                  Seçili filtrelerde değerlendirme verisi bulunmuyor.
                </div>
              ) : (
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { val: feedbackSummary.summary.program_count, label: "Program", color: "text-slate-700", bg: "bg-slate-50" },
                      { val: feedbackSummary.summary.total_feedback, label: "Değerlendirme", color: "text-blue-700", bg: "bg-blue-50" },
                      { val: feedbackSummary.summary.overall_average ?? "-", label: "Sayısal Ortalama", color: "text-emerald-700", bg: "bg-emerald-50" },
                      { val: feedbackSummary.summary.with_comment, label: "Yorumlu", color: "text-amber-700", bg: "bg-amber-50" },
                    ].map((item) => (
                      <div key={item.label} className={`${item.bg} rounded-2xl p-4 text-center`}>
                        <p className={`text-3xl font-black ${item.color}`}>{item.val}</p>
                        <p className={`text-xs font-semibold ${item.color} opacity-80`}>{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {[
                      { title: "Proje Karsilastirmasi", rows: feedbackSummary.project_breakdown ?? [], tone: "blue" },
                      { title: "Dönem Karşılaştırması", rows: feedbackSummary.period_breakdown ?? [], tone: "emerald" },
                    ].map((section) => (
                      <div key={section.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.title}</h3>
                          <span className="text-xs font-bold text-slate-400">{section.rows.length} kirilim</span>
                        </div>
                        <div className="space-y-3">
                          {section.rows.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">Veri yok</div>
                          ) : section.rows.map((row) => {
                            const maxFeedback = Math.max(...section.rows.map((item) => item.feedback_count), 1);
                            const widthPct = Math.max(8, (row.feedback_count / maxFeedback) * 100);
                            const barClass = section.tone === "blue" ? "bg-blue-500" : "bg-emerald-500";
                            return (
                              <div key={`${section.title}-${row.name}`} className="rounded-xl bg-slate-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                  <span className="font-bold text-slate-800">{row.name}</span>
                                  <span className="font-black text-slate-700">{row.overall_average ?? "-"} ort.</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-slate-200">
                                  <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${widthPct}%` }} />
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-500">
                                  <span>{row.program_count} program</span>
                                  <span>{row.feedback_count} cevap</span>
                                  <span>{row.with_comment} yorum</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Soru Bazli Analiz</h3>
                      {Object.entries(feedbackSummary.question_stats).map(([key, stat]) => (
                        <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-bold text-slate-900">{stat.label}</span>
                            <span className="text-sm font-black text-emerald-700">{stat.type === "choice" ? `${stat.count} cevap` : `${stat.average ?? "-"} ort.`}</span>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(stat.distribution).map(([label, count]) => {
                              const maxCount = Math.max(...Object.values(stat.distribution), 1);
                              const widthPct = (count / maxCount) * 100;
                              return (
                                <div key={label} className="space-y-1">
                                  <div className="flex justify-between gap-3 text-xs font-semibold text-slate-600">
                                    <span>{label}</span>
                                    <span>{count}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${widthPct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Program Ozeti</h3>
                      {feedbackSummary.programs.map((program) => (
                        <div key={program.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="font-bold text-slate-900">{fixMojibake(program.title)}</div>
                          <div className="mt-1 text-xs text-slate-500">{[program.project, program.period].filter(Boolean).map((item) => fixMojibake(item)).join(" / ")}</div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">{program.feedback_count}<br />cevap</div>
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{program.overall_average ?? "-"}<br />ort.</div>
                            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">{program.with_comment}<br />yorum</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {feedbackSummary.recent_comments.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Son Yorumlar</h3>
                      {feedbackSummary.recent_comments.map((comment, index) => (
                        <div key={`${comment.program_id}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <MessageSquareText className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{comment.program_title}</span>
                            <span>{comment.question}</span>
                            {comment.submitted_at ? <span className="ml-auto">{formatIstanbulDateTimeDisplay(comment.submitted_at)}</span> : null}
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {feedbackModalProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Değerlendirme İstatistikleri
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{feedbackModalProgram.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ExportButtons
                    endpoint={`/panel/programs/${feedbackModalProgram.id}/feedback-stats/export`}
                    filename={`program_${feedbackModalProgram.id}_degerlendirmeler`}
                    buttonLabel="Dışa Aktar"
                  />
                  <button type="button" onClick={() => setFeedbackModalProgram(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {feedbackLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : !feedbackStats || feedbackStats.summary.total_feedback === 0 ? (
                <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-16 text-center text-sm text-slate-400">
                  Bu program icin henuz degerlendirme gonderilmemis.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { val: feedbackStats.summary.total_feedback, label: "Toplam Değerlendirme", color: "text-blue-700", bg: "bg-blue-50" },
                      { val: feedbackStats.summary.overall_average ?? "-", label: "Sayısal Ortalama", color: "text-emerald-700", bg: "bg-emerald-50" },
                      { val: feedbackStats.summary.with_comment, label: "Yorumlu", color: "text-amber-700", bg: "bg-amber-50" },
                    ].map((item) => (
                      <div key={item.label} className={`${item.bg} rounded-2xl p-4 text-center`}>
                        <p className={`text-3xl font-black ${item.color}`}>{item.val}</p>
                        <p className={`text-xs font-semibold ${item.color} opacity-80`}>{item.label}</p>
                      </div>
                    ))}
                  </div>


                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Soru Tipi Ayrimi</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-center text-xs md:grid-cols-4">
                      <div className="rounded-xl bg-white p-3 text-emerald-700">
                        <div className="text-lg font-black">{feedbackStats.summary.rating_question_count ?? 0}</div>
                        <div>sayisal soru</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-blue-700">
                        <div className="text-lg font-black">{feedbackStats.summary.choice_question_count ?? 0}</div>
                        <div>secimli soru</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-amber-700">
                        <div className="text-lg font-black">{feedbackStats.summary.text_question_count ?? 0}</div>
                        <div>yazili soru</div>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-slate-700">
                        <div className="text-lg font-black">{feedbackStats.summary.text_response_count ?? 0}</div>
                        <div>yazili cevap</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Soru Bazli Analiz</h3>
                    {Object.entries(feedbackStats.question_stats).map(([key, stat]) => (
                      <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-bold text-slate-900">{stat.label}</span>
                          <span className="text-lg font-black text-blue-700">
                            {stat.type === "choice" ? `${stat.count} cevap` : `${stat.average ?? "-"} / 5`}
                          </span>
                        </div>
                        {stat.type === "choice" ? (
                          <div className="space-y-2">
                            {Object.entries(stat.distribution).map(([option, count]) => {
                              const maxCount = Math.max(...Object.values(stat.distribution), 1);
                              const widthPct = (count / maxCount) * 100;

                              return (
                                <div key={option} className="space-y-1">
                                  <div className="flex justify-between gap-3 text-xs font-semibold text-slate-600">
                                    <span>{option}</span>
                                    <span>{count}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${widthPct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-end gap-2">
                            {[1, 2, 3, 4, 5].map((score) => {
                              const count = stat.distribution[String(score)] ?? 0;
                              const maxCount = Math.max(...Object.values(stat.distribution), 1);
                              const heightPct = (count / maxCount) * 100;
                              return (
                                <div key={score} className="flex flex-1 flex-col items-center gap-1">
                                  <span className="text-xs font-bold text-slate-600">{count}</span>
                                  <div className="relative w-full rounded-t bg-slate-200" style={{ height: "56px" }}>
                                    <div
                                      className="absolute bottom-0 w-full rounded-t bg-blue-500 transition-all"
                                      style={{ height: `${heightPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-500">{score}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {(feedbackStats.text_responses?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Anonim Yazili Yanit Raporu</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          {feedbackStats.summary.identity_redacted ? "Kimlikler gizli" : "Anonim"}
                        </span>
                      </div>
                      {feedbackStats.text_responses?.map((item, index) => (
                        <div key={`${item.anonymous_report_id}-${item.question_id}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <MessageSquareText className="h-3.5 w-3.5 text-blue-400" />
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">Anonim #{item.anonymous_report_id}</span>
                            <span>{item.question}</span>
                            {item.submitted_at && (
                              <span className="ml-auto">{formatIstanbulDateTimeDisplay(item.submitted_at)}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panel bolumu */}
        {galleryModalProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <ImageIcon className="h-5 w-5 text-indigo-600" />
                    Fotograf Galerisi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{galleryModalProgram.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdatePrograms && canAccessProject("programs.update", galleryModalProgram.project_id) ? (
                    <button
                      type="button"
                      disabled={visibilityTogglingId === galleryModalProgram.id || !canWriteGalleryPeriod}
                      title={!canWriteGalleryPeriod ? "Bu dönem normal değişikliklere kapalıdır." : undefined}
                      onClick={() => void handleToggleVisibility(galleryModalProgram, "is_featured")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        galleryModalProgram.is_featured
                          ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {galleryModalProgram.is_featured ? "Öne çıkan (kaldır)" : "Öne çıkanlara ekle"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setGalleryModalProgram(null)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {galleryLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : galleryPhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-400">
                    {canManageMedia && canAccessProject("programs.media.upload", galleryModalProgram.project_id)
                      ? "Henüz fotoğraf eklenmemiş. Aşağıdan bir fotoğraf yükleyin."
                      : "Henüz fotoğraf eklenmemiş."}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {galleryPhotos.map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="relative h-40 bg-slate-100">
                          <Image
                            src={photo.url}
                            alt={photo.caption ?? "Program fotografi"}
                            fill
                            unoptimized
                            className="object-cover"
                            onError={(event) => {
                              event.currentTarget.classList.add("opacity-0");
                              event.currentTarget.parentElement?.querySelector("[data-photo-error]")?.classList.remove("hidden");
                            }}
                          />
                          <div data-photo-error className="hidden absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-xs font-medium text-slate-500">
                            <ImageIcon className="mb-2 h-6 w-6 text-slate-400" />
                            Gorsel URL adresi acilamadi
                          </div>
                        </div>
                        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
                          <p className="min-w-0 flex-1 text-xs font-medium text-slate-600 line-clamp-2">
                            {photo.caption || "Aciklama yok"}
                          </p>
                          {canManageMedia && canAccessProject("programs.media.upload", galleryModalProgram.project_id) ? (
                            <button
                              type="button"
                              disabled={photoDeletingId === photo.id || !canWriteGalleryPeriod}
                              onClick={() => void handleDeletePhoto(photo.id)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              title="Fotoğrafı sil"
                            >
                              {photoDeletingId === photo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Sil
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canManageMedia && canAccessProject("programs.media.upload", galleryModalProgram.project_id) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-800">Yeni fotograf ekle</h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className={labelClass}>Aciklama (opsiyonel)</label>
                      <input
                        type="text"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        placeholder="Fotoğraf açıklaması..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          void (async () => {
                            for (const file of Array.from(files)) {
                              await handleUploadPhoto(file);
                            }
                          })();
                        }}
                      />
                      <button
                        type="button"
                        disabled={photoUploading || !canWriteGalleryPeriod}
                        title={!canWriteGalleryPeriod ? "Bu döneme yeni fotoğraf yüklenemez." : undefined}
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Yukle
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">JPEG, PNG veya WEBP. Birden fazla dosya secebilirsiniz; sunucu PHP limitleri (upload_max_filesize / post_max_size) gecerli olur.</p>
                </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
