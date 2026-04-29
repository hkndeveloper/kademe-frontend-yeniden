"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, PencilLine } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface Project {
  id: number;
  name: string;
  slug: string;
  type: string;
  short_description?: string | null;
}

export default function CoordinatorProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ projects: Project[] }>("/panel/projects/manageable");
        setProjects(response.data.projects ?? []);
      } catch (error) {
        console.error("Koordinator projeleri yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <PermissionGate
      permission="projects.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Projeleri goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Proje Icerigi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Yalnizca size atanan projelerin public gorunumunu ve proje detay alanlarini duzenleyebilirsiniz.</p>
        </div>
        <PermissionGate
          permission="projects.export"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
        <ExportButtons endpoint="/panel/projects/export" filename="koordinator_projeleri" buttonLabel="Projeleri Disa Aktar" />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {projects.map((project) => (
          <div key={project.id} className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Layers className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{project.name}</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{project.type}</p>
            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{project.short_description || "Kisa tanitim henuz eklenmedi."}</p>
            <Link href={`/panel/projects/${project.id}/content`} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">
              <PencilLine className="h-4 w-4" />
              Duzenle
            </Link>
          </div>
        ))}
      </div>
    </div>
    </PermissionGate>
  );
}
