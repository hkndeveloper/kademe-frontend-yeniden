"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { panelStatusChipClass } from "@/lib/status-style";
import type {
  ClosureCheck,
  ClosureSummary,
  PeriodArchive,
  PeriodItem,
  PeriodTransition,
} from "../period-contract";

interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

const statusLabels: Record<string, string> = {
  planned: "Planlandı",
  passive: "Eski pasif",
  active: "Aktif",
  closing: "Kapanış hazırlanıyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const eventLabels: Record<string, string> = {
  created: "Dönem oluşturuldu",
  updated: "Dönem bilgileri güncellendi",
  activated: "Dönem aktifleştirildi",
  closing_started: "Kapanış hazırlığı başlatıldı",
  closing_cancelled: "Kapanış hazırlığı iptal edildi",
  completed: "Dönem tamamlandı",
  reopened: "Dönem yeniden açıldı",
  cancelled: "Dönem iptal edildi",
  legacy_status_backfilled: "Eski durum dönüştürüldü",
  current_pointer_backfilled: "Güncel dönem bağlantısı kuruldu",
};

const transitionLabels: Record<PeriodTransition, string> = {
  activate: "Aktifleştir",
  start_closing: "Kapanışı başlat",
  cancel_closing: "Kapanışı iptal et",
  complete: "Dönemi tamamla",
  reopen: "Yeniden aç",
  cancel: "Dönemi iptal et",
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const payload = (error as AxiosError<ApiErrorPayload>).response?.data;
  const validationMessage = Object.values(payload?.errors ?? {}).flat()[0];
  return validationMessage || payload?.message || fallback;
}

function formatDate(value?: string | null, includeTime = false): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminPeriodWorkspacePage() {
  const params = useParams<{ id: string }>();
  const periodId = Number(params.id);
  const { canAccessProject } = usePermissions();
  const [period, setPeriod] = useState<PeriodItem | null>(null);
  const [closure, setClosure] = useState<ClosureSummary | null>(null);
  const [archives, setArchives] = useState<PeriodArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyingArchiveId, setVerifyingArchiveId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transition, setTransition] = useState<PeriodTransition | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!Number.isInteger(periodId) || periodId <= 0) {
      setError("Geçersiz dönem bağlantısı.");
      setLoading(false);
      return;
    }

    try {
      const [periodResponse, closureResponse, archiveResponse] = await Promise.all([
        api.get<{ period: PeriodItem }>(`/panel/periods/${periodId}`),
        api.get<ClosureSummary>(`/panel/periods/${periodId}/closure-summary`),
        api.get<{ archives: PeriodArchive[] }>(`/panel/periods/${periodId}/archives`),
      ]);
      setPeriod(periodResponse.data.period);
      setClosure(closureResponse.data);
      setArchives(archiveResponse.data.archives ?? []);
      setError(null);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Dönem çalışma alanı yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadWorkspace]);

  const allowedTransitions = period?.lifecycle.allowed_transitions ?? [];
  const archiveMode = period?.lifecycle.is_archive_mode ?? false;
  const canVerifyArchive = period ? canAccessProject("periods.archive.verify", period.project_id) : false;

  const metrics = useMemo(() => closure ? [
    ["Katılımcı", closure.summary.participants.total],
    ["Program", closure.summary.programs.total],
    ["Başvuru", closure.summary.applications.total],
    ["Ödev", closure.summary.assignments.total],
    ["Sertifika", closure.summary.certificates.total],
    ["Kredi ort.", closure.summary.credit_snapshot.average_credit],
  ] : [], [closure]);

  const executeTransition = async (values: TransitionValues) => {
    if (!period || !transition) return;
    setActionLoading(true);
    setError(null);
    setMessage(null);

    const endpoint = transition === "start_closing"
      ? "closing/start"
      : transition === "cancel_closing"
        ? "closing/cancel"
        : transition;
    const payload = transition === "complete"
      ? { notes: values.reason || null }
      : transition === "reopen"
        ? { reason: values.reason, target_status: values.targetStatus }
        : { reason: values.reason || null };

    try {
      await api.post(`/panel/periods/${period.id}/${endpoint}`, payload);
      setTransition(null);
      setMessage(`${period.name}: ${transitionLabels[transition]} işlemi tamamlandı.`);
      setLoading(true);
      await loadWorkspace();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Dönem işlemi tamamlanamadı."));
    } finally {
      setActionLoading(false);
    }
  };

  const verifyArchive = async (archiveId: number) => {
    if (!period) return;
    setVerifyingArchiveId(archiveId);
    setError(null);
    try {
      const response = await api.post<{ verification: { status: string } }>(`/panel/periods/${period.id}/archives/${archiveId}/verify`);
      setMessage(response.data.verification.status === "verified" ? "Arşiv bütünlüğü doğrulandı." : "Arşiv bütünlüğü doğrulanamadı.");
      await loadWorkspace();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Arşiv doğrulanamadı."));
    } finally {
      setVerifyingArchiveId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  if (!period || !closure) {
    return <div className="space-y-4"><Link href="/panel/periods" className="panel-card-action"><ArrowLeft className="h-4 w-4" />Dönemlere dön</Link><div className="panel-notice panel-notice-error">{error ?? "Dönem bulunamadı."}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/panel/periods" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            <ArrowLeft className="h-4 w-4" /> Dönem listesine dön
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`panel-chip ${panelStatusChipClass(period.status)}`}>{statusLabels[period.status] ?? period.status}</span>
            {period.lifecycle.is_current ? <span className="panel-chip panel-chip-info"><CircleDot className="h-3.5 w-3.5" /> Güncel dönem</span> : null}
            <span className="panel-chip">v{period.lifecycle.version}</span>
          </div>
          <h1 className="mt-3 text-3xl font-black text-slate-950">{period.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{period.project?.name ?? `Proje #${period.project_id}`}</p>
        </div>

        <div className="flex max-w-2xl flex-wrap gap-2">
          {allowedTransitions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTransition(item)}
              disabled={item === "complete" && !closure.readiness.ready}
              className={`panel-button h-11 px-4 ${item === "complete" || item === "activate" ? "panel-button-primary" : "panel-button-secondary"}`}
              title={item === "complete" && !closure.readiness.ready ? "Önce kapanış engellerini çözün." : undefined}
            >
              <TransitionIcon transition={item} /> {transitionLabels[item]}
            </button>
          ))}
        </div>
      </div>

      {message ? <div className="panel-notice panel-notice-success">{message}</div> : null}
      {error ? <div className="panel-notice panel-notice-error">{error}</div> : null}

      {archiveMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Salt okunur arşiv modu</p><p className="mt-1 text-sm">Bu dönemde normal oluşturma ve düzenleme işlemleri kapalıdır. Düzeltme gerekiyorsa yetkili “Yeniden aç” akışını gerekçeyle kullanmalıdır.</p></div></div>
        </div>
      ) : period.status === "closing" ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Kapanış hazırlığı sürüyor</p><p className="mt-1 text-sm">Yeni dönemsel kayıtlar kapalıdır; mevcut başvuru, finans ve katılımcı sonuçları tamamlanabilir.</p></div></div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="Dönem aralığı" value={`${formatDate(period.start_date)} – ${formatDate(period.end_date)}`} />
        <InfoCard icon={<CircleDot className="h-5 w-5" />} label="Başlangıç kredisi" value={String(period.credit_start_amount)} />
        <InfoCard icon={<AlertTriangle className="h-5 w-5" />} label="Kredi eşiği" value={String(period.credit_threshold)} />
        <InfoCard icon={<Archive className="h-5 w-5" />} label="Arşiv sürümü" value={period.latest_archive ? `v${period.latest_archive.archive_version}` : "Henüz yok"} />
      </div>

      <section className="panel-section-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-xl font-bold text-slate-950">Kapanış hazırlığı</h2><p className="text-sm text-muted-foreground">{formatDate(closure.readiness.calculated_at, true)} tarihinde yeniden hesaplandı.</p></div>
          <span className={`panel-chip ${closure.readiness.ready ? "panel-chip-success" : "panel-chip-danger"}`}>
            {closure.readiness.ready ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {closure.readiness.ready ? "Tamamlamaya hazır" : `${closure.readiness.blockers.length} engel var`}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([label, value]) => <div key={label} className="panel-card-muted"><p className="text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>)}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <CheckGroup title="Tamamlamayı engelleyenler" items={closure.readiness.blockers} tone="danger" projectId={period.project_id} periodId={period.id} />
          <CheckGroup title="Operasyonel uyarılar" items={closure.readiness.warnings} tone="warning" projectId={period.project_id} periodId={period.id} />
        </div>
        {closure.readiness.blockers.length === 0 && closure.readiness.warnings.length === 0 ? <div className="panel-notice panel-notice-success mt-5">Tüm kapanış kontrolleri temiz.</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-section-card">
          <h2 className="text-xl font-bold text-slate-950">Yaşam döngüsü zaman çizelgesi</h2>
          <div className="mt-5 space-y-4">
            {(period.lifecycle_events ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Henüz yaşam döngüsü olayı yok.</p> : (period.lifecycle_events ?? []).slice().reverse().map((event) => (
              <div key={event.id} className="relative border-l-2 border-indigo-100 pb-4 pl-5 last:pb-0">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-900">{eventLabels[event.event_type] ?? event.event_type}</p><time className="text-xs text-muted-foreground">{formatDate(event.created_at, true)}</time></div>
                <p className="mt-1 text-xs text-muted-foreground">{event.actor?.name ?? "Sistem"}{event.from_status || event.to_status ? ` · ${event.from_status ?? "-"} → ${event.to_status ?? "-"}` : ""}</p>
                {event.reason ? <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{event.reason}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="panel-section-card">
          <h2 className="text-xl font-bold text-slate-950">Arşiv sürümleri</h2>
          <div className="mt-5 space-y-3">
            {archives.length === 0 ? <p className="text-sm text-muted-foreground">Bu dönem için henüz arşiv oluşturulmadı.</p> : archives.map((archive) => (
              <div key={archive.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">Sürüm {archive.archive_version}</p><p className="mt-1 text-xs text-muted-foreground">Şema v{archive.schema_version} · {formatDate(archive.closed_at, true)}</p></div><ArchiveStatus status={archive.verification_status} /></div>
                <p className="mt-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-600">{archive.integrity_hash}</p>
                {archive.correction_reason ? <p className="mt-2 text-xs text-amber-700">Düzeltme: {archive.correction_reason}</p> : null}
                {canVerifyArchive ? <button type="button" onClick={() => void verifyArchive(archive.id)} disabled={verifyingArchiveId === archive.id} className="panel-card-action panel-card-action-info mt-3">{verifyingArchiveId === archive.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Bütünlüğü doğrula</button> : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      {transition ? <TransitionModal period={period} transition={transition} readiness={closure.readiness} loading={actionLoading} onClose={() => setTransition(null)} onSubmit={executeTransition} /> : null}
    </div>
  );
}

function TransitionIcon({ transition }: { transition: PeriodTransition }) {
  if (transition === "activate") return <Play className="h-4 w-4" />;
  if (transition === "start_closing" || transition === "complete") return <FileCheck2 className="h-4 w-4" />;
  if (transition === "reopen" || transition === "cancel_closing") return <RotateCcw className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="panel-section-card"><div className="flex items-center gap-3 text-indigo-600">{icon}<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div><p className="mt-3 font-bold text-slate-950">{value}</p></div>;
}

const checkLinks: Record<string, string> = {
  open_programs: "/panel/programs",
  open_application_window: "/panel/projects/{project}/applications",
  unresolved_applications: "/panel/projects/{project}/applications",
  pending_financials: "/panel/financials",
  unreviewed_assignment_submissions: "/panel/assignments",
  missing_participant_outcomes: "/panel/participants",
  open_kpd_work: "/panel/kpd",
  open_support_or_requests: "/panel/support",
  undelivered_certificates: "/panel/certificates",
  missing_feedback: "/panel/programs",
  low_credit: "/panel/participants",
};

function CheckGroup({ title, items, tone, projectId, periodId }: { title: string; items: ClosureCheck[]; tone: "danger" | "warning"; projectId: number; periodId: number }) {
  const toneClass = tone === "danger" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-900";
  return <div><h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>{items.length === 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Kayıt yok.</div> : <div className="space-y-2">{items.map((item) => { const base = checkLinks[item.code]; const href = base ? `${base.replace("{project}", String(projectId))}?project_id=${projectId}&period_id=${periodId}` : null; return <div key={item.code} className={`rounded-2xl border p-4 ${toneClass}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.message}</p><p className="mt-1 text-xs opacity-75">{item.count} kayıt</p></div>{href ? <Link href={href} className="shrink-0 text-xs font-bold underline underline-offset-4">Modüle git</Link> : null}</div></div>; })}</div>}</div>;
}

function ArchiveStatus({ status }: { status?: string | null }) {
  if (status === "verified") return <span className="panel-chip panel-chip-success"><ShieldCheck className="h-3.5 w-3.5" /> Doğrulandı</span>;
  if (status === "invalid") return <span className="panel-chip panel-chip-danger"><AlertTriangle className="h-3.5 w-3.5" /> Geçersiz</span>;
  return <span className="panel-chip"><Clock3 className="h-3.5 w-3.5" /> Doğrulanmadı</span>;
}

interface TransitionValues { reason: string; targetStatus: "planned" | "active" }

function TransitionModal({ period, transition, readiness, loading, onClose, onSubmit }: { period: PeriodItem; transition: PeriodTransition; readiness: ClosureSummary["readiness"]; loading: boolean; onClose: () => void; onSubmit: (values: TransitionValues) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [targetStatus, setTargetStatus] = useState<"planned" | "active">("planned");
  const requiresReason = transition === "cancel" || transition === "cancel_closing" || transition === "reopen";
  const reasonMin = transition === "reopen" ? 10 : 3;
  const valid = (!requiresReason || reason.trim().length >= reasonMin) && (transition !== "complete" || (readiness.ready && confirmation === period.name));

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="period-transition-title"><div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Yaşam döngüsü işlemi</p><h2 id="period-transition-title" className="mt-1 text-2xl font-black text-slate-950">{transitionLabels[transition]}</h2></div><button type="button" onClick={onClose} className="panel-card-action" aria-label="Kapat"><XCircle className="h-5 w-5" /></button></div>
    {transition === "start_closing" ? <div className="panel-notice mt-5 border-blue-200 bg-blue-50 text-blue-900">Başvuru penceresi kapanacak ve yeni dönemsel kayıtlar duracaktır. Mevcut sonuçlandırma işlemleri devam eder.</div> : null}
    {transition === "complete" ? <div className={`panel-notice mt-5 ${readiness.ready ? "panel-notice-success" : "panel-notice-error"}`}>{readiness.ready ? "Dönem snapshot ve hash zinciriyle arşivlenecek; ardından salt okunur olacaktır." : "Kapanış engelleri çözülmeden dönem tamamlanamaz."}</div> : null}
    {transition === "reopen" ? <label className="mt-5 block text-sm font-semibold text-slate-800">Hedef durum<select value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as "planned" | "active")} className="panel-control mt-2"><option value="planned">Planlanan</option><option value="active">Aktif ve güncel dönem</option></select></label> : null}
    <label className="mt-5 block text-sm font-semibold text-slate-800">{transition === "complete" ? "Kapanış notu" : "İşlem gerekçesi"}{requiresReason ? " *" : ""}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="panel-control mt-2" placeholder={requiresReason ? `En az ${reasonMin} karakter` : "İsteğe bağlı açıklama"} /></label>
    {transition === "complete" ? <label className="mt-4 block text-sm font-semibold text-slate-800">Onaylamak için dönem adını yazın: <strong>{period.name}</strong><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="panel-control mt-2" /></label> : null}
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="panel-button panel-button-secondary h-11 px-5">Vazgeç</button><button type="button" onClick={() => void onSubmit({ reason: reason.trim(), targetStatus })} disabled={!valid || loading} className="panel-button panel-button-primary h-11 px-5">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}{transitionLabels[transition]}</button></div>
  </div></div>;
}
