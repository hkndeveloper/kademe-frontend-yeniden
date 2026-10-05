"use client";

import { ArrowRight, MapPin, X } from "lucide-react";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { PageHero, Reveal, ThemeButton, ThemeImage } from "@/components/aigocy/Primitives";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { PublicButton, PublicCard, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";

interface ProgramPhoto {
  id: number;
  url: string;
  caption: string | null;
  sort_order: number;
}

interface ActivityDetail {
  cover_image?: string | null;
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

  if (loading) return <PublicBrandLoader fullPage />;

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
  const hasCoordinates =
    program.latitude !== null &&
    program.latitude !== undefined &&
    program.latitude !== "" &&
    program.longitude !== null &&
    program.longitude !== undefined &&
    program.longitude !== "";

  return (
    <main className="kdm-public-shell min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <PageHero badge="KADEME faaliyeti" title={program.title} description={program.description ? program.description.replace(/<[^>]*>/g, '').slice(0, 200) : undefined}><ThemeButton secondary href="/activities">Tüm faaliyetler</ThemeButton><div className="theme-detail-meta"><span>{formatDateTime(program.start_at)}{program.end_at ? ' — '+formatDateTime(program.end_at) : ''}</span><span>{program.location}</span><span>{program.period?.name}</span><span>{statusLabel[program.status] || program.status}</span><span>{program.project?.name}</span>{program.is_featured && <span>Öne çıkan faaliyet</span>}</div></PageHero>
      <Reveal className="container theme-detail-cover"><ThemeImage src={program.cover_image || coverPhoto?.url} alt={program.title} priority /></Reveal>
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
                  <Image src={photo.url} alt={photo.caption || program.title} width={400} height={240} unoptimized className="h-40 w-full object-cover transition duration-500 group-hover:scale-105" />
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
            <Image src={lightboxPhoto.url} alt={lightboxPhoto.caption || program.title} width={1200} height={800} unoptimized className="max-h-[80vh] w-auto object-contain" />
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
