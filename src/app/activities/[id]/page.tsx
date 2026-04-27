"use client";

import { Calendar, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api/axios";

interface ActivityDetail {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  guest_info?: string[] | null;
  start_at: string;
  end_at?: string | null;
  status: string;
  project?: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [program, setProgram] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative z-10 mx-auto px-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {program.project?.name || "Faaliyet"}
          </div>
          <h1 className="max-w-4xl text-4xl font-black md:text-6xl">{program.title}</h1>
          <div className="mt-8 flex flex-wrap gap-6 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(program.start_at).toLocaleString("tr-TR")}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {program.location || "Konum bilgisi yok"}
            </div>
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {program.status}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto mt-16 grid grid-cols-1 gap-10 px-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-panel rounded-[32px] p-8">
          <h2 className="text-2xl font-black text-foreground">Faaliyet Hakkinda</h2>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">
            {program.description || "Bu faaliyet icin henuz detayli aciklama eklenmedi."}
          </p>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[32px] p-8">
            <h3 className="text-lg font-black text-foreground">Proje Baglantisi</h3>
            {program.project ? (
              <Link href={`/projects/${program.project.slug}`} className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                {program.project.name} detayina git
              </Link>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Bu faaliyet icin proje bilgisi bulunmuyor.</p>
            )}
          </div>

          <div className="glass-panel rounded-[32px] p-8">
            <h3 className="text-lg font-black text-foreground">Konuk ve Program Notlari</h3>
            {Array.isArray(program.guest_info) && program.guest_info.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {program.guest_info.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Bu faaliyet icin ek konuk bilgisi henuz paylasilmadi.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
