"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, CheckCircle2, Clock, FileText, Loader2, XCircle, UserCheck } from "lucide-react";
import api from "@/lib/api/axios";

interface Application {
  id: number;
  project: {
    name: string;
    type: string;
  };
  period: {
    name: string;
  };
  status: string;
  created_at: string;
}

type StatusIcon = typeof Clock;

const statusConfig: Record<string, { label: string; color: string; icon: StatusIcon }> = {
  pending: { label: "Beklemede", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  accepted: { label: "Kabul Edildi", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  rejected: { label: "Reddedildi", color: "bg-red-500/10 text-red-500", icon: XCircle },
  waitlisted: { label: "Yedek Listede", color: "bg-blue-500/10 text-blue-500", icon: AlertCircle },
  interview_planned: { label: "Mülakat Planlandı", color: "bg-purple-500/10 text-purple-500", icon: UserCheck },
  interview_passed: { label: "Mülakat Geçildi", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  interview_failed: { label: "Mülakat Olumsuz", color: "bg-rose-500/10 text-rose-500", icon: XCircle },
};

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get<{ applications: Application[] }>("/applications");
        setApplications(response.data.applications ?? []);
      } catch (error) {
        console.error("Başvurular çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchApplications();
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
          <FileText className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Başvurularım</h1>
          <p className="text-sm text-muted-foreground">Yaptığınız tüm program başvurularının güncel durumu.</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Program / Proje</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Dönem</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Başvuru Tarihi</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Durum</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-20 text-center text-muted-foreground">
                  Henüz bir başvurunuz bulunmuyor.
                </td>
              </tr>
            ) : (
              applications.map((application, index) => {
                const config = statusConfig[application.status] || statusConfig.pending;
                const Icon = config.icon;

                return (
                  <motion.tr
                    key={application.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border/40 transition-colors hover:bg-muted/10"
                  >
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{application.project.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{application.project.type}</span>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-muted-foreground">{application.period.name}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${config.color}`}>
                        <Icon className="h-4 w-4" />
                        {config.label.toUpperCase()}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-6">
        <AlertCircle className="h-6 w-6 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-bold text-primary">Not:</span> Başvurunuz yedek listede ise asil listeden feragat edenler olduğunda sistem tarafından otomatik olarak davet mesajı alacaksınız.
        </p>
      </div>
    </div>
  );
}
