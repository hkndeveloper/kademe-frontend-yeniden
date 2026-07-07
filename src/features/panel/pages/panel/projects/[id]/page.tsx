"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileStack,
  FormInput,
  GraduationCap,
  Layers,
  Loader2,
  PencilLine,
  QrCode,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

type AccessMap = Record<string, boolean>;

type ParticipantPreview = {
  id: number;
  status?: string | null;
  graduation_status?: string | null;
  credit?: number | null;
  graduated_at?: string | null;
  user?: {
    id?: number | null;
    name?: string | null;
    surname?: string | null;
    email?: string | null;
    university?: string | null;
    department?: string | null;
    cv?: {
      digital_cv_data?: Record<string, unknown> | null;
      linkedin_url?: string | null;
      github_url?: string | null;
    } | null;
  } | null;
};

type AttendancePreview = {
  id: number;
  title: string;
  start_at?: string | null;
  status?: string | null;
  credit_deduction?: number | null;
  attendances_count?: number | null;
  valid_attendances_count?: number | null;
};

type ProjectModulesResponse = {
  project: {
    id: number;
    name: string;
    slug?: string | null;
    type?: string | null;
    quota?: number | null;
    application_open?: boolean;
    active_period?: { id?: number; name?: string; status?: string } | null;
    selected_period?: { id?: number; name?: string; status?: string; start_date?: string | null; end_date?: string | null } | null;
    periods?: Array<{ id: number; name: string; status?: string; start_date?: string | null; end_date?: string | null }>;
  };
  access: AccessMap;
  summary: {
    participants?: { total: number; active: number; graduates: number; average_credit: number };
    programs?: { total: number; upcoming: number; completed: number; total_attendances: number; valid_attendances: number };
    applications?: { total: number; pending: number; approved: number; rejected: number; waitlisted: number };
    digital_bohca?: { total: number; visible_to_student: number };
    assignments?: { total: number; open: number; submissions: number };
    certificates?: { total: number; issued_this_month: number };
  };
  previews: {
    participants?: ParticipantPreview[];
    alumni?: ParticipantPreview[];
    student_cvs?: ParticipantPreview[];
    attendance?: AttendancePreview[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fullName(participant: ParticipantPreview) {
  return `${participant.user?.name ?? ""} ${participant.user?.surname ?? ""}`.trim() || "Isimsiz kayit";
}

function statValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function projectFamilyRouteForType(type: string | null | undefined, projectId: number) {
  const routeByType: Record<string, string> = {
    diplomasi360: "/panel/diplomasi360",
    pergel_fellowship: "/panel/pergel",
    eurodesk: "/panel/eurodesk",
    kademe_plus: "/panel/kademe-plus",
    zirve_kademe: "/panel/zirve-kademe",
  };
  const route = type ? routeByType[type] : undefined;

  return route ? `${route}?project_id=${projectId}` : `/panel/projects/${projectId}/special-modules`;
}

export default function PanelUnifiedProjectDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const projectId = typeof rawId === "string" ? Number(rawId) : Number(Array.isArray(rawId) ? rawId[0] : NaN);
  const invalidProjectId = !Number.isFinite(projectId) || projectId <= 0;

  const [loading, setLoading] = useState(!invalidProjectId);
  const [data, setData] = useState<ProjectModulesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("period_id") ?? "";
  });

  useEffect(() => {
    if (invalidProjectId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await api.get<ProjectModulesResponse>(`/panel/projects/${projectId}/modules`, {
          params: {
            period_id: selectedPeriodId || undefined,
          },
        });
        if (!cancelled) {
          setData(response.data);
          if (!selectedPeriodId && response.data.project.selected_period?.id) {
            setSelectedPeriodId(String(response.data.project.selected_period.id));
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 403) {
            setError("Bu proje icin modul ozetini goruntuleme yetkiniz yok veya proje kapsaminiz disinda.");
            return;
          }
          if (status === 404) {
            setError("Proje bulunamadi.");
            return;
          }
          if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
            setError("API yanit vermedi (zaman asimi). Laravel sunucusunun (or. :8000) calistigini kontrol edin.");
            return;
          }
          if (!err.response) {
            setError("API'ye baglanilamadi. `php artisan serve` / backend ayarlarini ve NEXT_PUBLIC_API_URL degerini kontrol edin.");
            return;
          }
        }
        setError("Proje modul bilgileri alinamadi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invalidProjectId, projectId, selectedPeriodId]);

  const access = useMemo(() => data?.access ?? {}, [data?.access]);
  const withPeriod = useCallback((href: string) => {
    if (!selectedPeriodId) return href;
    const [pathname, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("period_id", selectedPeriodId);
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }, [selectedPeriodId]);
  const cards = useMemo(
    () => [
      {
        key: "content",
        visible: access["projects.content.update"] || access["projects.view"],
        href: withPeriod(`/panel/projects/${projectId}/content`),
        icon: PencilLine,
        label: "Icerik ve galeri",
        value: data?.project.application_open ? "Basvuru acik" : "Basvuru kapali",
        permission: access["projects.view"] ? "projects.view" : "projects.content.update",
      },
      {
        key: "form",
        visible: access["projects.application_form.update"],
        href: withPeriod(`/panel/projects/${projectId}/content?tab=form`),
        icon: FormInput,
        label: "Basvuru formu",
        value: "Dinamik alanlar",
        permission: "projects.application_form.update",
      },
      {
        key: "programs",
        visible: access["programs.view"],
        href: withPeriod(`/panel/programs?project_id=${projectId}`),
        icon: CalendarDays,
        label: "Programlar",
        value: `${statValue(data?.summary.programs?.total)} kayit`,
        permission: "programs.view",
      },
      {
        key: "attendance",
        visible: access["projects.attendance.view"] || access["programs.attendance.view"],
        href: withPeriod(`/panel/programs?project_id=${projectId}`),
        icon: QrCode,
        label: "Yoklama ve kredi",
        value: `${statValue(data?.summary.programs?.valid_attendances)} gecerli`,
        permission: access["projects.attendance.view"] ? "projects.attendance.view" : "programs.attendance.view",
      },
      {
        key: "participants",
        visible: access["projects.participants.view"],
        href: withPeriod(`/panel/participants?project_id=${projectId}`),
        icon: Users,
        label: "Katilimcilar",
        value: `${statValue(data?.summary.participants?.active)} aktif`,
        permission: "projects.participants.view",
      },
      {
        key: "alumni",
        visible: access["projects.alumni.view"],
        href: withPeriod(`/panel/participants?project_id=${projectId}&status=graduated`),
        icon: GraduationCap,
        label: "Mezunlar",
        value: `${statValue(data?.summary.participants?.graduates)} mezun`,
        permission: "projects.alumni.view",
      },
      {
        key: "student-cv",
        visible: access["projects.student_cv.view"],
        href: withPeriod(`/panel/participants?project_id=${projectId}`),
        icon: FileStack,
        label: "Ogrenci CV'leri",
        value: `${data?.previews.student_cvs?.length ?? 0} onizleme`,
        permission: "projects.student_cv.view",
      },
      {
        key: "special-modules",
        visible:
          access["projects.internships.view"] ||
          access["projects.internships.manage"] ||
          access["projects.mentors.view"] ||
          access["projects.mentors.manage"] ||
          access["projects.eurodesk.view"] ||
          access["projects.eurodesk.manage"] ||
          access["projects.rewards.manage"] ||
          access["projects.rewards.view"],
        href: withPeriod(projectFamilyRouteForType(data?.project.type, projectId)),
        icon: Layers,
        label: "Projeye ozel moduller",
        value: "Staj, mentor, hibe",
        permission: access["projects.internships.view"] || access["projects.internships.manage"]
          ? access["projects.internships.view"] ? "projects.internships.view" : "projects.internships.manage"
          : access["projects.mentors.view"] || access["projects.mentors.manage"]
            ? access["projects.mentors.view"] ? "projects.mentors.view" : "projects.mentors.manage"
            : access["projects.eurodesk.view"] || access["projects.eurodesk.manage"]
              ? access["projects.eurodesk.view"] ? "projects.eurodesk.view" : "projects.eurodesk.manage"
              : access["projects.rewards.view"] ? "projects.rewards.view" : "projects.rewards.manage",
      },
      {
        key: "applications",
        visible: access["applications.view"],
        href: withPeriod(`/panel/applications?project_id=${projectId}`),
        icon: ClipboardCheck,
        label: "Basvurular",
        value: `${statValue(data?.summary.applications?.pending)} bekleyen`,
        permission: "applications.view",
      },
      {
        key: "volunteer",
        visible: access["volunteer.view"],
        href: withPeriod(`/panel/volunteer?project_id=${projectId}`),
        icon: UserCog,
        label: "Gonullu basvurulari",
        value: "Firsatlar",
        permission: "volunteer.view",
      },
      {
        key: "bohca",
        visible: access["digital_bohca.view"],
        href: withPeriod(`/panel/digital-bohca?project_id=${projectId}`),
        icon: Database,
        label: "Dijital Bohca",
        value: `${statValue(data?.summary.digital_bohca?.total)} dosya`,
        permission: "digital_bohca.view",
      },
      {
        key: "assignments",
        visible: access["assignments.view"],
        href: withPeriod(`/panel/assignments?project_id=${projectId}`),
        icon: FileStack,
        label: "Odevler",
        value: `${statValue(data?.summary.assignments?.submissions)} teslim`,
        permission: "assignments.view",
      },
      {
        key: "certificates",
        visible: access["certificates.view"],
        href: withPeriod(`/panel/certificates?project_id=${projectId}`),
        icon: Award,
        label: "Sertifikalar",
        value: `${statValue(data?.summary.certificates?.total)} sertifika`,
        permission: "certificates.view",
      },
    ],
    [access, data, projectId, withPeriod]
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidProjectId || error || !data) {
    return (
      <div className="panel-notice panel-notice-error">
        {invalidProjectId ? "Gecersiz proje." : error ?? "Proje bulunamadi."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/panel/projects"
        className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Proje listesine don
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-accent">{data.project.type || "Proje"}</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{data.project.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.project.selected_period?.name ? `Secili donem: ${data.project.selected_period.name}` : data.project.active_period?.name ? `Aktif donem: ${data.project.active_period.name}` : "Aktif donem baglantisi yok"}
            {typeof data.project.quota === "number" ? ` - Kontenjan: ${data.project.quota}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {data.project.periods?.length ? (
            <select
              value={selectedPeriodId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
              className="panel-control min-w-56 font-bold"
            >
              {data.project.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (gecmis)" : ""}
                </option>
              ))}
            </select>
          ) : null}
        {data.project.slug ? (
          <Link
            href={`/projects/${data.project.slug}`}
            className="panel-button panel-button-secondary"
            target="_blank"
            rel="noreferrer"
          >
            Halka acik sayfa
          </Link>
        ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards
          .filter((card) => card.visible)
          .map((card) => {
            const Icon = card.icon;
            return (
              <PermissionGate key={card.key} requireProjectAccess={{ permission: card.permission, projectId }}>
                <Link
                  href={card.href}
                  className="group panel-list-card block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.value}</span>
                  </div>
                  <div className="mt-5 text-base font-black text-slate-900 group-hover:text-accent">{card.label}</div>
                </Link>
              </PermissionGate>
            );
          })}
      </div>

      {data.summary.participants ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="panel-stat-card">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Toplam katilimci</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{data.summary.participants.total}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aktif ogrenci</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{data.summary.participants.active}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mezun</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{data.summary.participants.graduates}</div>
          </div>
          <div className="panel-stat-card">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ortalama kredi</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{data.summary.participants.average_credit}</div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {data.previews.participants?.length ? (
          <PreviewList
            title="Aktif katilimcilar"
            icon={<Users className="h-5 w-5" />}
            items={data.previews.participants}
            footerHref={withPeriod(`/panel/participants?project_id=${projectId}`)}
            footerLabel="Tum katilimcilari ac"
          />
        ) : null}

        {data.previews.alumni?.length ? (
          <PreviewList
            title="Mezunlar"
            icon={<GraduationCap className="h-5 w-5" />}
            items={data.previews.alumni}
            footerHref={withPeriod(`/panel/participants?project_id=${projectId}&status=graduated`)}
            footerLabel="Mezun listesini ac"
          />
        ) : null}

        {data.previews.student_cvs?.length ? (
          <PreviewList
            title="CV onizlemeleri"
            icon={<FileStack className="h-5 w-5" />}
            items={data.previews.student_cvs}
            showCv
            footerHref={withPeriod(`/panel/participants?project_id=${projectId}`)}
            footerLabel="CV detaylarini ac"
          />
        ) : null}

        {data.previews.attendance?.length ? (
          <section className="panel-stat-card">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                <QrCode className="h-5 w-5 text-accent" />
                Yoklama ozeti
              </div>
              <Link href={withPeriod(`/panel/programs?project_id=${projectId}`)} className="text-xs font-bold uppercase tracking-widest text-accent">
                Programlari ac
              </Link>
            </div>
            <div className="space-y-3">
              {data.previews.attendance.map((program) => (
                <div key={program.id} className="panel-card-muted bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-900">{program.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(program.start_at)}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{statValue(program.valid_attendances_count)} / {statValue(program.attendances_count)} gecerli</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-amber-600">
                        <Star className="h-3 w-3" />
                        -{statValue(program.credit_deduction)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function PreviewList({
  title,
  icon,
  items,
  showCv = false,
  footerHref,
  footerLabel,
}: {
  title: string;
  icon: ReactNode;
  items: ParticipantPreview[];
  showCv?: boolean;
  footerHref: string;
  footerLabel: string;
}) {
  return (
    <section className="panel-stat-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-lg font-black text-slate-900">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        <Link href={footerHref} className="text-xs font-bold uppercase tracking-widest text-accent">
          {footerLabel}
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((participant) => (
          <div key={participant.id} className="panel-card-muted bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">{fullName(participant)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {[participant.user?.university, participant.user?.department].filter(Boolean).join(" - ") || participant.user?.email || "Profil bilgisi yok"}
                </div>
                {showCv ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {participant.user?.cv?.linkedin_url ? "LinkedIn bagli" : "LinkedIn yok"}
                    {participant.user?.cv?.github_url ? " - GitHub bagli" : ""}
                  </div>
                ) : null}
              </div>
              <div className="panel-chip panel-chip-warning shrink-0 flex-col rounded-xl px-3 py-2 text-center normal-case tracking-normal">
                <div className="text-[10px] font-bold uppercase tracking-widest">Kredi</div>
                <div className="text-lg font-black">{statValue(participant.credit)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
