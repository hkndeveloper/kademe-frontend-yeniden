"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/axios";
import { formatPublicDate } from "@/lib/aigocy";
import { PageHero } from "@/components/aigocy/Primitives";

type TrackedApplication = {
  id: number; status: string; project?: { name: string }; training?: { title: string };
  interview_at?: string; rejection_reason?: string; can_respond_waitlist: boolean; account_available: boolean;
};
const labels: Record<string, string> = { pending: "Değerlendirme bekliyor", accepted: "Kabul edildi", rejected: "Reddedildi", waitlisted: "Yedek listede", interview_planned: "Mülakat planlandı", interview_passed: "Mülakat olumlu", interview_failed: "Mülakat olumsuz" };

export default function ApplicationTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<TrackedApplication | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    return api.get<{ application: TrackedApplication }>(`/applications/track/${id}`, { headers: { "X-Application-Token": token ?? "" } }).then(response => {
      setApplication(response.data.application); setError("");
    }).catch(() => { setError("Takip bağlantısı geçersiz, süresi dolmuş veya başvuru bilgileri şu anda alınamıyor."); });
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const respond = async (decision: "accept" | "reject") => {
    setBusy(true); setError("");
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
      await api.post(`/applications/track/${id}/waitlist-response`, { decision }, { headers: { "X-Application-Token": token } });
      await load();
    } catch { setError("Yanıt kaydedilemedi. Davetin süresi veya kontenjanı değişmiş olabilir; sayfayı yenileyin."); }
    finally { setBusy(false); }
  };
  return <>
    <PageHero badge="Başvuru takibi" title="Başvurunun durumu" description="Hesap oluşturmadan başvuru sürecini güvenli bağlantınla takip et." />
    <section className="flat-spacing"><div className="container">
      {error && <p role="alert">{error}</p>}
      {application && <article className="box-white p-6 rounded-3xl">
        <h2>{application.project?.name}{application.training ? ` · ${application.training.title}` : ""}</h2>
        <p className="mt-4">Başvuru #{application.id} · {labels[application.status] ?? application.status}</p>
        {application.interview_at && <p className="mt-4">Mülakat: {formatPublicDate(application.interview_at)}</p>}
        {application.rejection_reason && <p className="mt-4">{application.rejection_reason}</p>}
        {application.can_respond_waitlist && <div className="mt-6 flex gap-4 flex-wrap">
          <button className="tf-btn" disabled={busy} onClick={() => void respond("accept")}>Yedek davetini kabul et</button>
          <button className="tf-btn style2" disabled={busy} onClick={() => void respond("reject")}>Daveti reddet</button>
        </div>}
        {application.account_available ? <div className="mt-6"><p>Kabul edildin. İlk kabulünde hesabın için şifre belirleme bağlantısı e-postana gönderilir.</p><Link className="tf-btn mt-4" href="/auth/login">Panelime giriş yap</Link></div>
          : <p className="mt-6">Bu aşamada hesap oluşturman gerekmez. Sonuçlandığında bilgilendirileceksin.</p>}
      </article>}
    </div></section>
  </>;
}
