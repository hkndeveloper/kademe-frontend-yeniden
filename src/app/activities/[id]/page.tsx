"use client";

import { ArrowRight, Calendar, ChevronLeft, Loader2, MapPin, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { PublicBadge, PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";

interface ProgramPhoto {
  id: number;
  url: string;
  caption: string | null;
  sort_order: number;
}

interface ActivityDetail {
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
  guest_info?: string[] | null;
  start_at: string;
  end_at?: string | null;
  status: string;
  is_featured?: boolean;
  period?: {
    id: number;
    name: string;
  } | null;
  project?: {
    id: number;
    name: string;
    slug: string;
  };
  photos?: ProgramPhoto[];
}

const statusLabel: Record<string, string> = {
  scheduled: "Planlandı",
  active: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Tarih belirtilmedi";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Tarih belirtilmedi";
  }
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [program, setProgram] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProgramPhoto | null>(null);

  useEffect(() => {
    const loadProgram = async () => {
      try {
        const resolvedParams = await params;
        const response = await api.get<{ program: ActivityDetail }>(`/activities/${resolvedParams.id}`);
        setProgram(response.data.program);
      } catch (error) {
        console.error("Faaliyet detayı yüklenemedi", error);
        setErrorMessage("Faaliyet detayı yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProgram();
  }, [params]);

  if (loading) {
    return (
      <div className="kdm-public-shell flex min-h-[70vh] items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <span className="text-sm font-bold text-slate-600">Faaliyet detayı yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <main className="kdm-public-shell min-h-screen px-4 py-28 sm:px-6">
        <div className="container mx-auto">
          <PublicCard className="py-16 text-center">
            <h1 className="text-3xl font-black text-slate-950">Faaliyet bulunamadı</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600">{errorMessage || "Talep edilen faaliyet kaydına ulaşılamadı."}</p>
            <PublicButton href="/activities" className="mt-8" variant="dark">
              Faaliyetlere Dön
            </PublicButton>
          </PublicCard>
        </div>
      </main>
    );
  }

  const photos = program.photos ?? [];
  const coverPhoto = photos[0];
  const activityCoverImage = coverPhoto?.url || "/aigocy/images/section/work-single-3.jpg";
  const hasCoordinates =
    program.latitude !== null &&
    program.latitude !== undefined &&
    program.latitude !== "" &&
    program.longitude !== null &&
    program.longitude !== undefined &&
    program.longitude !== "";

  return (
    <main className="kdm-public-shell min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <section className="relative isolate overflow-hidden px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <div className="kdm-public-detail-hero-bg absolute inset-x-4 bottom-0 top-4 -z-10 overflow-hidden sm:inset-x-6 lg:inset-x-10">
          <img src="/aigocy/images/section/hero-1.jpg" alt="" className="h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(255,255,255,0.88),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.14),transparent_16rem),linear-gradient(180deg,rgba(255,255,255,0.38),rgba(231,231,228,0.88))]" />
        </div>

        <div className="container relative z-10 mx-auto">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <Link
              href="/activities"
              className="kdm-public-btn-shine mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#09090b] shadow-[0_10px_30px_rgba(9,9,11,0.10)] transition hover:-translate-y-0.5 hover:text-[#fd3a25]"
            >
              <ChevronLeft className="h-4 w-4" />
              Tüm Faaliyetler
            </Link>

            <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">
              {program.is_featured ? <Sparkles className="h-3.5 w-3.5" /> : null}
              {program.project?.name || "Faaliyet"}
            </PublicBadge>

            <h1 className="max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-normal text-[#2f3437] sm:text-6xl lg:text-8xl">
              {program.title}
            </h1>

            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-bold text-[#3f4653]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/86 px-4 py-3 shadow-sm backdrop-blur">
                <Calendar className="h-4 w-4 text-[#fd3a25]" />
                {formatDateTime(program.start_at)}
                {program.end_at ? <span className="text-slate-500"> - {formatDateTime(program.end_at)}</span> : null}
              </div>
              {program.location ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/86 px-4 py-3 shadow-sm backdrop-blur">
                  <MapPin className="h-4 w-4 text-[#fd3a25]" />
                  {program.location}
                </div>
              ) : null}
              {program.period?.name ? <div className="rounded-full border border-white/80 bg-white/86 px-4 py-3 shadow-sm backdrop-blur">{program.period.name}</div> : null}
              <div className="rounded-full bg-[#fd3a25] px-4 py-3 text-white shadow-[0_12px_28px_rgba(253,58,37,0.28)]">{statusLabel[program.status] ?? program.status}</div>
            </div>
          </div>

          <div className="kdm-public-media-frame relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border-[10px] border-[#09090b] bg-[#09090b] kdm-public-dark-gradient shadow-[0_34px_90px_rgba(9,9,11,0.22)]">
            <div className="relative aspect-[16/8] min-h-[280px]">
              {coverPhoto ? (
                <img src={coverPhoto.url} alt={program.title} className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 overflow-hidden bg-[#fd3a25]">
                  <div className="absolute left-1/2 top-1/2 h-24 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fd3a25] shadow-[0_28px_70px_rgba(253,58,37,0.42)]" />
                  <div className="absolute left-[52%] top-[22%] h-28 w-28 rotate-[-58deg] rounded-[1.1rem] bg-[#94a9bc]" />
                  <div className="absolute left-[64%] top-[38%] h-24 w-24 rotate-[-15deg] rounded-[1.1rem] bg-[#94a9bc]" />
                  <div className="absolute left-[56%] top-[60%] h-20 w-20 rotate-[14deg] rounded-[1rem] bg-[#94a9bc]" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.20),transparent_45%,rgba(9,9,11,0.16))]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/68 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur">Faaliyet Detayı</span>
                {program.project?.name ? <span className="rounded-full bg-[#fd3a25] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(253,58,37,0.35)]">{program.project.name}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
      {photos.length > 1 ? (
        <section className="border-b border-slate-200 bg-white py-12">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Fotoğraflar</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{photos.length} görsel</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="group kdm-public-gallery-card overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-900/10"
                >
                  <img src={photo.url} alt={photo.caption || program.title} className="h-40 w-full object-cover transition duration-500 group-hover:scale-105" />
                  {photo.caption ? <p className="line-clamp-1 px-3 py-2 text-left text-xs font-semibold text-slate-600">{photo.caption}</p> : null}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10 lg:py-20">
        <PublicCard className="relative z-10 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">Faaliyet Hakkında</h2>
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-600">
            {program.description || "Bu faaliyet için henüz detaylı açıklama eklenmedi."}
          </p>
        </PublicCard>

        <div className="relative z-10 space-y-6">

          <PublicCard>
            <h3 className="text-lg font-black text-slate-950">Proje Bağlantısı</h3>
            {program.project ? (
              <PublicButton href={`/projects/${program.project.slug}`} className="mt-5" variant="dark" icon={<ArrowRight className="h-4 w-4" />}>
                {program.project.name} detayına git
              </PublicButton>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-600">Bu faaliyet için proje bilgisi bulunmuyor.</p>
            )}
          </PublicCard>

          {hasCoordinates ? (
            <PublicCard>
              <div className="flex items-start gap-3">
                <PublicIconBadge className="bg-orange-600">
                  <MapPin className="h-5 w-5" />
                </PublicIconBadge>
                <div>
                  <h3 className="text-lg font-black text-slate-950">Harita</h3>
                  <p className="mt-1 text-sm text-slate-600">{program.location || "Faaliyet konumu"}</p>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <ProgramLocationMap latitude={program.latitude} longitude={program.longitude} radiusMeters={program.radius_meters} placeName={program.location_place_name} placeAddress={program.location_place_address} placeId={program.location_place_id} placeProvider={program.location_place_provider} heightClassName="h-64" />
              </div>
            </PublicCard>
          ) : null}

          {Array.isArray(program.guest_info) && program.guest_info.length > 0 ? (
            <PublicCard>
              <h3 className="text-lg font-black text-slate-950">Konuk ve Program Notları</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {program.guest_info.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold">
                    {item}
                  </li>
                ))}
              </ul>
            </PublicCard>
          ) : null}
        </div>
      </div>

      {lightboxPhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption || program.title} className="max-h-[80vh] w-auto object-contain" />
            {lightboxPhoto.caption ? <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-6 py-3 text-sm text-white backdrop-blur-sm">{lightboxPhoto.caption}</div> : null}
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              aria-label="Galeriyi kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}





