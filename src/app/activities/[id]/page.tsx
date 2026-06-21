"use client";

import { Calendar, ChevronLeft, Loader2, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  scheduled: "Planlandi",
  active: "Devam Ediyor",
  completed: "Tamamlandi",
  cancelled: "Iptal Edildi",
};

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
        console.error("Faaliyet detayi yuklenemedi", error);
        setErrorMessage("Faaliyet detayi yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProgram();
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="container mx-auto px-6 py-24">
        <div className="glass-panel rounded-3xl p-12 text-center">
          <h1 className="text-3xl font-black text-foreground">Faaliyet bulunamadi</h1>
          <p className="mt-4 text-muted-foreground">{errorMessage || "Talep edilen faaliyet kaydina ulasilamadi."}</p>
          <Link href="/activities" className="mt-8 inline-flex rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">
            Faaliyetlere Don
          </Link>
        </div>
      </div>
    );
  }

  const photos = program.photos ?? [];
  const coverPhoto = photos[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        {coverPhoto ? (
          <div className="absolute inset-0">
            <img src={coverPhoto.url} alt={program.title} className="h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,oklch(0.74_0.18_45/0.13),transparent_44%),radial-gradient(circle_at_85%_72%,oklch(0.56_0.12_255/0.11),transparent_46%)]" />
        )}

        <div className="container relative z-10 mx-auto px-6 py-24">
          <Link
            href="/activities"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Tum Faaliyetler
          </Link>

          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {program.is_featured && <Sparkles className="h-4 w-4" />}
            {program.project?.name || "Faaliyet"}
          </div>

          <h1 className="max-w-4xl text-4xl font-black md:text-6xl">{program.title}</h1>

          <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(program.start_at).toLocaleString("tr-TR")}
              {program.end_at && (
                <span className="text-muted-foreground/70"> — {new Date(program.end_at).toLocaleString("tr-TR")}</span>
              )}
            </div>
            {program.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {program.location}
              </div>
            )}
            {program.period?.name && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
                {program.period.name}
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
              {statusLabel[program.status] ?? program.status}
            </div>
          </div>
        </div>
      </section>

      {/* Foto galeri (varsa) */}
      {photos.length > 1 && (
        <section className="border-b border-border/30 py-12">
          <div className="container mx-auto px-6">
            <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">Fotograflar</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? program.title}
                    className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <p className="px-3 py-2 text-left text-xs text-muted-foreground line-clamp-1">{photo.caption}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* İçerik */}
      <div className="container mx-auto mt-16 grid grid-cols-1 gap-10 px-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-panel rounded-[32px] border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
          <h2 className="text-2xl font-black text-foreground">Faaliyet Hakkinda</h2>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">
            {program.description || "Bu faaliyet icin henuz detayli aciklama eklenmedi."}
          </p>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[32px] border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
            <h3 className="text-lg font-black text-foreground">Proje Baglantisi</h3>
            {program.project ? (
              <Link
                href={`/projects/${program.project.slug}`}
                className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
              >
                {program.project.name} detayina git
              </Link>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Bu faaliyet icin proje bilgisi bulunmuyor.</p>
            )}
          </div>

          {Array.isArray(program.guest_info) && program.guest_info.length > 0 && (
            <div className="glass-panel rounded-[32px] border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10">
              <h3 className="text-lg font-black text-foreground">Konuk ve Program Notlari</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {program.guest_info.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-2xl border border-border bg-muted/30 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption ?? program.title} className="max-h-[80vh] w-auto object-contain" />
            {lightboxPhoto.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-6 py-3 text-sm text-white backdrop-blur-sm">
                {lightboxPhoto.caption}
              </div>
            )}
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
