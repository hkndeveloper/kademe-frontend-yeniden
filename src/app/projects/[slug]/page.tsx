"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  FileText,
  Gift,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquareText,
  Sparkles,
  Users,
  ZoomIn,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { PublicBreadcrumbs } from "@/components/shared/PublicBreadcrumbs";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { PublicBadge, PublicGradientTitle } from "@/components/public";
import { useAuth } from "@/store/useAuth";

interface ActivePeriod {
  id: number;
  name: string;
  status?: string;
}

interface Alumni {
  id: number;
  year: string;
  name: string;
  university: string;
  department?: string | null;
  class_year?: number | string | null;
  job?: string;
  image?: string;
  period_name?: string | null;
  period?: ActivePeriod | null;
}

interface PublicStudent {
  id: number;
  name: string;
  university?: string | null;
  department?: string | null;
  class_year?: number | string | null;
  image?: string | null;
  period_name?: string | null;
  period?: ActivePeriod | null;
}

interface PublicStudentGroup<TStudent extends PublicStudent = PublicStudent> {
  year: string;
  students: TStudent[];
}

interface ApplicationField {
  id?: string;
  key?: string;
  type: "text" | "longtext" | "select" | "radio" | "checkbox" | "file";
  label: string;
  required?: boolean;
  options?: string[];
}

interface ApplicationFormData {
  id: number;
  fields: ApplicationField[];
  require_consent?: boolean;
  consent_text?: string | null;
  is_active: boolean;
}

interface ProjectDetail {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  shoet_description: string;
  cover_image: string | null;
  status: string;
  is_application_open: boolean;
  has_interview?: boolean;
  quota?: number | null;
  active_period: ActivePeriod | null;
  next_application_date?: string | null;
  gallery?: string[];
  gallery_items?: Array<{
    path?: string;
    url: string;
    caption?: string | null;
    year?: string | null;
    period_id?: number | null;
    period_name?: string | null;
  }>;
  active_students?: PublicStudent[];
  active_student_groups?: PublicStudentGroup[];
  alumni?: Alumni[];
  alumni_groups?: PublicStudentGroup<Alumni>[];
}

interface PublicGalleryItem {
  path?: string;
  url: string;
  caption?: string | null;
  year?: string | null;
  period_id?: number | null;
  period_name?: string | null;
}

interface PublicProgram {
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
  guest_info?: unknown;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
  period?: ActivePeriod | null;
}

interface ProjectProgramsPayload {
  summary: {
    total: number;
    upcoming: number;
    completed: number;
  };
  upcoming: PublicProgram[];
  recent_completed: PublicProgram[];
  calendar_months?: Array<{ key: string; label: string; year?: number; month?: number; count: number }>;
}

interface ProjectSpecialsPayload {
  module_keys: string[];
  internships?: {
    total: number;
    active: number;
    companies: string[];
    positions: string[];
  };
  mentors?: Array<{
    id: number;
    name: string;
    bio?: string | null;
    expertise?: string | null;
    photo?: string | null;
  }>;
  reward_tiers?: Array<{
    id: number;
    name: string;
    description?: string | null;
    min_badges?: number | null;
    min_credits?: number | null;
    reward_description?: string | null;
  }>;
  eurodesk_projects?: Array<{
    id: number;
    title: string;
    partner_organizations?: string[];
    grant_amount?: string | number | null;
    grant_status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  kpd?: {
    rooms: Array<{
      id: number;
      name: string;
      description?: string | null;
    }>;
  };
}

interface ProjectResponse {
  project: ProjectDetail;
  current_period?: ActivePeriod | null;
  application_form?: ApplicationFormData | null;
  programs?: ProjectProgramsPayload;
  project_specials?: ProjectSpecialsPayload;
}

const hasProgramCoordinates = (program: PublicProgram) =>
  program.latitude !== null &&
  program.latitude !== undefined &&
  program.latitude !== "" &&
  program.longitude !== null &&
  program.longitude !== undefined &&
  program.longitude !== "";
function programStatusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Planlandı",
    active: "Aktif",
    completed: "Tamamlandı",
    cancelled: "İptal",
  };
  return map[status] ?? status;
}
function projectStatusLabel(status?: string | null): string {
  const map: Record<string, string> = {
    active: "Aktif",
    inactive: "Pasif",
    draft: "Taslak",
    archived: "Arşivlendi",
    completed: "Tamamlandı",
  };
  if (!status) return "Belirtilmedi";
  return map[status] ?? status;
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData | null>(null);
  const [programs, setPrograms] = useState<ProjectProgramsPayload | null>(null);
  const [projectSpecials, setProjectSpecials] = useState<ProjectSpecialsPayload | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | string[] | File | null>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [guestApplicant, setGuestApplicant] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guestApplySuccess, setGuestApplySuccess] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get<ProjectResponse>(`/projects/${params.slug}`);
        setProject(response.data.project);
        setApplicationForm(response.data.application_form ?? null);
        setPrograms(response.data.programs ?? null);
        setProjectSpecials(response.data.project_specials ?? null);
        setGuestApplySuccess(false);
        setMessage(null);

        const nextFormValues: Record<string, string | string[] | File | null> = {};
        for (const field of response.data.application_form?.fields ?? []) {
          const fieldId = field.id ?? field.key;
          if (!fieldId) continue;
          nextFormValues[fieldId] = field.type === "checkbox" ? [] : field.type === "file" ? null : "";
        }
        setFormValues(nextFormValues);
        setConsentAccepted(false);
      } catch (error) {
        console.error("Proje bulunamadi", error);
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      void fetchProject();
    }
  }, [params.slug, router]);

  useEffect(() => {
    if (!lightboxUrl) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxUrl(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  const buildApplicationPayload = () => {
    const hasFile = Object.values(formValues).some((value) => value instanceof File);

    if (!hasFile) {
      return {
        payload: {
          project_id: project?.id,
          period_id: project?.active_period?.id,
          program_id: selectedProgramId,
          form_data: formValues,
          consent_accepted: consentAccepted,
          applicant: {
            name: guestApplicant.name.trim(),
            surname: guestApplicant.surname.trim(),
            email: guestApplicant.email.trim(),
            phone: guestApplicant.phone.trim() || null,
          },
        },
        config: undefined,
      };
    }

    const data = new FormData();
    data.append("project_id", String(project?.id ?? ""));
    data.append("period_id", String(project?.active_period?.id ?? ""));
    if (selectedProgramId) data.append("program_id", String(selectedProgramId));
    data.append("consent_accepted", consentAccepted ? "1" : "0");

    for (const [key, value] of Object.entries(formValues)) {
      if (value instanceof File) {
        data.append(`form_files[${key}]`, value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => data.append(`form_data[${key}][]`, item));
      } else if (value !== null && value !== undefined) {
        data.append(`form_data[${key}]`, value);
      }
    }

    data.append("applicant[name]", guestApplicant.name.trim());
    data.append("applicant[surname]", guestApplicant.surname.trim());
    data.append("applicant[email]", guestApplicant.email.trim());
    if (guestApplicant.phone.trim()) data.append("applicant[phone]", guestApplicant.phone.trim());

    return {
      payload: data,
      config: { headers: { "Content-Type": "multipart/form-data" } },
    };
  };

  const validateApplicationInputs = (): string | null => {
    if (!isAuthenticated) {
      if (!guestApplicant.name.trim() || !guestApplicant.surname.trim() || !guestApplicant.email.trim()) {
        return "Lütfen ad, soyad ve e-posta bilgilerinizi doldurun.";
      }
      const email = guestApplicant.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Geçerli bir e-posta adresi girin.";
      }
    }
    for (const field of applicationForm?.fields ?? []) {
      const fieldId = field.id ?? field.key;
      if (!fieldId || !field.required) {
        continue;
      }
      const val = formValues[fieldId];
      if (field.type === "checkbox") {
        if (!Array.isArray(val) || val.length === 0) {
          return `"${field.label}" seçeneği zorunludur.`;
        }
      } else if (field.type === "file") {
        if (!val) {
          return `"${field.label}" için dosya yüklemeniz gerekir.`;
        }
      } else if (!String(val ?? "").trim()) {
        return `"${field.label}" zorunludur.`;
      }
    }
    return null;
  };

  const handleApply = async (programId?: number | null) => {
    if (!project) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    const nextProgramId = programId !== undefined ? programId : selectedProgramId;
    setSelectedProgramId(nextProgramId ?? null);

    if (!project.active_period) {
      setErrorMessage("Bu proje için aktif dönem bulunmuyor.");
      return;
    }

    const needsApplicationModal = !isAuthenticated || (applicationForm?.fields?.length ?? 0) > 0 || Boolean(applicationForm?.require_consent);

    if (!showApplicationForm && needsApplicationModal) {
      setShowApplicationForm(true);
      return;
    }

    if (applicationForm?.require_consent && !consentAccepted) {
      setErrorMessage("Başvuru koşullarını kabul etmeniz gerekiyor.");
      return;
    }

    const validationError = validateApplicationInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setApplying(true);
    try {
      const { payload, config } = buildApplicationPayload();
      if (isAuthenticated) {
        await api.post(
          "/applications",
          payload instanceof FormData
            ? payload
            : {
                project_id: project.id,
                period_id: project.active_period.id,
                program_id: nextProgramId,
                form_data: formValues,
                consent_accepted: consentAccepted,
              },
          config,
        );
        setMessage("Başvurunuz alındı. Durumu öğrenci panelinizde görebilirsiniz.");
        router.push("/student/applications");
      } else {
        await api.post("/applications/public", payload, config);
        setGuestApplySuccess(true);
        setShowApplicationForm(false);
        setMessage(
          "Başvurunuz alındı. E-posta adresinize bilgilendirme gelebilir. Başvurularınızı takip etmek için hesap oluşturabilirsiniz.",
        );
      }
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const responseMessage =
          error.response?.data?.message ||
          Object.values(error.response?.data?.errors ?? {})
            .flat()
            .join(" ");
        setErrorMessage(responseMessage || "Başvuru sırasında bir hata oluştu.");
      } else {
        setErrorMessage("Başvuru sırasında bir hata oluştu.");
      }
    } finally {
      setApplying(false);
    }
  };

  const activeStudentGroups = useMemo<PublicStudentGroup[]>(() => {
    if (project?.active_student_groups?.length) {
      return project.active_student_groups;
    }

    const activeStudents = project?.active_students ?? [];
    return activeStudents.length > 0 ? [{ year: "Aktif", students: activeStudents }] : [];
  }, [project?.active_student_groups, project?.active_students]);

  const alumniGroups = useMemo<PublicStudentGroup<Alumni>[]>(() => {
    if (project?.alumni_groups?.length) {
      return project.alumni_groups;
    }

    const grouped = (project?.alumni ?? []).reduce((acc, curr) => {
      (acc[curr.year] = acc[curr.year] || []).push(curr);
      return acc;
    }, {} as Record<string, Alumni[]>);

    return Object.entries(grouped)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, students]) => ({ year, students }));
  }, [project]);

  const galleryItems = useMemo<PublicGalleryItem[]>(() => {
    const detailed = project?.gallery_items?.filter((item) => item.url) ?? [];
    if (detailed.length > 0) {
      return detailed;
    }

    return (project?.gallery ?? []).map((url) => ({
      url,
      caption: null,
      year: null,
      period_name: null,
    }));
  }, [project?.gallery, project?.gallery_items]);
  const groupedGalleryItems = useMemo(() => {
    return galleryItems.reduce((acc, item) => {
      const key = item.period_name || item.year || "Galeri";
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {} as Record<string, typeof galleryItems>);
  }, [galleryItems]);
  const upcomingPrograms = useMemo(() => programs?.upcoming ?? [], [programs?.upcoming]);
  const completedPrograms = useMemo(() => programs?.recent_completed ?? [], [programs?.recent_completed]);
  const calendarMonths = programs?.calendar_months ?? [];

  const selectedProgramTitle = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }
    const combined = [...upcomingPrograms, ...completedPrograms];
    return combined.find((p) => p.id === selectedProgramId)?.title ?? null;
  }, [selectedProgramId, upcomingPrograms, completedPrograms]);

  const hasSpecialContent = Boolean(
    (projectSpecials?.internships && projectSpecials.internships.total > 0) ||
      (projectSpecials?.mentors?.length ?? 0) > 0 ||
      (projectSpecials?.reward_tiers?.length ?? 0) > 0 ||
      (projectSpecials?.eurodesk_projects?.length ?? 0) > 0 ||
      (projectSpecials?.kpd?.rooms?.length ?? 0) > 0,
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Tarih belirtilmedi";
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Tarih belirtilmedi";
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  };

  const formatCalendarMonthLabel = (month: { label: string; year?: number; month?: number }) => {
    if (typeof month.year === "number" && typeof month.month === "number") {
      return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(month.year, month.month - 1, 1));
    }
    return month.label;
  };

  const updateFormValue = (fieldId: string, value: string | string[] | File | null) => {
    setFormValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const renderField = (field: ApplicationField) => {
    const fieldId = field.id ?? field.key;
    if (!fieldId) return null;

    const commonClassName =
      "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
    const value = formValues[fieldId];

    if (field.type === "longtext") {
      return (
        <textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => updateFormValue(fieldId, event.target.value)}
          className={`${commonClassName} resize-none`}
          placeholder={field.label}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => updateFormValue(fieldId, event.target.value)}
          className={commonClassName}
        >
          <option value="">Seçim yapın</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "radio") {
      return (
        <div className="space-y-3">
          {(field.options ?? []).map((option) => (
            <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                name={fieldId}
                checked={value === option}
                onChange={() => updateFormValue(fieldId, option)}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }

    if (field.type === "checkbox") {
      const currentValue = Array.isArray(value) ? value : [];

      return (
        <div className="space-y-3">
          {(field.options ?? []).map((option) => {
            const checked = currentValue.includes(option);
            return (
              <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    updateFormValue(
                      fieldId,
                      checked ? currentValue.filter((item) => item !== option) : [...currentValue, option],
                    )
                  }
                />
                {option}
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === "file") {
      return (
        <input
          type="file"
          onChange={(event) => updateFormValue(fieldId, event.target.files?.[0] ?? null)}
          className={commonClassName}
        />
      );
    }

    return (
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => updateFormValue(fieldId, event.target.value)}
        className={commonClassName}
        placeholder={field.label}
      />
    );
  };

  const renderProgramCard = (program: PublicProgram) => (
    <div key={program.id} className="kdm-public-magnetic-card rounded-[1.5rem] border border-white bg-white/90 p-4 shadow-[0_16px_40px_rgba(9,9,11,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#fd3a25]/30">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#292c2e]">{program.title}</p>
          {program.period?.name ? <p className="mt-1 text-xs text-[#71717a]">{program.period.name}</p> : null}
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-600">
          {programStatusLabel(program.status)}
        </span>
      </div>
      <div className="space-y-2 text-xs text-[#71717a]">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <span>{formatDateTime(program.start_at)}</span>
        </div>
        {program.location ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span>{program.location}</span>
          </div>
        ) : null}
      </div>
      {program.description ? <p className="mt-3 line-clamp-3 text-sm text-[#71717a]">{program.description}</p> : null}
      {hasProgramCoordinates(program) ? (
        <div className="mt-4">
          <ProgramLocationMap
            latitude={program.latitude}
            longitude={program.longitude}
            radiusMeters={program.radius_meters}
            placeName={program.location_place_name}
            placeAddress={program.location_place_address}
            placeId={program.location_place_id}
            placeProvider={program.location_place_provider}
            heightClassName="h-44"
          />
        </div>
      ) : null}
      {project?.is_application_open && program.status !== "completed" ? (
        <button
          type="button"
          onClick={() => void handleApply(program.id)}
          className="kdm-public-btn-shine kdm-public-btn-brand mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:-translate-y-0.5"
        >
          Programa Başvur
        </button>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className="kdm-public-shell flex min-h-screen items-center justify-center bg-[#edecec]">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!project) return null;

  const StudentCard = ({ student, alumni = false }: { student: PublicStudent | Alumni; alumni?: boolean }) => (
    <div className="flex items-center gap-4 rounded-[1.35rem] border border-white bg-white/72 p-4 shadow-[0_12px_36px_rgba(9,9,11,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f4f4f5]">
        {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-[#292c2e]">{student.name}</p>
        <p className="text-xs text-[#71717a]">
          {student.university || "Üniversite bilgisi yok"}
          {student.department ? ` / ${student.department}` : ""}
          {student.class_year ? ` / ${student.class_year}. Sınıf` : ""}
        </p>
        {student.period_name ? (
          <p className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
            Dönem: {student.period_name}
          </p>
        ) : null}
        {alumni && "job" in student && student.job ? <p className="mt-1 text-[10px] text-orange-600">{student.job}</p> : null}
      </div>
    </div>
  );

  const hasDynamicForm = (applicationForm?.fields?.length ?? 0) > 0;
  const needsApplicationModal = !isAuthenticated || hasDynamicForm || Boolean(applicationForm?.require_consent);
  const detailHeroImage = project.cover_image || "/aigocy/images/section/work-single-1.jpg";

  return (
    <div className="kdm-public-shell min-h-screen bg-[#edecec] pb-24">
      <section className="relative isolate overflow-hidden px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <div className="kdm-public-detail-hero-bg absolute inset-x-4 bottom-0 top-4 -z-10 overflow-hidden sm:inset-x-6 lg:inset-x-10">
          <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill className="object-cover opacity-55" priority />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(255,255,255,0.88),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_16rem),linear-gradient(180deg,rgba(255,255,255,0.36),rgba(231,231,228,0.86))]" />
        </div>

        <div className="container relative z-10 mx-auto">
          <PublicBreadcrumbs
            className="mb-6 justify-center"
            items={[
              { label: "Ana Sayfa", href: "/" },
              { label: "Projeler", href: "/projects" },
              { label: project.name },
            ]}
          />

          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <Link
              href="/projects"
              className="kdm-public-btn-shine mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#09090b] shadow-[0_10px_30px_rgba(9,9,11,0.10)] transition hover:-translate-y-0.5 hover:text-[#fd3a25]"
            >
              <ArrowLeft className="h-4 w-4" />
              Tüm projelere dön
            </Link>
            <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">
              <Sparkles className="h-3.5 w-3.5" />
              {project.type || "Proje"}
            </PublicBadge>
            <h1 className="max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-normal text-[#2f3437] sm:text-6xl lg:text-8xl">
              {project.name}
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#3f4653] sm:text-lg">
              {project.shoet_description || "Bu proje için kısa tanıtım metni bulunmuyor."}
            </p>
          </div>

          <div className="kdm-public-media-frame relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border-[10px] border-[#09090b] bg-[#09090b] kdm-public-dark-gradient shadow-[0_34px_90px_rgba(9,9,11,0.22)]">
            <div className="relative aspect-[16/8] min-h-[280px]">
              <Image src={detailHeroImage} alt={project.name} fill unoptimized priority className="object-cover" sizes="(min-width: 1024px) 1100px, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/72 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur">{projectStatusLabel(project.status)}</span>
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur">{project.active_period?.name || "Aktif dönem yok"}</span>
                <span className="rounded-full bg-[#fd3a25] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(253,58,37,0.35)]">{project.is_application_open ? "Başvuru açık" : "Başvuru kapalı"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:gap-10 lg:py-20">
        <div className="space-y-10 lg:col-span-2">
          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-orange-600" />
              Proje Hakkında
            </h2>
            <div className="leading-8 text-[#52525b]">
              {project.description || "Bu proje için detaylı açıklama henüz eklenmemiş."}
            </div>
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="h-6 w-6 text-orange-600" />
              Proje Durumu
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="kdm-public-info-tile rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">Durum</p>
                <p className="mt-2 text-sm font-bold text-[#292c2e]">{projectStatusLabel(project.status)}</p>
              </div>
              <div className="kdm-public-info-tile rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">Aktif Dönem</p>
                <p className="mt-2 text-sm font-bold text-[#292c2e]">{project.active_period?.name || "Yok"}</p>
              </div>
              <div className="kdm-public-info-tile rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">Başvuru</p>
                <p className="mt-2 text-sm font-bold text-[#292c2e]">{project.is_application_open ? "Açık" : "Kapalı"}</p>
              </div>
              <div className="kdm-public-info-tile rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">Akış</p>
                <p className="mt-2 text-sm font-bold text-[#292c2e]">{project.has_interview ? "Mülakatlı" : "Mülakatsız"}</p>
              </div>
            </div>
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Calendar className="h-6 w-6 text-orange-600" />
                Program Akışı ve Takvim
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-100/40 px-3 py-2">
                  <p className="font-extrabold text-[#292c2e]">{programs?.summary.total ?? 0}</p>
                  <p className="text-[#71717a]">Toplam</p>
                </div>
                <div className="rounded-xl bg-slate-100/40 px-3 py-2">
                  <p className="font-extrabold text-[#292c2e]">{programs?.summary.upcoming ?? 0}</p>
                  <p className="text-[#71717a]">Yaklaşan</p>
                </div>
                <div className="rounded-xl bg-slate-100/40 px-3 py-2">
                  <p className="font-extrabold text-[#292c2e]">{programs?.summary.completed ?? 0}</p>
                  <p className="text-[#71717a]">Geçmiş</p>
                </div>
              </div>
            </div>

            {calendarMonths.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-slate-200/60 bg-slate-100/20 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#71717a]">Program yoğunluğu (ay)</p>
                <div className="flex flex-wrap gap-2">
                  {calendarMonths.map((month) => (
                    <span
                      key={month.key}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#292c2e] shadow-sm"
                    >
                      {formatCalendarMonthLabel(month)}
                      <span className="rounded-full bg-orange-600/15 px-2 py-0.5 text-[10px] font-bold text-orange-600">{month.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#71717a]">Yaklaşan Programlar</h3>
                {upcomingPrograms.length > 0 ? (
                  <div className="space-y-3">{upcomingPrograms.map(renderProgramCard)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                    Yaklaşan program henüz eklenmemiş.
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#71717a]">Geçmiş Programlar</h3>
                {completedPrograms.length > 0 ? (
                  <div className="space-y-3">{completedPrograms.map(renderProgramCard)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                    Geçmiş program henüz eklenmemiş.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <BriefcaseBusiness className="h-6 w-6 text-orange-600" />
              Projeye Özel İçerikler
            </h2>

            {hasSpecialContent ? (
              <div className="space-y-5">
                {projectSpecials?.internships ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <BriefcaseBusiness className="h-5 w-5 text-orange-600" />
                      Staj Bilgileri
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl bg-white/60 p-3">
                        <p className="text-xs text-[#71717a]">Toplam</p>
                        <p className="text-lg font-extrabold">{projectSpecials.internships.total}</p>
                      </div>
                      <div className="rounded-xl bg-white/60 p-3">
                        <p className="text-xs text-[#71717a]">Aktif</p>
                        <p className="text-lg font-extrabold">{projectSpecials.internships.active}</p>
                      </div>
                      <div className="rounded-xl bg-white/60 p-3 md:col-span-2">
                        <p className="text-xs text-[#71717a]">Kurumlar</p>
                        <p className="mt-1 text-sm font-semibold">{projectSpecials.internships.companies.join(", ") || "Belirtilmedi"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.mentors?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <GraduationCap className="h-5 w-5 text-orange-600" />
                      Mentörler
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {projectSpecials?.mentors?.map((mentor) => (
                        <div key={mentor.id} className="flex gap-4 rounded-xl bg-white/60 p-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f4f4f5]">
                            {mentor.photo ? <Image src={mentor.photo} alt={mentor.name} fill unoptimized className="object-cover" /> : null}
                          </div>
                          <div>
                            <p className="font-bold text-[#292c2e]">{mentor.name}</p>
                            {mentor.expertise ? <p className="text-xs text-orange-600">{mentor.expertise}</p> : null}
                            {mentor.bio ? <p className="mt-2 line-clamp-3 text-xs text-[#71717a]">{mentor.bio}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.reward_tiers?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Gift className="h-5 w-5 text-orange-600" />
                      Rozet ve Ödül Eşikleri
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {projectSpecials?.reward_tiers?.map((tier) => (
                        <div key={tier.id} className="rounded-xl bg-white/60 p-4">
                          <p className="font-bold text-[#292c2e]">{tier.name}</p>
                          <p className="mt-1 text-xs text-[#71717a]">
                            {tier.min_badges ?? 0} rozet / {tier.min_credits ?? 0} kredi
                          </p>
                          {tier.reward_description ? <p className="mt-3 text-sm text-orange-600">{tier.reward_description}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.eurodesk_projects?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Sparkles className="h-5 w-5 text-orange-600" />
                      Eurodesk Projeleri
                    </div>
                    <div className="space-y-3">
                      {projectSpecials?.eurodesk_projects?.map((item) => (
                        <div key={item.id} className="rounded-xl bg-white/60 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-bold text-[#292c2e]">{item.title}</p>
                              <p className="mt-1 text-xs text-[#71717a]">
                                {formatDate(item.start_date)} - {formatDate(item.end_date)}
                              </p>
                            </div>
                            {item.grant_status ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{item.grant_status}</span> : null}
                          </div>
                          {(item.partner_organizations?.length ?? 0) > 0 ? (
                            <p className="mt-3 text-sm text-[#71717a]">{item.partner_organizations?.join(", ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.kpd?.rooms?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      KPD Oturum Odaları
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {projectSpecials?.kpd?.rooms.map((room) => (
                        <div key={room.id} className="rounded-xl bg-white/60 p-4">
                          <p className="font-bold text-[#292c2e]">{room.name}</p>
                          {room.description ? <p className="mt-2 text-sm text-[#71717a]">{room.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                Bu proje için özel içerik henüz eklenmemiş.
              </div>
            )}
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <ImageIcon className="h-6 w-6 text-orange-600" />
              Galeri
            </h2>
            {galleryItems.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedGalleryItems).map(([group, items]) => (
                  <div key={group}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#71717a]">{group}</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {items.map((item, index) => (
                        <button
                          key={`${item.url}-${index}`}
                          type="button"
                          onClick={() => setLightboxUrl(item.url)}
                          className="group relative h-32 overflow-hidden rounded-xl border border-transparent text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-orange-400 md:h-40"
                        >
                          <Image src={item.url} alt={item.caption || `${project.name} galeri ${index + 1}`} fill unoptimized className="object-cover transition-transform group-hover:scale-110" />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/40">
                            <ZoomIn className="h-8 w-8 text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100" aria-hidden />
                          </span>
                          {item.caption ? (
                            <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white">
                              {item.caption}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                Bu proje için henüz galeri eklenmemiş.
              </div>
            )}
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-orange-600" />
              Aktif Öğrenciler
            </h2>
            {activeStudentGroups.length > 0 ? (
              <div className="space-y-8">
                {activeStudentGroups.map((group) => (
                  <div key={group.year}>
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-lg font-bold">{group.year}</h3>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{group.students.length} kişi</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {group.students.map((student) => <StudentCard key={student.id} student={student} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                Aktif öğrenci görsel listesi henüz eklenmemiş.
              </div>
            )}
          </section>

          <section className="kdm-public-card rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-orange-600" />
              Mezunlar
            </h2>
            {alumniGroups.length > 0 ? (
              <div className="space-y-8">
                {alumniGroups.map((group) => (
                    <div key={group.year}>
                      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-bold">{group.year}</h3>
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{group.students.length} mezun</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {group.students.map((student) => <StudentCard key={student.id} student={student} alumni />)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-[#71717a]">
                Mezun görsel listesi henüz eklenmemiş.
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-28 overflow-hidden rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-[0_24px_70px_rgba(9,9,11,0.14)] backdrop-blur sm:p-8">
            <h3 className="mb-6 text-xl font-bold">Başvuru Bilgileri</h3>

            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#71717a]">Aktif Dönem</p>
                  <p className="font-bold">{project.active_period?.name || "Belirsiz"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#71717a]">Başvuru Akışı</p>
                <p className="mt-2 font-bold">{project.has_interview ? "Mülakatlı değerlendirme" : "Mülakatsız değerlendirme"}</p>
                {project.quota ? <p className="mt-1 text-xs text-[#71717a]">Kontenjan: {project.quota}</p> : null}
              </div>
            </div>

            {message ? <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 ">{message}</div> : null}
            {errorMessage ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 ">{errorMessage}</div> : null}

            {guestApplySuccess && !isAuthenticated ? (
              <div className="space-y-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-green-600" />
                  <div>
                    <p className="font-bold text-[#292c2e]">Başvurunuz alındı</p>
                    <p className="mt-2 text-sm text-[#71717a]">
                      E-posta kutunuzu kontrol edin. Başvurularınızı izlemek ve panele erişmek için ücretsiz hesap oluşturabilirsiniz.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/auth/register"
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Hesap oluştur
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-[#292c2e] transition hover:bg-slate-100"
                  >
                    Giriş yap
                  </Link>
                </div>
              </div>
            ) : project.is_application_open ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Başvuruya hazır</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#71717a]">
                    Form, yalnızca başvuruya başladığınızda açılır. Bilgilerinizi tek ekranda kontrol edip gönderebilirsiniz.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">1</div>
                    <div>
                      <p className="text-sm font-bold text-[#292c2e]">İletişim bilgileri</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#71717a]">
                        {!isAuthenticated ? "Ad, soyad ve e-posta bilgileri başvuru formunda alınır." : "Oturum bilgilerinizle başvuru yapılır."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">2</div>
                    <div>
                      <p className="text-sm font-bold text-[#292c2e]">Başvuru formu</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#71717a]">
                        {hasDynamicForm ? "Proje için tanımlanan özel sorular başvuru formunda gösterilir." : "Bu proje temel başvuru akışını kullanır."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">3</div>
                    <div>
                      <p className="text-sm font-bold text-[#292c2e]">Değerlendirme</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#71717a]">
                        {project.has_interview ? "Başvuru sonrası mülakatlı değerlendirme süreci işletilir." : "Başvuru mülakatsız değerlendirme akışına alınır."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleApply(null)}
                  disabled={applying}
                  className="kdm-public-btn-shine kdm-public-btn-brand flex w-full items-center justify-center gap-2 rounded-full py-4 font-bold text-white shadow-[0_16px_36px_rgba(253,58,37,0.24)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {applying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquareText className="h-5 w-5" />
                      Hemen Başvur
                    </>
                  )}
                </button>

                {!isAuthenticated ? (
                  <p className="text-center text-xs leading-relaxed text-[#71717a]">
                    Üyelik zorunlu değildir; iletişim bilgilerinizi form açıldığında girebilirsiniz.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="rounded-xl border border-slate-200 bg-slate-100 py-4 text-center font-semibold text-[#71717a]">
                  Başvurular Kapalı
                </div>
                {project.next_application_date ? (
                  <p className="text-center text-xs text-amber-600 ">
                    Bir sonraki başvuru tarihi:
                    <br />
                    <strong className="text-amber-700 ">{formatDate(project.next_application_date)}</strong>
                  </p>
                ) : (
                  <p className="text-center text-xs text-[#71717a]">Bir sonraki başvuru tarihi henüz belirtilmemiş.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showApplicationForm && needsApplicationModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-white px-6 py-5 md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                    <FileText className="h-4 w-4" />
                    Başvuru Formu
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#292c2e]">{project.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#71717a]">
                    Bilgilerinizi kontrol ederek başvurunuzu güvenli şekilde gönderebilirsiniz.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#71717a]">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Dönem: {project.active_period?.name || "Belirsiz"}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Akış: {project.has_interview ? "Mülakatlı" : "Mülakatsız"}</span>
                    {selectedProgramTitle ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Program: {selectedProgramTitle}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplicationForm(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#71717a] transition-all duration-300 hover:bg-slate-100 hover:text-[#292c2e]"
                  aria-label="Başvuru formunu kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-220px)] overflow-y-auto px-6 py-6 md:px-8">
              <div className="space-y-6">
                {!isAuthenticated ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#292c2e]">1. Başvuru Sahibi</p>
                        <p className="mt-1 text-xs text-[#71717a]">Sizinle iletişim kurabilmemiz için temel bilgileri doldurun.</p>
                      </div>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-600">Zorunlu</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-[#71717a]">
                        Ad
                        <input
                          value={guestApplicant.name}
                          onChange={(event) => setGuestApplicant((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Adınızı yazın"
                          autoComplete="given-name"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-[#71717a]">
                        Soyad
                        <input
                          value={guestApplicant.surname}
                          onChange={(event) => setGuestApplicant((current) => ({ ...current, surname: event.target.value }))}
                          placeholder="Soyadınızı yazın"
                          autoComplete="family-name"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-[#71717a] md:col-span-2">
                        E-posta
                        <input
                          value={guestApplicant.email}
                          onChange={(event) => setGuestApplicant((current) => ({ ...current, email: event.target.value }))}
                          placeholder="ornek@e-posta.com"
                          type="email"
                          autoComplete="email"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-[#71717a] md:col-span-2">
                        Telefon
                        <input
                          value={guestApplicant.phone}
                          onChange={(event) => setGuestApplicant((current) => ({ ...current, phone: event.target.value }))}
                          placeholder="İsteğe bağlı"
                          type="tel"
                          autoComplete="tel"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4">
                    <p className="text-sm font-bold text-[#292c2e]">{!isAuthenticated ? "2. Form Bilgileri" : "1. Form Bilgileri"}</p>
                    <p className="mt-1 text-xs text-[#71717a]">
                      {hasDynamicForm ? "Proje için tanımlanan soruları eksiksiz doldurun." : "Bu proje için özel soru tanımlanmamış; temel başvuru akışı kullanılacak."}
                    </p>
                  </div>
                  {hasDynamicForm ? (
                    <div className="space-y-5">
                      {applicationForm?.fields.map((field) => {
                        const fieldId = field.id ?? field.key;
                        return (
                          <div key={fieldId} className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#71717a]">
                              {field.label}
                              {field.required ? <span className="text-red-500">*</span> : null}
                            </label>
                            {renderField(field)}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-[#71717a]">
                      Başvurunuzu göndermek için iletişim bilgileri ve varsa onay alanı yeterlidir.
                    </div>
                  )}
                </section>

                {applicationForm?.require_consent ? (
                  <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
                    <p className="mb-3 text-sm font-bold text-[#292c2e]">Onay</p>
                    <label className="flex items-start gap-3 text-sm leading-relaxed text-[#292c2e]">
                      <input
                        type="checkbox"
                        checked={consentAccepted}
                        onChange={(event) => setConsentAccepted(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-200 text-orange-600"
                      />
                      <span>
                        {applicationForm.consent_text ||
                          "Başvuru koşullarını, uyarıları ve yaptırımları okudum; verdiğim bilgilerin doğru olduğunu kabul ediyorum."}
                      </span>
                    </label>
                  </section>
                ) : null}
              </div>

              {errorMessage ? <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 ">{errorMessage}</div> : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row md:px-8">
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-[#71717a] transition-all duration-300 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleApply(selectedProgramId)}
                disabled={applying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 font-bold text-white shadow-md shadow-orange-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-600/30 disabled:opacity-70"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Başvuruyu Gönder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[90] flex cursor-zoom-out items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/60"
            aria-label="Galeriyi kapat"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[min(85vh,800px)] w-full max-w-5xl cursor-default" onClick={(event) => event.stopPropagation()}>
            <Image src={lightboxUrl} alt="Galeri büyütülmüş" fill unoptimized className="object-contain" sizes="100vw" />
          </div>
        </div>
      ) : null}
    </div>
  );
}





























