"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  History,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";
import {
  periodHasWriteCapability,
  PeriodArchiveModeNotice,
  type PeriodOption,
} from "@/components/shared/ProjectPeriodFilters";

type Actor = { id: number; name: string } | null;

type PeriodItem = PeriodOption & {
  id: number;
  name: string;
  status: "planned" | "active" | "closing" | "passive" | "completed" | "cancelled";
  start_date: string | null;
  end_date: string | null;
};

type IntakeSettings = {
  id: number | null;
  project_id: number;
  period_id: number;
  period_name: string;
  period_status: PeriodItem["status"];
  is_open: boolean;
  is_effectively_open: boolean;
  effective_status: "open" | "closed" | "scheduled" | "expired" | "period_inactive" | "project_inactive";
  starts_at: string | null;
  ends_at: string | null;
  next_application_date: string | null;
  has_interview: boolean;
  quota: number | null;
  change_note: string | null;
  opened_at: string | null;
  closed_at: string | null;
  status_changed_at: string | null;
  updated_at: string | null;
  opened_by: Actor;
  closed_by: Actor;
  updated_by: Actor;
  source: "period_window" | "legacy_project";
};

type IntakeResponse = {
  project: { id: number; name: string; slug: string; status: string };
  periods: PeriodItem[];
  selected_period: PeriodItem | null;
  settings: IntakeSettings | null;
  history: IntakeSettings[];
  access: { view: boolean; manage: boolean };
};

type FormState = {
  is_open: boolean;
  starts_at: string;
  ends_at: string;
  next_application_date: string;
  has_interview: boolean;
  quota: string;
  change_note: string;
};

const emptyForm: FormState = {
  is_open: false,
  starts_at: "",
  ends_at: "",
  next_application_date: "",
  has_interview: false,
  quota: "",
  change_note: "",
};

const statusMeta: Record<IntakeSettings["effective_status"], { label: string; className: string }> = {
  open: { label: "Başvuru açık", className: "panel-chip-success" },
  scheduled: { label: "Açılış planlandı", className: "panel-chip-info" },
  expired: { label: "Süre doldu", className: "panel-chip-warning" },
  closed: { label: "Başvuru kapalı", className: "panel-chip-danger" },
  period_inactive: { label: "Dönem aktif değil", className: "panel-chip-warning" },
  project_inactive: { label: "Proje aktif değil", className: "panel-chip-danger" },
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function formFromSettings(settings: IntakeSettings | null): FormState {
  if (!settings) return emptyForm;
  return {
    is_open: settings.is_open,
    starts_at: toLocalInput(settings.starts_at),
    ends_at: toLocalInput(settings.ends_at),
    next_application_date: settings.next_application_date ?? "",
    has_interview: settings.has_interview,
    quota: settings.quota == null ? "" : String(settings.quota),
    change_note: "",
  };
}

export default function PanelApplicationIntakePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.id);
  const initialPeriodId = searchParams.get("period_id") ?? "";
  const { hasPermission, canAccessProject } = usePermissions();
  const [data, setData] = useState<IntakeResponse | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialPeriodId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (periodId?: string) => {
    if (!Number.isFinite(projectId)) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.get<IntakeResponse>(`/panel/projects/${projectId}/application-settings`, {
        params: periodId ? { period_id: periodId } : undefined,
      });
      setData(response.data);
      const resolvedPeriodId = response.data.selected_period?.id ? String(response.data.selected_period.id) : "";
      setSelectedPeriodId(resolvedPeriodId);
      setForm(formFromSettings(response.data.settings));
    } catch (error) {
      console.error("Başvuru ayarları yüklenemedi", error);
      setErrorMessage("Başvuru yönetimi bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route/period change triggers the API synchronization.
    void load(initialPeriodId);
  }, [initialPeriodId, load]);

  const selectedPeriod = data?.selected_period ?? null;
  const canManageAccess = Boolean(
    data?.access.manage &&
    hasPermission("applications.intake.manage") &&
    canAccessProject("applications.intake.manage", projectId),
  );
  const canManage = canManageAccess && periodHasWriteCapability(selectedPeriod ?? undefined, "create_operations");
  const periodCanOpen = selectedPeriod?.status === "active" && data?.project.status === "active";
  const status = data?.settings ? statusMeta[data.settings.effective_status] : statusMeta.closed;
  const hasChanges = useMemo(() => {
    const initial = formFromSettings(data?.settings ?? null);
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [data?.settings, form]);

  const changePeriod = (periodId: string) => {
    if (hasChanges && !window.confirm("Kaydedilmemiş değişiklikler silinecek. Dönem değiştirilsin mi?")) return;
    setSelectedPeriodId(periodId);
    setMessage("");
    void load(periodId);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || !selectedPeriod) return;
    if (form.is_open && !periodCanOpen) {
      setErrorMessage("Başvurular yalnızca aktif proje ve aktif dönem için açılabilir.");
      return;
    }
    if (!form.is_open && selectedPeriod.status === "active" && !form.next_application_date) {
      setErrorMessage("Aktif dönemde başvurular kapalıysa sonraki başvuru tarihi zorunludur.");
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setErrorMessage("Başvuru bitiş zamanı başlangıç zamanından sonra olmalıdır.");
      return;
    }

    const stateChanged = form.is_open !== Boolean(data?.settings?.is_open);
    if (stateChanged) {
      const action = form.is_open ? "açmak" : "kapatmak";
      if (!window.confirm(`${selectedPeriod.name} dönemi başvurularını ${action} istediğinize emin misiniz?`)) return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await api.patch<{ message: string; settings: IntakeSettings }>(
        `/panel/projects/${projectId}/application-settings`,
        {
          period_id: selectedPeriod.id,
          is_open: form.is_open,
          starts_at: toIso(form.starts_at),
          ends_at: toIso(form.ends_at),
          next_application_date: form.next_application_date || null,
          has_interview: form.has_interview,
          quota: form.quota ? Number(form.quota) : null,
          change_note: form.change_note.trim() || null,
        },
      );
      setMessage(response.data.message);
      await load(String(selectedPeriod.id));
    } catch (error: unknown) {
      console.error("Başvuru ayarları güncellenemedi", error);
      const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const validationMessage = Object.values(apiError.response?.data?.errors ?? {}).flat()[0];
      setErrorMessage(validationMessage || apiError.response?.data?.message || "Başvuru ayarları güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  }

  if (!data) {
    return <div className="panel-empty-card py-16">{errorMessage || "Başvuru yönetimi bilgileri bulunamadı."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="panel-page-header">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`panel-chip ${status.className}`}>{status.label}</span>
            <span className="panel-chip panel-chip-info">{selectedPeriod?.name || "Dönem yok"}</span>
          </div>
          <h1 className="panel-page-title">Başvuru Yönetimi</h1>
          <p className="panel-page-description">{data.project.name} için başvuru penceresini, değerlendirme akışını ve kontenjanı dönem bazında yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/panel/projects/${projectId}`} className="panel-button panel-button-secondary">Proje detayına dön</Link>
          <Link href={`/projects/${data.project.slug}`} target="_blank" className="panel-button panel-button-secondary">
            <ExternalLink className="h-4 w-4" /> Public sayfa
          </Link>
        </div>
      </div>

      {message ? <div className="panel-notice panel-notice-success">{message}</div> : null}
      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}
      <PeriodArchiveModeNotice period={selectedPeriod ?? undefined} />
      {selectedPeriod && canManageAccess && !canManage && selectedPeriod.status !== "completed" && selectedPeriod.status !== "cancelled" ? (
        <div className="panel-notice panel-notice-info">
          Başvuru ayarları yalnız aktif dönemde değiştirilebilir. Bu dönem görüntüleme amacıyla salt okunur açıldı.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr),minmax(320px,0.55fr)]">
        <form onSubmit={submit} className="panel-section-card space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="panel-field min-w-64">
              <span className="panel-label">Yönetilecek dönem</span>
              <select value={selectedPeriodId} onChange={(event) => changePeriod(event.target.value)} className="panel-control">
                {data.periods.map((period) => (
                  <option key={period.id} value={period.id}>{period.name} · {period.status}</option>
                ))}
              </select>
            </label>
            {selectedPeriod ? (
              <div className="text-sm text-muted-foreground">
                {selectedPeriod.start_date || "-"} — {selectedPeriod.end_date || "-"}
              </div>
            ) : null}
          </div>

          {!selectedPeriod ? (
            <div className="panel-empty-card py-12">Başvuru yönetimi için önce projeye bağlı bir dönem oluşturulmalıdır.</div>
          ) : (
            <>
              <section className="panel-card-muted space-y-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Başvuru durumu</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Açık seçilse bile başlangıç ve bitiş zamanları public görünürlüğü sınırlar.</p>
                  </div>
                  {data.settings?.is_effectively_open ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> : <XCircle className="h-7 w-7 text-red-600" />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={!canManage || !periodCanOpen}
                    onClick={() => setForm((current) => ({ ...current, is_open: true, next_application_date: "" }))}
                    className={`rounded-2xl border px-4 py-4 text-sm font-black transition ${form.is_open ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"} disabled:cursor-not-allowed disabled:opacity-50`}
                  >Başvuruları Aç</button>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => setForm((current) => ({ ...current, is_open: false }))}
                    className={`rounded-2xl border px-4 py-4 text-sm font-black transition ${!form.is_open ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"} disabled:cursor-not-allowed disabled:opacity-50`}
                  >Başvuruları Kapat</button>
                </div>
                {!periodCanOpen ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    <LockKeyhole className="h-4 w-4" /> Bu dönem aktif olmadığı için başvuru açılamaz.
                  </div>
                ) : null}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-900">Başvuru takvimi</h2></div>
                <div className="panel-form-grid">
                  <label className="panel-field"><span className="panel-label">Başlangıç zamanı</span><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} className="panel-control" disabled={!canManage} /></label>
                  <label className="panel-field"><span className="panel-label">Bitiş zamanı</span><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} className="panel-control" disabled={!canManage} /></label>
                  <label className="panel-field"><span className="panel-label">Sonraki başvuru tarihi {!form.is_open ? "*" : ""}</span><input type="date" value={form.next_application_date} onChange={(event) => setForm((current) => ({ ...current, next_application_date: event.target.value }))} className="panel-control" disabled={!canManage || form.is_open} required={!form.is_open && selectedPeriod.status === "active"} /></label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-900">Değerlendirme ve kontenjan</h2></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="panel-card-muted bg-white">
                    <div className="mb-3 text-sm font-bold text-slate-900">Değerlendirme akışı</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={!canManage} onClick={() => setForm((current) => ({ ...current, has_interview: false }))} className={`rounded-xl border px-3 py-3 text-sm font-bold ${!form.has_interview ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Mülakatsız</button>
                      <button type="button" disabled={!canManage} onClick={() => setForm((current) => ({ ...current, has_interview: true }))} className={`rounded-xl border px-3 py-3 text-sm font-bold ${form.has_interview ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Mülakatlı</button>
                    </div>
                  </div>
                  <label className="panel-field panel-card-muted bg-white"><span className="panel-label">Dönem kontenjanı</span><input type="number" min="1" value={form.quota} onChange={(event) => setForm((current) => ({ ...current, quota: event.target.value }))} placeholder="Boş bırakılırsa sınırsız" className="panel-control" disabled={!canManage} /><span className="text-xs text-muted-foreground">Programa özel kontenjan tanımlanmışsa program değeri önceliklidir.</span></label>
                </div>
                {canManage ? (
                  <Link href={`/panel/periods/form-builder?project_id=${projectId}&period_id=${selectedPeriod.id}`} className="panel-card-action panel-card-action-info w-fit"><ClipboardList className="h-4 w-4" /> Başvuru formunu düzenle</Link>
                ) : null}
              </section>

              <label className="panel-field"><span className="panel-label">İşlem notu</span><textarea value={form.change_note} onChange={(event) => setForm((current) => ({ ...current, change_note: event.target.value }))} className="panel-control min-h-24" maxLength={1000} placeholder="Başvurunun neden açıldığı, kapatıldığı veya tarih değişikliği hakkında kısa not" disabled={!canManage} /></label>

              <div className="panel-modal-footer">
                {!canManage ? <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Salt okunur erişim</div> : null}
                <button type="submit" disabled={!canManage || saving || !hasChanges} className="panel-button panel-button-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Ayarları Kaydet
                </button>
              </div>
            </>
          )}
        </form>

        <aside className="space-y-5">
          <div className="panel-section-card">
            <div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-900">İşlem sorumluluğu</h2></div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="panel-card-muted"><div className="panel-label">Son güncelleyen</div><div className="mt-1 font-bold text-slate-900">{data.settings?.updated_by?.name || "Eski kayıttan aktarıldı"}</div><div className="text-xs text-muted-foreground">{formatDateTime(data.settings?.updated_at ?? null)}</div></div>
              <div className="panel-card-muted"><div className="panel-label">Son açan</div><div className="mt-1 font-bold text-emerald-700">{data.settings?.opened_by?.name || "-"}</div><div className="text-xs text-muted-foreground">{formatDateTime(data.settings?.opened_at ?? null)}</div></div>
              <div className="panel-card-muted"><div className="panel-label">Son kapatan</div><div className="mt-1 font-bold text-red-700">{data.settings?.closed_by?.name || "-"}</div><div className="text-xs text-muted-foreground">{formatDateTime(data.settings?.closed_at ?? null)}</div></div>
            </div>
          </div>

          <div className="panel-section-card">
            <div className="flex items-center gap-2"><History className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-900">Dönem geçmişi</h2></div>
            <div className="mt-4 space-y-3">
              {data.history.length ? data.history.map((item) => {
                const itemStatus = statusMeta[item.effective_status];
                return (
                  <button key={item.period_id} type="button" onClick={() => changePeriod(String(item.period_id))} className="panel-card-muted w-full bg-white text-left transition hover:border-indigo-200">
                    <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-900">{item.period_name}</span><span className={`panel-chip ${itemStatus.className}`}>{itemStatus.label}</span></div>
                    <div className="mt-2 text-xs text-muted-foreground">{item.updated_by?.name || "Sistem aktarımı"} · {formatDateTime(item.updated_at)}</div>
                  </button>
                );
              }) : <div className="text-sm text-muted-foreground">Henüz dönem bazlı başvuru kaydı yok.</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
