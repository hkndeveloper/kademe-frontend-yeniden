"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { toIstanbulDateTimeLocal, withIstanbulOffset } from "@/lib/istanbul-time";

type Training = { id: number; period_id: number; title: string; description?: string; is_active: boolean; application_open: boolean; quota?: number | null; application_start_at?: string | null; application_end_at?: string | null; modules?: Array<{ id: number }> };
type MessageTemplate = { event: string; email_subject?: string; email_body?: string; sms_body?: string };
type AdmissionSettings = { application_scope: "project" | "training"; trainings: Training[]; templates: MessageTemplate[]; events: string[]; variables: string[]; periods: Array<{ id: number; name: string; status: string }>; current_period_id: number | null; modules: Array<{ id: number; title: string; period_id: number; training_id: number | null }>; sessions: Array<{ id: number; title: string; period_id: number; project_module_id: number | null }> };
const eventLabels: Record<string, string> = { received: "Başvuru alındı", interview_planned: "Mülakat daveti", interview_passed: "Mülakat olumlu", interview_failed: "Mülakat olumsuz", accepted: "Kabul", rejected: "Ret", waitlisted: "Yedek liste", waitlist_invited: "Yedek liste daveti" };
const emptyDraft = { period_id: "", title: "", description: "", is_active: true, application_open: false, quota: "", application_start_at: "", application_end_at: "", module_ids: [] as number[] };

export function AdmissionsEditor({ projectId }: { projectId: number }) {
  const { canAccessProject } = usePermissions();
  const canView = canAccessProject("applications.view", projectId);
  const canManage = canAccessProject("applications.intake.manage", projectId);
  const canManageSessions = canAccessProject("programs.update", projectId);
  const [settings, setSettings] = useState<AdmissionSettings | null>(null);
  const [scope, setScope] = useState<"project" | "training">("project");
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<number | null>(null);
  const [event, setEvent] = useState("received");
  const [template, setTemplate] = useState({ email_subject: "", email_body: "", sms_body: "" });
  const [sessionId, setSessionId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (!canView) return Promise.resolve();
    return api.get<AdmissionSettings>(`/panel/projects/${projectId}/admissions`).then(response => {
      setSettings(response.data); setScope(response.data.application_scope);
      const found = response.data.templates.find(item => item.event === event);
      setTemplate({ email_subject: found?.email_subject ?? "", email_body: found?.email_body ?? "", sms_body: found?.sms_body ?? "" });
    }).catch(() => { setError("Başvuru yönetimi yüklenemedi. Yeni backend sürümünün ve veritabanı geçişinin hazır olduğundan emin olun."); });
  }, [projectId, canView, event]);
  useEffect(() => { void load(); }, [load]);
  const save = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage("Kaydedildi."); await load(); }
    catch (exception) { setError(isAxiosError(exception) ? exception.response?.data?.message ?? "İşlem tamamlanamadı." : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  };
  const edit = (training?: Training) => {
    setEditing(training?.id ?? null);
    setDraft(training ? { period_id: String(training.period_id), title: training.title, description: training.description ?? "", is_active: training.is_active, application_open: training.application_open, quota: training.quota == null ? "" : String(training.quota), application_start_at: toIstanbulDateTimeLocal(training.application_start_at), application_end_at: toIstanbulDateTimeLocal(training.application_end_at), module_ids: training.modules?.map(module => module.id) ?? [] }
      : { ...emptyDraft, period_id: String(settings?.current_period_id ?? "") });
  };
  const preview = (text: string) => text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => ({ ad: "Ayşe", soyad: "Örnek", proje_adi: "Örnek proje", donem_adi: "2026 Güz", egitim_adi: "Liderlik Eğitimi", mulakat_tarihi: "12 Ekim 2026 14:00", takip_linki: "[Güvenli takip bağlantısı]" }[key] ?? `[${key}]`));
  if (!canView) return null;
  return <section className="panel-card p-6 mb-6 space-y-6">
    <div><h2 className="text-xl font-bold">Başvuru, eğitim ve mesaj yönetimi</h2><p className="text-sm text-muted-foreground mt-2">Başvuruda aday kaydı alınır; hesap yalnız kabulde açılır. Eski kayıtlar korunur.</p></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    {settings && <>
      <div className="flex gap-3 flex-wrap items-end"><label className="flex-1">Başvuru kapsamı<select className="panel-control mt-2" value={scope} disabled={!canManage || busy} onChange={e => setScope(e.target.value as typeof scope)}><option value="project">Proje bazında · dönem içinde tek başvuru</option><option value="training">Eğitim bazında · her eğitime ayrı başvuru</option></select></label>
        {canManage && <button type="button" className="panel-btn-primary" disabled={busy} onClick={() => void save(() => api.put(`/panel/projects/${projectId}/admissions/settings`, { application_scope: scope }))}>Kapsamı kaydet</button>}</div>
      {settings.application_scope === "training" && <div className="space-y-4">
        <h3 className="font-bold">Eğitimler</h3>
        <p className="text-sm text-muted-foreground">Eğitim başvuruları mülakatsızdır. Her eğitimin tarihleri, kontenjanı ve formu ayrıdır. Açılması için proje/dönem başvuru penceresi de açık olmalı.</p>
        {settings.trainings.map(training => <div key={training.id} className="rounded-xl border p-4 flex flex-wrap justify-between gap-3"><span>{training.title} · {training.application_open ? "Başvuru etkin" : "Başvuru kapalı"}</span><div className="flex gap-3">{canManage && <button type="button" onClick={() => edit(training)}>Düzenle</button>}<Link href={`/panel/periods/form-builder?project_id=${projectId}&period_id=${training.period_id}&training_id=${training.id}`}>Dinamik form</Link></div></div>)}
        {canManage && <>
          <button type="button" className="panel-btn-secondary" onClick={() => edit()}>Yeni eğitim</button>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(() => {
            const payload = { ...draft, period_id: Number(draft.period_id), quota: draft.quota === "" ? null : Number(draft.quota), application_start_at: withIstanbulOffset(draft.application_start_at) || null, application_end_at: withIstanbulOffset(draft.application_end_at) || null };
            const request = editing ? api.put(`/panel/projects/${projectId}/admissions/trainings/${editing}`, payload) : api.post(`/panel/projects/${projectId}/admissions/trainings`, payload);
            return request.then(response => { setEditing(response.data.training.id); return response; });
          }); }}>
            <h4 className="font-semibold">{editing ? "Eğitimi düzenle" : "Yeni eğitim oluştur"}</h4>
            <label className="block">Dönem<select className="panel-control" required value={draft.period_id} disabled={Boolean(editing)} onChange={e => setDraft({ ...draft, period_id: e.target.value, module_ids: [] })}><option value="">Dönem seçin</option>{settings.periods.map(period => <option key={period.id} value={period.id}>{period.name} · {period.status}</option>)}</select></label>
            <label className="block">Eğitim adı<input className="panel-control" required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className="block">Açıklama<textarea className="panel-control" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
            <label className="block">Kontenjan (boş: sınırsız)<input className="panel-control" type="number" min={0} value={draft.quota} onChange={e => setDraft({ ...draft, quota: e.target.value })} /></label>
            <label className="block">Başlangıç tarihi (Türkiye saati)<input type="datetime-local" className="panel-control" value={draft.application_start_at} onChange={e => setDraft({ ...draft, application_start_at: e.target.value })} /></label>
            <label className="block">Bitiş tarihi (Türkiye saati)<input type="datetime-local" className="panel-control" value={draft.application_end_at} onChange={e => setDraft({ ...draft, application_end_at: e.target.value })} /></label>
            <label className="block"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} /> Eğitim aktif</label>
            <label className="block"><input type="checkbox" checked={draft.application_open} onChange={e => setDraft({ ...draft, application_open: e.target.checked })} /> Başvuru etkin</label>
            <fieldset><legend className="font-semibold">Eğitimin modülleri</legend>{settings.modules.filter(module => String(module.period_id) === draft.period_id).map(module => <label key={module.id} className="block mt-2"><input type="checkbox" disabled={Boolean(module.training_id && module.training_id !== editing)} checked={draft.module_ids.includes(module.id)} onChange={e => setDraft({ ...draft, module_ids: e.target.checked ? [...draft.module_ids, module.id] : draft.module_ids.filter(id => id !== module.id) })} /> {module.title}</label>)}</fieldset>
            <button className="panel-btn-primary" disabled={busy}>Eğitimi kaydet</button>
          </form>
        </>}
        {canManageSessions && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(() => api.put(`/panel/projects/${projectId}/admissions/sessions/${sessionId}`, { project_module_id: Number(moduleId) })); }}>
          <h4 className="font-semibold">Ders/oturumu eğitim modülüne bağla</h4><select aria-label="Oturum" className="panel-control" required value={sessionId} onChange={e => { setSessionId(e.target.value); setModuleId(""); }}><option value="">Oturum seçin</option>{settings.sessions.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}</select>
          <select aria-label="Eğitim modülü" className="panel-control" required value={moduleId} onChange={e => setModuleId(e.target.value)}><option value="">Eğitim modülü seçin</option>{settings.modules.filter(module => module.training_id && module.period_id === settings.sessions.find(session => String(session.id) === sessionId)?.period_id).map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select><button className="panel-btn-primary" disabled={busy}>Oturumu bağla</button>
        </form>}
      </div>}
      <div className="space-y-3"><h3 className="font-bold">Proje mesaj şablonları</h3><p className="text-sm text-muted-foreground">Boş alanlarda mevcut varsayılan e-posta korunur. SMS sağlayıcısı bağlı değilken gönderim başarılı sayılmaz.</p>
        <label className="block">Olay<select className="panel-control" value={event} onChange={e => setEvent(e.target.value)}>{settings.events.map(value => <option key={value} value={value}>{eventLabels[value] ?? value}</option>)}</select></label>
        <p className="text-xs">Değişkenler: {settings.variables.map(value => `{{${value}}}`).join(" · ")}</p>
        <label className="block">E-posta konusu<input className="panel-control" disabled={!canManage} value={template.email_subject} onChange={e => setTemplate({ ...template, email_subject: e.target.value })} /></label>
        <label className="block">E-posta metni<textarea className="panel-control" rows={5} disabled={!canManage} value={template.email_body} onChange={e => setTemplate({ ...template, email_body: e.target.value })} /></label>
        <label className="block">SMS metni<textarea className="panel-control" rows={3} disabled={!canManage} value={template.sms_body} onChange={e => setTemplate({ ...template, sms_body: e.target.value })} /></label>
        <div className="rounded-xl border p-4 whitespace-pre-wrap"><strong>Örnek önizleme</strong><p>{preview(template.email_subject)}</p><p>{preview(template.email_body)}</p><p>{preview(template.sms_body)}</p></div>
        {canManage && <button type="button" className="panel-btn-primary" disabled={busy} onClick={() => void save(() => api.put(`/panel/projects/${projectId}/admissions/templates/${event}`, template))}>Şablonu kaydet</button>}
      </div>
    </>}
  </section>;
}
