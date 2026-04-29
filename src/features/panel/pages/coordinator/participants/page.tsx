"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { GraduationCap, Loader2, Mail, Phone, Search, Star, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface Project {
  id: number;
  name: string;
}

interface ParticipantItem {
  id: number;
  status: string;
  graduation_status?: string | null;
  graduation_note?: string | null;
  credit?: number | null;
  enrolled_at?: string | null;
  graduated_at?: string | null;
  project: {
    id: number;
    name: string;
  };
  period?: {
    id: number | null;
    name: string | null;
  } | null;
  user: {
    id: number;
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    university?: string | null;
    department?: string | null;
    class_year?: string | null;
    hometown?: string | null;
    status?: string | null;
    profile_photo?: string | null;
  };
}

interface ParticipantsResponse {
  projects: Project[];
  summary: {
    total: number;
    active: number;
    graduates: number;
    average_credit: number;
  };
  participants: ParticipantItem[];
}

export default function CoordinatorParticipantsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    graduates: 0,
    average_credit: 0,
  });

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await api.get<ParticipantsResponse>("/panel/coordinator/participants");
        setProjects(response.data.projects ?? []);
        setParticipants(response.data.participants ?? []);
        setSummary(response.data.summary);
      } catch (error) {
        console.error("Katilimci listesi yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void fetchParticipants();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const fullName = `${participant.user.name} ${participant.user.surname}`.toLowerCase();
      const searchableText = `${fullName} ${participant.user.email ?? ""} ${participant.user.university ?? ""} ${participant.user.department ?? ""}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesProject = projectFilter === "all" || String(participant.project.id) === projectFilter;
      const matchesStatus =
        statusFilter === "all" ||
        participant.status === statusFilter ||
        participant.graduation_status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [participants, projectFilter, searchTerm, statusFilter]);

  return (
    <PermissionGate
      permission="projects.participants.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Katilimcilari goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Users className="h-7 w-7" />
          </div>
        <div>
            <h1 className="text-2xl font-bold">Katilimcilar</h1>
            <p className="text-sm text-muted-foreground">Kendi projelerinizdeki aktif ogrencileri, mezunlari ve kredi durumlarini canli olarak takip edin.</p>
          </div>
        </div>
        <PermissionGate
          permission="projects.participants.view"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
        <ExportButtons
          endpoint="/panel/coordinator/participants/export"
          filename="koordinator_katilimcilar"
          params={{
            project_id: projectFilter !== "all" ? projectFilter : undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            search: searchTerm || undefined,
          }}
          buttonLabel="Katilimcilari Disa Aktar"
        />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam Katilimci</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary.total}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Katilimci</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary.active}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mezun</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary.graduates}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ortalama Kredi</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary.average_credit}</div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Isim, e-posta, universite veya bolum ara"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-border bg-input py-3 pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent">
            <option value="all">Tum projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent">
            <option value="all">Tum durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
            <option value="graduated">Mezun</option>
            <option value="completed">Tamamladi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Bu filtreye uygun katilimci bulunamadi.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredParticipants.map((participant) => (
            <div key={participant.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                    {participant.user.profile_photo ? (
                      <Image src={participant.user.profile_photo} alt={`${participant.user.name} ${participant.user.surname}`} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Users className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {participant.user.name} {participant.user.surname}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${participant.status === "active" ? "bg-green-500/10 text-green-400" : "bg-white/10 text-muted-foreground"}`}>
                        {participant.status}
                      </span>
                      {participant.graduation_status ? (
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                          {participant.graduation_status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{participant.project.name}</p>
                    <p className="text-xs text-muted-foreground">{participant.period?.name || "Donem baglantisi yok"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    <Star className="h-3 w-3" />
                    Kredi
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{participant.credit ?? 0}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
                  <div className="font-bold text-slate-900">{participant.user.university || "Universite yok"}</div>
                  <div>{participant.user.department || "Bolum yok"}</div>
                  <div>{participant.user.class_year || "Sinif bilgisi yok"}</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent" />
                    <span>{participant.user.email || "E-posta yok"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-accent" />
                    <span>{participant.user.phone || "Telefon yok"}</span>
                  </div>
                  <div className="mt-2">{participant.user.hometown || "Memleket yok"}</div>
                </div>
              </div>

              {(participant.graduated_at || participant.graduation_note) && (
                <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <GraduationCap className="h-4 w-4" />
                    Mezuniyet Bilgisi
                  </div>
                  {participant.graduated_at ? <div>Mezuniyet Tarihi: {new Date(participant.graduated_at).toLocaleDateString("tr-TR")}</div> : null}
                  {participant.graduation_note ? <div className="mt-1">{participant.graduation_note}</div> : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
