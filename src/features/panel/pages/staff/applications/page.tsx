"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Check, X, User, Calendar, Loader2, Search, Clock, MessageSquareText } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface Project {
  id: number;
  name: string;
}

interface Application {
  id: number;
  user: {
    name: string;
    surname: string;
    email: string;
    phone?: string | null;
  };
  period?: {
    name: string;
  } | null;
  projectId: number;
  project?: {
    name: string;
  } | null;
  status: "pending" | "approved" | "rejected" | "waitlist" | "interview_scheduled";
  answers?: Record<string, unknown>;
  submitted_at: string;
}

export default function StaffApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appRes, projRes] = await Promise.all([
          api.get<{ applications: { data: Application[] } }>("/panel/staff/applications"), // Backend filters by staff-visible projects
          api.get<{ projects: Project[] }>("/projects")
        ]);
        setApplications(appRes.data.applications?.data ?? []);
        setProjects(projRes.data.projects ?? []);
      } catch (error) {
        console.error("Başvurular yüklenemedi", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.put(`/panel/staff/applications/${id}/status`, { status: newStatus });
      setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status: newStatus as Application["status"] } : app)));
    } catch (error) {
      console.error("Durum guncellenemedi", error);
      alert("Durum güncellenirken bir hata oluştu.");
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch = `${app.user.name} ${app.user.surname} ${app.user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesProject = projectFilter === "all" || app.projectId === parseInt(projectFilter);
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [applications, searchTerm, statusFilter, projectFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="flex items-center gap-1 rounded bg-green-500/20 px-2 py-1 text-[10px] font-bold text-green-500"><Check className="h-3 w-3" /> ONAYLANDI</span>;
      case "rejected":
        return <span className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-[10px] font-bold text-red-500"><X className="h-3 w-3" /> REDDEDILDI</span>;
      case "waitlist":
        return <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-500"><Clock className="h-3 w-3" /> YEDEK</span>;
      case "interview_scheduled":
        return <span className="flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-[10px] font-bold text-blue-500"><MessageSquareText className="h-3 w-3" /> MULAKAT</span>;
      default:
        return <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-muted-foreground"><Clock className="h-3 w-3" /> BEKLIYOR</span>;
    }
  };

  return (
    <PermissionGate
      permission="applications.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Basvurulari goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Başvurular (Projem)</h1>
            <p className="text-sm text-muted-foreground">Kendi projenize yapılan başvuruları yönetin.</p>
          </div>
        </div>
        <PermissionGate
          permission="applications.export"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
        <ExportButtons
          endpoint="/panel/staff/applications/export"
          filename="personel_basvurular"
          params={{
            search: searchTerm || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            project_id: projectFilter !== "all" ? projectFilter : undefined,
          }}
          buttonLabel="Basvurulari Disa Aktar"
        />
        </PermissionGate>
      </div>

      <div className="glass-panel grid grid-cols-1 gap-4 rounded-3xl p-6 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="İsim veya e-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-primary"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 px-4 text-sm text-slate-900 outline-none focus:border-primary"
        >
          <option value="all">Tüm Projeler</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 px-4 text-sm text-slate-900 outline-none focus:border-primary"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Bekleyenler</option>
          <option value="approved">Onaylananlar</option>
          <option value="rejected">Reddedilenler</option>
          <option value="waitlist">Yedekler</option>
          <option value="interview_scheduled">Mülakat Planlananlar</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
          <p className="text-lg font-bold text-slate-900">Başvuru Bulunamadı</p>
          <p className="text-sm text-muted-foreground">Kriterlerinize uygun başvuru bulunmamaktadır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredApps.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel flex flex-col justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-start"
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {getStatusBadge(app.status)}
                    <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold text-muted-foreground">{app.project?.name || "Bilinmeyen Proje"}</span>
                  </div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <User className="h-4 w-4 text-primary" />
                    {app.user.name} {app.user.surname}
                  </h3>
                  <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                    <p>{app.user.email}</p>
                    <p>{app.user.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(app.submitted_at).toLocaleDateString("tr-TR")}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <select
                  value={app.status}
                  onChange={(e) => void handleStatusChange(app.id, e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  <option value="pending">Bekliyor</option>
                  <option value="approved">Onayla</option>
                  <option value="rejected">Reddet</option>
                  <option value="waitlist">Yedeğe Al</option>
                  <option value="interview_scheduled">Mülakata Çağır</option>
                </select>
                <button className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">
                  Form Yanıtları
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
