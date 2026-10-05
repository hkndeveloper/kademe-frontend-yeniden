"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api/axios";

type Status = {
  measured_at: string;
  google_calendar: { configured: boolean; connected: boolean; last_synced_at: string | null; last_error_at: string | null };
  email: { sent_24h: number; failed_24h: number; queued_24h: number; last_sent_at: string | null; last_failed_at: string | null };
  waitlist: { pending: number; failed: number; unknown: number; legacy_untracked: number; last_sent_at: string | null; last_failed_at: string | null; auto_schedule_enabled: boolean };
  scheduler: { last_tick_at: string | null };
  queue: { driver: string | null; pending: number | null; failed_total: number | null; last_failed_at: string | null; last_success_at: null };
};

function timeLabel(value: string | null): string {
  if (!value) return "Kayıt yok";
  // Database timestamps have no offset. Preserve their server time instead of guessing a timezone.
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(value)) return `${value.replace("T", " ")} (sunucu saati)`;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString("tr-TR");
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0"><span className="text-slate-600">{label}</span><strong className="text-right text-slate-900">{value}</strong></div>;
}

export function OperationsStatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get<Status>("/panel/dashboard/operations-status");
      setStatus(response.data);
    } catch {
      setStatus(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    api.get<Status>("/panel/dashboard/operations-status")
      .then((response) => { if (mounted) setStatus(response.data); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="İşletim durumu">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-900">İşletim durumu</h2><p className="text-xs text-slate-500">Son okuma: {timeLabel(status?.measured_at ?? null)}. Bu ekran otomatik yenilenmez.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{loading ? "Yükleniyor" : "Yenile"}</button>
    </div>
    {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">İşletim durumu alınamadı. İşlem logları ve servis kayıtları ayrı kontrol edilmeli.</p> : null}
    {status ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">Google Takvim</h3><Metric label="Yapılandırma / bağlantı kaydı" value={`${status.google_calendar.configured ? "Var" : "Yok"} / ${status.google_calendar.connected ? "Var" : "Yok"}`} /><Metric label="Son senkron kaydı" value={timeLabel(status.google_calendar.last_synced_at)} /><Metric label="Son kayıtlı hata" value={timeLabel(status.google_calendar.last_error_at)} /><p className="mt-2 text-xs text-slate-500">Sorumlu: takvim yöneticisi. Bağlantı kaydı, Google erişimini doğrulamaz. Ayrıntı: Takvim ekranı.</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">E-posta</h3><Metric label="Son 24 saatte gönderildi" value={status.email.sent_24h} /><Metric label="Başarısız / kuyrukta" value={`${status.email.failed_24h} / ${status.email.queued_24h}`} /><Metric label="Son başarılı kayıt" value={timeLabel(status.email.last_sent_at)} /><Metric label="Son başarısız kayıt" value={timeLabel(status.email.last_failed_at)} /><p className="mt-2 text-xs text-slate-500">Sorumlu: duyuru gönderen birim. Ayrıntı: Duyurular → İletişim Logları. “Gönderildi” alıcıya teslim kanıtı değildir.</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">Yedek davetleri</h3><Metric label="Bekleyen / başarısız / belirsiz" value={`${status.waitlist.pending} / ${status.waitlist.failed} / ${status.waitlist.unknown}`} /><Metric label="Durumu izlenmeyen eski davet" value={status.waitlist.legacy_untracked} /><Metric label="Son gönderilen davet" value={timeLabel(status.waitlist.last_sent_at)} /><Metric label="Başarısız kaydın son değişimi" value={timeLabel(status.waitlist.last_failed_at)} /><Metric label="Otomatik pilot" value={status.waitlist.auto_schedule_enabled ? "Açık" : "Kapalı"} /><p className="mt-2 text-xs text-slate-500">Sorumlu: ilgili proje koordinatörü. Ayrıntı ve güvenli yeniden deneme: Başvurular.</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">Zamanlayıcı</h3><Metric label="Son veritabanı işareti" value={timeLabel(status.scheduler.last_tick_at)} /><p className="mt-2 text-xs text-slate-500">İşaret, zamanlayıcının çalıştığını gösterir; diğer görevlerin başarılı olduğunu kanıtlamaz. Sorumlu: sistem işletimi.</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">Kuyruk</h3><Metric label="Sürücü" value={status.queue.driver ?? "Bilinmiyor"} /><Metric label="Veritabanında bekleyen" value={status.queue.pending ?? "Ölçülemiyor"} /><Metric label="Kayıtlı başarısız iş" value={status.queue.failed_total ?? "Ölçülemiyor"} /><Metric label="Son kayıtlı hata" value={timeLabel(status.queue.last_failed_at)} /><Metric label="Son başarılı iş" value="Ölçülmüyor" /><p className="mt-2 text-xs text-slate-500">Sorumlu: sistem işletimi. Bekleyen sayı yalnız veritabanı kuyruk sürücüsünü kapsar; iş tekrarını platform kayıtlarıyla değerlendirin.</p></div>
    </div> : null}
  </section>;
}
