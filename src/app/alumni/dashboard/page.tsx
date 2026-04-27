"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Bell, BookOpen, Briefcase, HeartHandshake, Loader2, Calendar } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface BohcaMaterial {
  id: number;
  title: string;
  file_type?: string | null;
}

interface TicketItem {
  id: number;
  status?: string | null;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function AlumniDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<BohcaMaterial[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [bohcaResponse, ticketsResponse, annResponse] = await Promise.all([
          api.get<{ materials: BohcaMaterial[] }>("/digital-bohca").catch(() => ({ data: { materials: [] } })),
          api.get<{ tickets: TicketItem[] }>("/tickets").catch(() => ({ data: { tickets: [] } })),
          api.get<{ announcements: Announcement[] }>("/announcements").catch(() => ({ data: { announcements: [] } })),
        ]);

        setMaterials(bohcaResponse.data.materials ?? []);
        setTickets(ticketsResponse.data.tickets ?? []);
        setAnnouncements(annResponse.data.announcements ?? []);
      } catch (error) {
        console.error("Mezun dashboard verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "closed").length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mezun Paneli</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            KADEME ailesindeki yolculuğunuz mezuniyet sonrasında da devam ediyor
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Link href="/alumni/volunteer" className="rounded-xl border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5 flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            Gönüllülük
          </Link>
          <Link href="/alumni/assignments" className="rounded-xl border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Ödevlerim
          </Link>
          <Link href="/alumni/resume" className="rounded-xl bg-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20">
            Özgeçmişimi Aç
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dijital Bohça Dosyaları</p>
            <h3 className="text-3xl font-black text-slate-900">{materials.length}</h3>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <BookOpen className="h-7 w-7" />
          </div>
        </div>

        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Açık Destek Talepleri</p>
            <h3 className="text-3xl font-black text-slate-900">{openTickets}</h3>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
            <HeartHandshake className="h-7 w-7" />
          </div>
        </div>

        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sertifikalarım</p>
            <h3 className="text-3xl font-black text-slate-900">0</h3>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Award className="h-7 w-7" />
          </div>
        </div>

        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sistem Duyuruları</p>
            <h3 className="text-3xl font-black text-slate-900">{announcements.length}</h3>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
            <Bell className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-8 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5 text-primary" />
              Kariyer ve Fırsatlar
            </h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Canlı</span>
          </div>

          <div className="space-y-4 flex-1">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-bold text-slate-900">Özgeçmişini güncel tut</h4>
                <span className="text-xs text-muted-foreground">{user?.name || "Mezun"}</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                Kariyer özeti, eğitim bilgileri ve sosyal bağlantılarını mezun özgeçmiş ekranından düzenleyebilirsin. Mezun panosunda görüntülenmen için önemlidir.
              </p>
              <Link href="/alumni/resume" className="text-xs font-bold text-primary hover:underline">
                Özgeçmişe git
              </Link>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-bold text-slate-900">Gönüllülük Havuzu</h4>
                <span className="text-xs text-muted-foreground">Aktif Görevler</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                Projelerdeki açık gönüllülük fırsatlarını incele, yeni öğrencilerle deneyimlerini paylaş.
              </p>
              <Link href="/alumni/volunteer" className="text-xs font-bold text-primary hover:underline">
                Gönüllülük sayfasına git
              </Link>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5 text-primary" />
              Güncel Duyurular
            </h3>
            <Link href="/alumni/announcements" className="text-xs font-bold text-primary hover:underline">
              Tümünü Gör
            </Link>
          </div>

          <div className="space-y-4 flex-1">
            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-center text-muted-foreground h-full flex flex-col items-center justify-center min-h-[200px]">
                <Bell className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                Aktif sistem duyurusu bulunmuyor.
              </div>
            ) : (
              announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="rounded-2xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 transition">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ann.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
