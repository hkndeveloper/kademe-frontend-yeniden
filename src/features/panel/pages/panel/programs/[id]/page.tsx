"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import type { AxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { usePermissions } from "@/hooks/usePermissions";
import { fixMojibake } from "@/lib/text";
import { panelStatusChipClass } from "@/lib/status-style";

type ProgramStatus = "scheduled" | "active" | "completed" | "cancelled";

interface ProgramQuestion {
  id: string;
  label: string;
  type: "rating" | "text" | "choice";
  options?: string[] | null;
  min?: number | null;
  max?: number | null;
  required?: boolean;
}

interface ProgramPhoto {
  id: number;
  url: string;
  caption?: string | null;
}

interface PanelProgram {
  id: number;
  project_id: number;
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
  start_at: string;
  end_at?: string | null;
  credit_deduction?: number | null;
  application_quota?: number | null;
  target_audience?: Array<"student" | "alumni"> | null;
  feedback_form_template_id?: number | null;
  status?: ProgramStatus;
  project?: { id: number; name: string } | null;
  period?: { id: number; name: string } | null;
  attendance_count?: number | null;
  feedback_count?: number | null;
  is_public?: boolean;
  is_featured?: boolean;
  questions?: ProgramQuestion[];
}

interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

const statusLabels: Record<ProgramStatus, string> = {
  scheduled: "Planlandı",
  active: "Aktif",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const audienceLabels: Record<"student" | "alumni", string> = {
  student: "Öğrenci",
  alumni: "Mezun",
};

function normalizeStatus(status?: ProgramStatus): ProgramStatus {
  return status === "active" || status === "completed" || status === "cancelled" ? status : "scheduled";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function apiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return (
    Object.values(axiosError.response?.data?.errors ?? {}).flat().join(" ") ||
    axiosError.response?.data?.message ||
    fallback
  );
}

function hasCoordinates(program: PanelProgram) {
  return program.latitude !== null && program.latitude !== undefined && program.latitude !== "" &&
    program.longitude !== null && program.longitude !== undefined && program.longitude !== "";
}

function guestLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined && String(item).trim())
      .map(([key, item]) => `${key}: ${String(item)}`);
  }
  return value ? [String(value)] : [];
}

export default function PanelProgramDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const programId = typeof rawId === "string" ? Number(rawId) : Number(Array.isArray(rawId) ? rawId[0] : NaN);
  const { hasPermission, canAccessProject } = usePermissions();
  const [program, setProgram] = useState<PanelProgram | null>(null);
  const [photos, setPhotos] = useState<ProgramPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProgram = useCallback(async () => {
    if (!Number.isFinite(programId) || programId <= 0) {
      setError("Geçersiz program bağlantısı.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ program: PanelProgram }>(`/panel/programs/${programId}`);
      setProgram(response.data.program);
      const photoResponse = await api.get<{ photos: ProgramPhoto[] }>(`/panel/programs/${programId}/photos`);
      setPhotos(photoResponse.data.photos ?? []);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Program detayı yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProgram(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProgram]);

  const status = normalizeStatus(program?.status);
  const canUpdate = Boolean(program && hasPermission("programs.update") && canAccessProject("programs.update", program.project_id));
  const canComplete = Boolean(program && hasPermission("programs.complete") && canAccessProject("programs.complete", program.project_id));
  const canQr = Boolean(program && hasPermission("programs.qr.manage") && canAccessProject("programs.qr.manage", program.project_id));
  const canViewAttendance = Boolean(program && hasPermission("programs.attendance.view") && canAccessProject("programs.attendance.view", program.project_id));
  const canExportAttendance = Boolean(program && hasPermission("programs.attendance.export") && canAccessProject("programs.attendance.export", program.project_id));
  const canManageMedia = Boolean(program && hasPermission("programs.media.upload") && canAccessProject("programs.media.upload", program.project_id));
  const canViewFeedback = Boolean(program && canAccessProject("programs.view", program.project_id));
  const detailQuery = useMemo(() => {
    if (!program) return "";
    const query = new URLSearchParams({ project_id: String(program.project_id) });
    if (program.period?.id) query.set("period_id", String(program.period.id));
    return query.toString();
  }, [program]);

  const listActionHref = (action: "edit_id" | "attendance_id" | "gallery_id" | "feedback_id") =>
    `/panel/programs?${detailQuery}&${action}=${programId}`;

  const updateVisibility = async (field: "is_public" | "is_featured") => {
    if (!program || !canUpdate) return;
    const nextValue = field === "is_public" ? program.is_public === false : !program.is_featured;
    setActionLoading(field);
    setError(null);
    setMessage(null);
    try {
      const response = await api.patch<{ program: PanelProgram }>(`/panel/programs/${program.id}/visibility`, {
        [field]: nextValue,
      });
      setProgram(response.data.program);
      setMessage(field === "is_public" ? "Program görünürlüğü güncellendi." : "Öne çıkarma ayarı güncellendi.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Program görünürlüğü güncellenemedi."));
    } finally {
      setActionLoading(null);
    }
  };

  const completeProgram = async () => {
    if (!program || !canComplete || status === "completed" || status === "cancelled") return;
    if (!window.confirm("Programı tamamlamak ve kredi hesaplamasını çalıştırmak istiyor musunuz?")) return;
    setActionLoading("complete");
    setError(null);
    setMessage(null);
    try {
      const response = await api.post<{ program: PanelProgram; deducted_participant_count?: number }>(
        `/panel/programs/${program.id}/complete`,
      );
      setProgram(response.data.program);
      setMessage(`Program tamamlandı. ${response.data.deducted_participant_count ?? 0} katılımcıya kredi kesintisi uygulandı.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Program tamamlanamadı."));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="panel-section-card flex min-h-[45vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  if (error && !program) {
    return (
      <div className="space-y-4">
        <Link href="/panel/programs" className="panel-card-action"><ArrowLeft className="h-4 w-4" />Programlara dön</Link>
        <div className="panel-notice panel-notice-error">{error}</div>
      </div>
    );
  }

  if (!program) return null;
  const guests = guestLines(program.guest_info);
  const audiences: Array<"student" | "alumni"> = program.target_audience?.length
    ? program.target_audience
    : ["student"];

  return (
    <PermissionGate
      permission="programs.view"
      requireProjectAccess={{ permission: "programs.view", projectId: program.project_id }}
      fallback={<div className="panel-notice panel-notice-error">Bu programı görüntüleme yetkiniz veya proje kapsamınız bulunmuyor.</div>}
    >
      <div className="space-y-6 pb-8">
        <Link href="/panel/programs" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-accent">
          <ArrowLeft className="h-4 w-4" />Programlara dön
        </Link>

        <header className="panel-section-card overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-orange-50 px-6 py-7 md:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`panel-chip ${panelStatusChipClass(status)}`}>{statusLabels[status]}</span>
                  <span className="panel-chip panel-chip-info">{fixMojibake(program.project?.name ?? `Proje #${program.project_id}`)}</span>
                  {program.period?.name ? <span className="panel-chip">{fixMojibake(program.period.name)}</span> : null}
                  {program.is_public === false ? <span className="panel-chip"><EyeOff className="h-3 w-3" />Gizli</span> : <span className="panel-chip panel-chip-success"><Eye className="h-3 w-3" />Yayında</span>}
                  {program.is_featured ? <span className="panel-chip panel-chip-warning"><Sparkles className="h-3 w-3" />Öne çıkan</span> : null}
                </div>
                <h1 className="text-2xl font-black text-slate-950 md:text-3xl">{fixMojibake(program.title)}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {fixMojibake(program.description) || "Bu program için açıklama girilmemiş."}
                </p>
              </div>

              <div className="flex max-w-xl flex-wrap gap-2 xl:justify-end">
                {canUpdate ? <Link href={listActionHref("edit_id")} className="panel-card-action"><Pencil className="h-4 w-4" />Düzenle</Link> : null}
                {canViewAttendance ? <Link href={listActionHref("attendance_id")} className="panel-card-action"><ClipboardCheck className="h-4 w-4" />Yoklama</Link> : null}
                {canViewFeedback && status === "completed" ? <Link href={listActionHref("feedback_id")} className="panel-card-action panel-card-action-info"><BarChart3 className="h-4 w-4" />Değerlendirme</Link> : null}
                {canQr && (status === "scheduled" || status === "active") ? (
                  <Link href={`/panel/programs/${program.id}/qr?title=${encodeURIComponent(fixMojibake(program.title))}`} className="panel-card-action panel-card-action-primary">
                    <Play className="h-4 w-4 fill-current" />QR Yoklama
                  </Link>
                ) : null}
                {canComplete && status !== "completed" && status !== "cancelled" ? (
                  <button type="button" onClick={() => void completeProgram()} disabled={actionLoading === "complete"} className="panel-card-action panel-card-action-success">
                    {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Tamamla
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {message ? <div className="panel-notice panel-notice-success">{message}</div> : null}
        {error ? <div className="panel-notice panel-notice-error">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<CalendarDays className="h-5 w-5" />} label="Başlangıç" value={formatDateTime(program.start_at)} />
          <Metric icon={<Clock3 className="h-5 w-5" />} label="Bitiş" value={formatDateTime(program.end_at)} />
          <Metric icon={<Users className="h-5 w-5" />} label="Kontenjan" value={program.application_quota?.toLocaleString("tr-TR") ?? "Sınırsız"} />
          <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="Kredi kesintisi" value={`${program.credit_deduction ?? 0} kredi`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.65fr)]">
          <main className="space-y-6">
            <section className="panel-section-card">
              <div className="mb-5 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-accent" />
                <div><h2 className="font-black text-slate-950">Konum ve yoklama alanı</h2><p className="text-xs text-slate-500">{fixMojibake(program.location_place_name ?? program.location) || "Konum girilmemiş"}</p></div>
              </div>
              {hasCoordinates(program) ? (
                <ProgramLocationMap
                  latitude={program.latitude}
                  longitude={program.longitude}
                  radiusMeters={program.radius_meters}
                  placeName={program.location_place_name}
                  placeAddress={program.location_place_address}
                  placeId={program.location_place_id}
                  placeProvider={program.location_place_provider}
                  heightClassName="h-80"
                />
              ) : <div className="panel-empty-card">Bu program için harita koordinatı kaydedilmemiş.</div>}
            </section>

            <section className="panel-section-card">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><ImageIcon className="h-5 w-5 text-indigo-600" /><div><h2 className="font-black text-slate-950">Program galerisi</h2><p className="text-xs text-slate-500">{photos.length} fotoğraf</p></div></div>
                <Link href={listActionHref("gallery_id")} className="panel-card-action">
                  {canManageMedia ? "Galeriyi yönet" : "Galeriyi görüntüle"}
                </Link>
              </div>
              {photos.length ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {photos.slice(0, 6).map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <div className="relative h-36"><Image src={photo.url} alt={photo.caption ?? "Program fotoğrafı"} fill unoptimized className="object-cover" /></div>
                      {photo.caption ? <p className="line-clamp-2 px-3 py-2 text-xs text-slate-600">{fixMojibake(photo.caption)}</p> : null}
                    </div>
                  ))}
                </div>
              ) : <div className="panel-empty-card">Henüz program fotoğrafı eklenmemiş.</div>}
            </section>

            <section className="panel-section-card">
              <div className="mb-5 flex items-center gap-3"><FileQuestion className="h-5 w-5 text-indigo-600" /><div><h2 className="font-black text-slate-950">Değerlendirme formu</h2><p className="text-xs text-slate-500">Katılımcıya gösterilecek sorular</p></div></div>
              <div className="space-y-3">
                {(program.questions ?? []).map((question, index) => (
                  <div key={question.id} className="panel-card-muted flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-indigo-700">{index + 1}</span>
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-800">{fixMojibake(question.label)}</p><p className="mt-1 text-xs text-slate-500">{question.type === "rating" ? `${question.min ?? 1}-${question.max ?? 5} puan` : question.type === "choice" ? (question.options ?? []).join(" · ") : "Metin yanıtı"}{question.required ? " · Zorunlu" : " · İsteğe bağlı"}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            {canViewAttendance ? (
              <section className="panel-section-card">
                <h2 className="font-black text-slate-950">Katılım özeti</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricSmall label="Yoklama" value={program.attendance_count ?? 0} tone="emerald" />
                  <MetricSmall label="Değerlendirme" value={program.feedback_count ?? 0} tone="indigo" />
                </div>
                {canExportAttendance ? <div className="mt-4"><ExportButtons endpoint={`/panel/programs/${program.id}/attendances/export`} filename={`program_${program.id}_yoklama`} /></div> : null}
              </section>
            ) : null}

            <section className="panel-section-card">
              <h2 className="font-black text-slate-950">Program ayarları</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <DetailRow label="Hedef kitle" value={audiences.map((item) => audienceLabels[item]).join(", ")} />
                <DetailRow label="Yoklama yarıçapı" value={`${program.radius_meters ?? 100} m`} />
                <DetailRow label="Form şablonu" value={program.feedback_form_template_id ? `#${program.feedback_form_template_id}` : "Varsayılan"} />
                <DetailRow label="Yayın durumu" value={program.is_public === false ? "Gizli" : "Herkese açık"} />
                <DetailRow label="Öne çıkarma" value={program.is_featured ? "Evet" : "Hayır"} />
              </dl>
              {canUpdate ? (
                <div className="mt-5 grid gap-2">
                  <button type="button" onClick={() => void updateVisibility("is_public")} disabled={actionLoading === "is_public"} className="panel-card-action w-full">
                    {actionLoading === "is_public" ? <Loader2 className="h-4 w-4 animate-spin" /> : program.is_public === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{program.is_public === false ? "Yayınla" : "Gizle"}
                  </button>
                  <button type="button" onClick={() => void updateVisibility("is_featured")} disabled={actionLoading === "is_featured"} className="panel-card-action w-full">
                    {actionLoading === "is_featured" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{program.is_featured ? "Öne çıkandan kaldır" : "Öne çıkar"}
                  </button>
                </div>
              ) : null}
            </section>

            {guests.length ? (
              <section className="panel-section-card">
                <h2 className="font-black text-slate-950">Konuk / konuşmacı</h2>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">{guests.map((guest) => <li key={guest} className="panel-card-muted p-3">{fixMojibake(guest)}</li>)}</ul>
              </section>
            ) : null}

            <button type="button" onClick={() => void loadProgram()} className="panel-card-action w-full"><RefreshCw className="h-4 w-4" />Detayı yenile</button>
          </aside>
        </div>
      </div>
    </PermissionGate>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="panel-stat-card flex items-start gap-3 p-4"><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{icon}</span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div></div>;
}

function MetricSmall({ label, value, tone }: { label: string; value: number; tone: "emerald" | "indigo" }) {
  const classes = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700";
  return <div className={`rounded-2xl p-4 text-center ${classes}`}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider">{label}</p></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold text-slate-800">{value}</dd></div>;
}
