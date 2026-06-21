"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Loader2, Search } from "lucide-react";
import api from "@/lib/api/axios";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function AlumniAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get<{ announcements: Announcement[] }>("/announcements");
        setAnnouncements(response.data.announcements ?? []);
      } catch (error) {
        console.error("Duyurular yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchAnnouncements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredAnnouncements = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
    if (!query) return announcements;

    return announcements.filter((announcement) =>
      [announcement.title, announcement.content]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query)
    );
  }, [announcements, searchTerm]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Duyurular</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Sistem bildirimleri ve KADEME guncellemeleri</p>
          </div>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Duyuru ara"
            className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Toplam Duyuru" value={announcements.length} />
        <SummaryCard label="Listelenen" value={filteredAnnouncements.length} />
        <SummaryCard label="Son 30 Gun" value={announcements.filter((announcement) => Date.now() - new Date(announcement.created_at).getTime() <= 1000 * 60 * 60 * 24 * 30).length} />
      </div>

      <div className="space-y-5">
        {filteredAnnouncements.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-dashed border-border p-20 text-center text-muted-foreground">
            <Bell className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            {announcements.length === 0 ? "Sistemde henuz duyuru bulunmuyor." : "Aramana uygun duyuru bulunamadi."}
          </div>
        ) : (
          filteredAnnouncements.map((announcement, index) => (
            <motion.article
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-panel overflow-hidden rounded-3xl p-0 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-border bg-background/50 p-5 md:flex-row md:items-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{announcement.title}</h3>
                </div>
                <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(announcement.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{announcement.content}</p>
              </div>
            </motion.article>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
