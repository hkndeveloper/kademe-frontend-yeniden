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
  short_description: string;
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
    scheduled: "Planlandi",
    active: "Aktif",
    completed: "Tamamlandi",
    cancelled: "Iptal",
  };
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
        return "Lutfen ad, soyad ve e-posta bilgilerinizi doldurun.";
      }
      const email = guestApplicant.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Gecerli bir e-posta adresi girin.";
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
          return `"${field.label}" secenegi zorunludur.`;
        }
      } else if (field.type === "file") {
        if (!val) {
          return `"${field.label}" icin dosya yuklemeniz gerekir.`;
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
      setErrorMessage("Bu proje icin aktif donem bulunmuyor.");
      return;
    }

    const needsApplicationModal = (applicationForm?.fields?.length ?? 0) > 0 || Boolean(applicationForm?.require_consent);

    if (!showApplicationForm && needsApplicationModal) {
      setShowApplicationForm(true);
      return;
    }

    if (applicationForm?.require_consent && !consentAccepted) {
      setErrorMessage("Basvuru kosullarini kabul etmeniz gerekiyor.");
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
        setMessage("Basvurunuz alindi. Durumu ogrenci panelinizde gorebilirsiniz.");
        router.push("/student/applications");
      } else {
        await api.post("/applications/public", payload, config);
        setGuestApplySuccess(true);
        setShowApplicationForm(false);
        setMessage(
          "Basvurunuz alindi. E-posta adresinize bilgilendirme gelebilir. Basvurularinizi takip etmek icin hesap olusturabilirsiniz.",
        );
      }
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const responseMessage =
          error.response?.data?.message ||
          Object.values(error.response?.data?.errors ?? {})
            .flat()
            .join(" ");
        setErrorMessage(responseMessage || "Basvuru sirasinda bir hata olustu.");
      } else {
        setErrorMessage("Basvuru sirasinda bir hata olustu.");
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
      "w-full rounded-2xl border border-border bg-input px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-primary";
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
          <option value="">Secim yapin</option>
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
            <label key={option} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
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
              <label key={option} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
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
    <div key={program.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{program.title}</p>
          {program.period?.name ? <p className="mt-1 text-xs text-muted-foreground">{program.period.name}</p> : null}
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          {programStatusLabel(program.status)}
        </span>
      </div>
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>{formatDateTime(program.start_at)}</span>
        </div>
        {program.location ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{program.location}</span>
          </div>
        ) : null}
      </div>
      {program.description ? <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{program.description}</p> : null}
      {hasProgramCoordinates(program) ? (
        <div className="mt-4">
          <ProgramLocationMap
            latitude={program.latitude}
            longitude={program.longitude}
            radiusMeters={program.radius_meters}
            heightClassName="h-44"
          />
        </div>
      ) : null}
      {project?.is_application_open && program.status !== "completed" ? (
        <button
          type="button"
          onClick={() => void handleApply(program.id)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          Programa Basvur
        </button>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  const StudentCard = ({ student, alumni = false }: { student: PublicStudent | Alumni; alumni?: boolean }) => (
    <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">{student.name}</p>
        <p className="text-xs text-muted-foreground">
          {student.university || "Universite bilgisi yok"}
          {student.department ? ` / ${student.department}` : ""}
          {student.class_year ? ` / ${student.class_year}. Sinif` : ""}
        </p>
        {student.period_name ? (
          <p className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            Dönem: {student.period_name}
          </p>
        ) : null}
        {alumni && "job" in student && student.job ? <p className="mt-1 text-[10px] text-primary">{student.job}</p> : null}
      </div>
    </div>
  );

  const hasDynamicForm = (applicationForm?.fields?.length ?? 0) > 0;
  const needsApplicationModal = hasDynamicForm || Boolean(applicationForm?.require_consent);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative flex h-[400px] w-full items-end overflow-hidden bg-muted md:h-[500px]">
        {project.cover_image ? (
          <Image src={project.cover_image} alt={project.name} fill unoptimized className="object-cover transition-transform duration-700 hover:scale-[1.02]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="container relative z-10 mx-auto px-6 pb-12">
          <PublicBreadcrumbs
            variant="onDark"
            className="mb-4"
            items={[
              { label: "Ana Sayfa", href: "/" },
              { label: "Projeler", href: "/projects" },
              { label: project.name },
            ]}
          />
          <Link
            href="/projects"
            className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:gap-3 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tum projelere don
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm font-bold uppercase tracking-wider text-primary">
            {project.type || "Proje"}
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-6xl">{project.name}</h1>
          <p className="max-w-3xl text-xl text-muted-foreground">{project.short_description || "Bu proje icin kisa tanitim metni bulunmuyor."}</p>
        </div>
      </div>

      <div className="container mx-auto mt-12 grid grid-cols-1 gap-12 px-6 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-primary" />
              Proje Hakkinda
            </h2>
            <div className="leading-relaxed text-muted-foreground">
              {project.description || "Bu proje icin detayli aciklama henuz eklenmemis."}
            </div>
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Proje Durumu
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-muted/30 p-4 transition-colors duration-300 hover:bg-muted/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Durum</p>
                <p className="mt-2 text-sm font-bold text-foreground">{project.status || "Belirtilmedi"}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4 transition-colors duration-300 hover:bg-muted/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Donem</p>
                <p className="mt-2 text-sm font-bold text-foreground">{project.active_period?.name || "Yok"}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4 transition-colors duration-300 hover:bg-muted/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Basvuru</p>
                <p className="mt-2 text-sm font-bold text-foreground">{project.is_application_open ? "Acik" : "Kapali"}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4 transition-colors duration-300 hover:bg-muted/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Akis</p>
                <p className="mt-2 text-sm font-bold text-foreground">{project.has_interview ? "Mulakatli" : "Mulakatsiz"}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Calendar className="h-6 w-6 text-primary" />
                Program Akisi ve Takvim
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-muted/40 px-3 py-2">
                  <p className="font-extrabold text-foreground">{programs?.summary.total ?? 0}</p>
                  <p className="text-muted-foreground">Toplam</p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2">
                  <p className="font-extrabold text-foreground">{programs?.summary.upcoming ?? 0}</p>
                  <p className="text-muted-foreground">Yaklasan</p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2">
                  <p className="font-extrabold text-foreground">{programs?.summary.completed ?? 0}</p>
                  <p className="text-muted-foreground">Gecmis</p>
                </div>
              </div>
            </div>

            {calendarMonths.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Program yogunlugu (ay)</p>
                <div className="flex flex-wrap gap-2">
                  {calendarMonths.map((month) => (
                    <span
                      key={month.key}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                    >
                      {month.label}
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{month.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Yaklasan Programlar</h3>
                {upcomingPrograms.length > 0 ? (
                  <div className="space-y-3">{upcomingPrograms.map(renderProgramCard)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                    Yaklasan program henuz eklenmemis.
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Gecmis Programlar</h3>
                {completedPrograms.length > 0 ? (
                  <div className="space-y-3">{completedPrograms.map(renderProgramCard)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                    Gecmis program henuz eklenmemis.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <BriefcaseBusiness className="h-6 w-6 text-primary" />
              Projeye Ozel Icerikler
            </h2>

            {hasSpecialContent ? (
              <div className="space-y-5">
                {projectSpecials?.internships ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <BriefcaseBusiness className="h-5 w-5 text-primary" />
                      Staj Bilgileri
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl bg-background/60 p-3">
                        <p className="text-xs text-muted-foreground">Toplam</p>
                        <p className="text-lg font-extrabold">{projectSpecials.internships.total}</p>
                      </div>
                      <div className="rounded-xl bg-background/60 p-3">
                        <p className="text-xs text-muted-foreground">Aktif</p>
                        <p className="text-lg font-extrabold">{projectSpecials.internships.active}</p>
                      </div>
                      <div className="rounded-xl bg-background/60 p-3 md:col-span-2">
                        <p className="text-xs text-muted-foreground">Kurumlar</p>
                        <p className="mt-1 text-sm font-semibold">{projectSpecials.internships.companies.join(", ") || "Belirtilmedi"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.mentors?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Mentorler
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {projectSpecials?.mentors?.map((mentor) => (
                        <div key={mentor.id} className="flex gap-4 rounded-xl bg-background/60 p-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                            {mentor.photo ? <Image src={mentor.photo} alt={mentor.name} fill unoptimized className="object-cover" /> : null}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{mentor.name}</p>
                            {mentor.expertise ? <p className="text-xs text-primary">{mentor.expertise}</p> : null}
                            {mentor.bio ? <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{mentor.bio}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.reward_tiers?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Gift className="h-5 w-5 text-primary" />
                      Rozet ve Odul Esikleri
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {projectSpecials?.reward_tiers?.map((tier) => (
                        <div key={tier.id} className="rounded-xl bg-background/60 p-4">
                          <p className="font-bold text-foreground">{tier.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tier.min_badges ?? 0} rozet / {tier.min_credits ?? 0} kredi
                          </p>
                          {tier.reward_description ? <p className="mt-3 text-sm text-primary">{tier.reward_description}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.eurodesk_projects?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Eurodesk Projeleri
                    </div>
                    <div className="space-y-3">
                      {projectSpecials?.eurodesk_projects?.map((item) => (
                        <div key={item.id} className="rounded-xl bg-background/60 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-bold text-foreground">{item.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(item.start_date)} - {formatDate(item.end_date)}
                              </p>
                            </div>
                            {item.grant_status ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{item.grant_status}</span> : null}
                          </div>
                          {(item.partner_organizations?.length ?? 0) > 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">{item.partner_organizations?.join(", ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(projectSpecials?.kpd?.rooms?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Calendar className="h-5 w-5 text-primary" />
                      KPD Oturum Odalari
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {projectSpecials?.kpd?.rooms.map((room) => (
                        <div key={room.id} className="rounded-xl bg-background/60 p-4">
                          <p className="font-bold text-foreground">{room.name}</p>
                          {room.description ? <p className="mt-2 text-sm text-muted-foreground">{room.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                Bu proje icin public tarafta gosterilecek ozel icerik henuz eklenmemis.
              </div>
            )}
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <ImageIcon className="h-6 w-6 text-primary" />
              Galeri
            </h2>
            {galleryItems.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedGalleryItems).map(([group, items]) => (
                  <div key={group}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{group}</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {items.map((item, index) => (
                        <button
                          key={`${item.url}-${index}`}
                          type="button"
                          onClick={() => setLightboxUrl(item.url)}
                          className="group relative h-32 overflow-hidden rounded-xl border border-transparent text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary md:h-40"
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
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                Bu proje icin henuz galeri eklenmemis.
              </div>
            )}
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-primary" />
              Aktif Ogrenciler
            </h2>
            {activeStudentGroups.length > 0 ? (
              <div className="space-y-8">
                {activeStudentGroups.map((group) => (
                  <div key={group.year}>
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-lg font-bold">{group.year}</h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{group.students.length} kisi</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {group.students.map((student) => <StudentCard key={student.id} student={student} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                Aktif ogrenci gorsel listesi henuz eklenmemis.
              </div>
            )}
          </section>

          <section className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-primary" />
              Mezunlar
            </h2>
            {alumniGroups.length > 0 ? (
              <div className="space-y-8">
                {alumniGroups.map((group) => (
                    <div key={group.year}>
                      <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                        <h3 className="text-lg font-bold">{group.year}</h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{group.students.length} mezun</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {group.students.map((student) => <StudentCard key={student.id} student={student} alumni />)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                Mezun gorsel listesi henuz eklenmemis.
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-panel sticky top-28 rounded-3xl border border-primary/20 p-8 shadow-sm">
            <h3 className="mb-6 text-xl font-bold">Basvuru Bilgileri</h3>

            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-input/50 p-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktif Donem</p>
                  <p className="font-bold">{project.active_period?.name || "Belirsiz"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-input/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basvuru Akisi</p>
                <p className="mt-2 font-bold">{project.has_interview ? "Mulakatli degerlendirme" : "Mulakatsiz degerlendirme"}</p>
                {project.quota ? <p className="mt-1 text-xs text-muted-foreground">Kontenjan: {project.quota}</p> : null}
              </div>
            </div>

            {message ? <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">{message}</div> : null}
            {errorMessage ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{errorMessage}</div> : null}

            {guestApplySuccess && !isAuthenticated ? (
              <div className="space-y-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-bold text-foreground">Basvurunuz alindi</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      E-posta kutunuzu kontrol edin. Basvurularinizi izlemek ve panele erismek icin ucretsiz hesap olusturabilirsiniz.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/auth/register"
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground transition hover:opacity-95"
                  >
                    Hesap olustur
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    Giris yap
                  </Link>
                </div>
              </div>
            ) : project.is_application_open ? (
              <div className="space-y-5">
                {!isAuthenticated && !needsApplicationModal ? (
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Basvuru iletisimi</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        value={guestApplicant.name}
                        onChange={(event) => setGuestApplicant((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Ad *"
                        autoComplete="given-name"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        value={guestApplicant.surname}
                        onChange={(event) => setGuestApplicant((current) => ({ ...current, surname: event.target.value }))}
                        placeholder="Soyad *"
                        autoComplete="family-name"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        value={guestApplicant.email}
                        onChange={(event) => setGuestApplicant((current) => ({ ...current, email: event.target.value }))}
                        placeholder="E-posta *"
                        type="email"
                        autoComplete="email"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground md:col-span-2"
                      />
                      <input
                        value={guestApplicant.phone}
                        onChange={(event) => setGuestApplicant((current) => ({ ...current, phone: event.target.value }))}
                        placeholder="Telefon (opsiyonel)"
                        type="tel"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground md:col-span-2"
                      />
                    </div>
                  </div>
                ) : null}

                {hasDynamicForm ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Basvuru formu &quot;Basvuruyu Gonder&quot; butonuna tikladiginizda popup olarak acilacaktir.
                  </div>
                ) : applicationForm?.require_consent ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Basvuru onayi &quot;Basvuruyu Gonder&quot; butonuna tikladiginizda acilacaktir.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Bu proje icin ozel form tanimi bulunmuyor. Varsayilan basvuru akisi kullanilacak.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleApply(null)}
                  disabled={applying}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70"
                >
                  {applying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquareText className="h-5 w-5" />
                      {needsApplicationModal ? "Basvuruyu Gonder" : "Hemen Basvur"}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="rounded-xl border border-border bg-muted py-4 text-center font-semibold text-muted-foreground">
                  Basvurular Kapali
                </div>
                {project.next_application_date ? (
                  <p className="text-center text-xs text-amber-600 dark:text-amber-500">
                    Bir sonraki basvuru tarihi:
                    <br />
                    <strong className="text-amber-700 dark:text-amber-400">{formatDate(project.next_application_date)}</strong>
                  </p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">Bir sonraki basvuru tarihi henuz belirtilmemis.</p>
                )}
              </div>
            )}

            {!isAuthenticated && project.is_application_open && !guestApplySuccess ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {needsApplicationModal
                  ? "Popup icinde iletisim bilgilerinizi girebilirsiniz. Uyelik zorunlu degildir."
                  : "Uyelik zorunlu degil; yukaridaki bilgilerle basvuru yapabilirsiniz."}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {showApplicationForm && needsApplicationModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/70 p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  Dinamik Basvuru Formu
                </div>
                {selectedProgramTitle ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Secilen program: <span className="font-semibold text-foreground">{selectedProgramTitle}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground"
                aria-label="Basvuru formunu kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {!isAuthenticated ? (
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 md:grid-cols-2">
                  <input
                    value={guestApplicant.name}
                    onChange={(event) => setGuestApplicant((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ad"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    value={guestApplicant.surname}
                    onChange={(event) => setGuestApplicant((current) => ({ ...current, surname: event.target.value }))}
                    placeholder="Soyad"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    value={guestApplicant.email}
                    onChange={(event) => setGuestApplicant((current) => ({ ...current, email: event.target.value }))}
                    placeholder="E-posta"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground md:col-span-2"
                  />
                  <input
                    value={guestApplicant.phone}
                    onChange={(event) => setGuestApplicant((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Telefon (opsiyonel)"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground md:col-span-2"
                  />
                </div>
              ) : null}

              {applicationForm?.fields.map((field) => {
                const fieldId = field.id ?? field.key;
                return (
                  <div key={fieldId} className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {field.label}
                      {field.required ? <span className="text-red-400">*</span> : null}
                    </label>
                    {renderField(field)}
                  </div>
                );
              })}

              {applicationForm?.require_consent ? (
                <label className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary"
                  />
                  <span>
                    {applicationForm.consent_text ||
                      "Basvuru kosullarini, uyarilari ve yaptirimlari okudum; verdigim bilgilerin dogru oldugunu kabul ediyorum."}
                  </span>
                </label>
              ) : null}
            </div>

            {errorMessage ? <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</div> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="w-full rounded-xl border border-border bg-muted/60 py-3 text-sm font-bold text-muted-foreground transition-all duration-300 hover:bg-muted"
              >
                Vazgec
              </button>
              <button
                onClick={() => void handleApply(selectedProgramId)}
                disabled={applying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Basvuruyu Gonder"}
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
            <Image src={lightboxUrl} alt="Galeri buyutulmus" fill unoptimized className="object-contain" sizes="100vw" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

