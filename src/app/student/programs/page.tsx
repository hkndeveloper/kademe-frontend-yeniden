"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Calendar, Loader2, MapPin, Clock } from "lucide-react";
import api from "@/lib/api/axios";

interface Program {
  id: number;
  title: string;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  status: string;
  project?: {
    id: number;
    name: string;
    type?: string;
  };
}

const statusLabels: Record<string, string> = {
  scheduled: "Planlandı",
  active: "Aktif",
  completed: "Tamamlandı",
};

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await api.get<{ programs: Program[] }>("/programs");
        setPrograms(response.data.programs ?? []);
      } catch (error) {
        console.error("Programlar çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPrograms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Briefcase className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Programlarım</h1>
          <p className="text-sm text-muted-foreground">Erişebildiğiniz yaklaşan ve aktif etkinlikler burada listelenir.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {programs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center">
            <p className="text-muted-foreground">Henüz erişilebilir bir program görünmüyor.</p>
            <Link href="/projects" className="mt-4 inline-block font-bold text-primary hover:underline">
              Programları İncele
            </Link>
          </div>
        ) : (
          programs.map((program, index) => {
            const startDate = new Date(program.start_at);
            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="glass-panel group flex flex-col gap-8 rounded-3xl p-6 transition-all hover:border-primary/40 md:flex-row md:items-center md:p-8"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-3xl font-black text-primary transition-transform group-hover:scale-110">
                  {(program.project?.name || program.title)[0]}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {program.project?.name || "Program"}
                    </span>
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
                      {statusLabels[program.status] || program.status}
                    </span>
                  </div>
                  <h3 className="mb-2 text-2xl font-bold">{program.title}</h3>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:justify-start">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {startDate.toLocaleDateString("tr-TR")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {startDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {program.location || "Konum bilgisi yok"}
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-border/40 pt-6 text-center md:w-auto md:border-t-0 md:border-l md:pl-8 md:pt-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Durum</div>
                  <div className="mt-2 text-lg font-black text-primary">{statusLabels[program.status] || program.status}</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
