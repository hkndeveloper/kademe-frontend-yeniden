"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Alumni {
  id: number;
  year: string;
  name: string;
  university: string;
  job?: string;
  image?: string;
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
  active_students?: Array<{
    id: number;
    name: string;
    university?: string | null;
    department?: string | null;
    image?: string | null;
  }>;
  alumni?: Alumni[];
}

interface ProjectResponse {
  project: ProjectDetail;
  current_period?: ActivePeriod | null;
  application_form?: ApplicationFormData | null;
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | string[] | File | null>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [guestApplicant, setGuestApplicant] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get<ProjectResponse>(`/projects/${params.slug}`);
        setProject(response.data.project);
        setApplicationForm(response.data.application_form ?? null);

        const nextFormValues: Record<string, string | string[] | File | null> = {};
        for (const field of response.data.application_form?.fields ?? []) {
          const fieldId = field.id ?? field.key;
          if (!fieldId) continue;
          nextFormValues[fieldId] = field.type === "checkbox" ? [] : field.type === "file" ? null : "";
        }
        setFormValues(nextFormValues);
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

  const buildApplicationPayload = () => {
    const hasFile = Object.values(formValues).some((value) => value instanceof File);

    if (!hasFile) {
      return {
        payload: {
          project_id: project?.id,
          period_id: project?.active_period?.id,
          form_data: formValues,
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

  const handleApply = async () => {
    if (!project) return;

    setMessage(null);
    setErrorMessage(null);

    if (!project.active_period) {
      setErrorMessage("Bu proje icin aktif donem bulunmuyor.");
      return;
    }

    // Dinamik alanlar modal icinde acilir.
    if (!showApplicationForm && (applicationForm?.fields?.length ?? 0) > 0) {
      setShowApplicationForm(true);
      return;
    }

    setApplying(true);
    try {
      const { payload, config } = buildApplicationPayload();
      if (isAuthenticated) {
        await api.post("/applications", payload instanceof FormData ? payload : {
          project_id: project.id,
          period_id: project.active_period.id,
          form_data: formValues,
        }, config);
      } else {
        if (!guestApplicant.name.trim() || !guestApplicant.surname.trim() || !guestApplicant.email.trim()) {
          setErrorMessage("Lutfen ad, soyad ve e-posta bilgilerinizi doldurun.");
          return;
        }

        await api.post("/applications/public", payload, config);
      }
      setMessage("Basvurunuz alindi. Durumu ogrenci panelinizde gorebilirsiniz.");
      if (isAuthenticated) {
        router.push("/student/applications");
      } else {
        setShowApplicationForm(false);
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

  const groupedAlumni = useMemo(() => {
    return (project?.alumni ?? []).reduce((acc, curr) => {
      (acc[curr.year] = acc[curr.year] || []).push(curr);
      return acc;
    }, {} as Record<string, Alumni[]>);
  }, [project?.alumni]);

  const activeStudents = project?.active_students ?? [];

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  const hasDynamicForm = (applicationForm?.fields?.length ?? 0) > 0;

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
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:gap-3 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tum Projelere Don
          </button>
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
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <ImageIcon className="h-6 w-6 text-primary" />
              Galeri
            </h2>
            {project.gallery && project.gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {project.gallery.map((img, index) => (
                  <div key={`${img}-${index}`} className="relative h-32 overflow-hidden rounded-xl md:h-40">
                    <Image src={img} alt={`${project.name} galeri ${index + 1}`} fill unoptimized className="object-cover transition-transform hover:scale-110" />
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
            {activeStudents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.university || "Universite bilgisi yok"}
                        {student.department ? ` / ${student.department}` : ""}
                      </p>
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
            {Object.keys(groupedAlumni).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedAlumni)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([year, students]) => (
                    <div key={year}>
                      <h3 className="mb-4 border-b border-border pb-2 text-lg font-bold">{year}</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                              {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.university}</p>
                              {student.job ? <p className="text-[10px] text-primary">{student.job}</p> : null}
                            </div>
                          </div>
                        ))}
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

            {message ? <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</div> : null}
            {errorMessage ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</div> : null}

            {project.is_application_open ? (
              <div className="space-y-5">
                {hasDynamicForm ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Basvuru formu &quot;Basvuruyu Gonder&quot; butonuna tikladiginizda popup olarak acilacaktir.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Bu proje icin ozel form tanimi bulunmuyor. Varsayilan basvuru akisi kullanilacak.
                  </div>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70"
                >
                  {applying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquareText className="h-5 w-5" />
                      {hasDynamicForm ? "Basvuruyu Gonder" : "Hemen Basvur"}
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
                  <p className="text-center text-xs text-amber-500">
                    Bir sonraki basvuru tarihi:
                    <br />
                    <strong className="text-amber-400">{project.next_application_date}</strong>
                  </p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">Bir sonraki basvuru tarihi henuz belirtilmemis.</p>
                )}
              </div>
            )}

            {!isAuthenticated && project.is_application_open ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">Uyelik zorunlu degil; ad, soyad ve e-posta bilgisiyle basvuru yapabilirsiniz.</p>
            ) : null}
          </div>
        </div>
      </div>

      {showApplicationForm && hasDynamicForm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/70 p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Dinamik Basvuru Formu
              </div>
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground"
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
                onClick={handleApply}
                disabled={applying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Basvuruyu Gonder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
