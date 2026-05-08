"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Loader2 } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Bell className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Duyurular</h1>
          <p className="text-sm text-muted-foreground">KADEME ailesinden sistem duyurulari ve guncellemeler.</p>
        </div>
      </div>

      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            Sistemde henuz duyuru bulunmuyor.
          </div>
        ) : (
          announcements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel rounded-3xl p-6 hover:bg-white/5 transition-colors"
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xl font-bold text-slate-900">{announcement.title}</h3>
                <span className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap bg-white/5 px-3 py-1.5 rounded-full">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(announcement.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
