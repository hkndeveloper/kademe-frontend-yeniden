"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck, Database, FileStack, Loader2, PencilLine, UserCog, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

type ContentPreview = {
  project: { id: number; name: string; slug: string };
};

export default function PanelUnifiedProjectDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const projectId = typeof rawId === "string" ? Number(rawId) : Number(Array.isArray(rawId) ? rawId[0] : NaN);
  const invalidProjectId = !Number.isFinite(projectId) || projectId <= 0;

  const [loading, setLoading] = useState(!invalidProjectId);
  const [preview, setPreview] = useState<ContentPreview["project"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidProjectId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await api.get<ContentPreview>(`/panel/projects/${projectId}/content`);
        if (!cancelled) setPreview(response.data.project ?? null);
      } catch {
        if (!cancelled) setError("Proje bilgisi alinamadi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invalidProjectId, projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidProjectId || error || !preview) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-100">
        {invalidProjectId ? "Gecersiz proje." : error ?? "Proje bulunamadi."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/panel/projects"
        className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Proje listesine don
      </Link>

      <div>
        <h1 className="text-3xl font-black text-white">{preview.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ozet ve hizli baglantilar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PermissionGate requireProjectAccess={{ permission: "projects.view", projectId }}>
          <Link
            href={`/panel/projects/${projectId}/content`}
            className="inline-flex items-center gap-3 rounded-2xl bg-primary px-6 py-4 font-bold text-white"
          >
            <PencilLine className="h-5 w-5" />
            Icerigi duzenle
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "programs.view", projectId }}>
          <Link
            href={`/panel/programs?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <CalendarDays className="h-5 w-5" />
            Program ve yoklama
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "projects.participants.view", projectId }}>
          <Link
            href={`/panel/participants?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <Users className="h-5 w-5" />
            Katilimci, mezun ve CV
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "applications.view", projectId }}>
          <Link
            href={`/panel/applications?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <ClipboardCheck className="h-5 w-5" />
            Basvurular
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "volunteer.view", projectId }}>
          <Link
            href={`/panel/volunteer?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <UserCog className="h-5 w-5" />
            Gonullu basvurulari
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "digital_bohca.view", projectId }}>
          <Link
            href={`/panel/digital-bohca?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <Database className="h-5 w-5" />
            Dijital Bohca
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "assignments.view", projectId }}>
          <Link
            href={`/panel/assignments?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <FileStack className="h-5 w-5" />
            Odevler
          </Link>
        </PermissionGate>
        <PermissionGate requireProjectAccess={{ permission: "certificates.view", projectId }}>
          <Link
            href={`/panel/certificates?project_id=${projectId}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
          >
            <FileStack className="h-5 w-5" />
            Sertifikalar
          </Link>
        </PermissionGate>
        {preview.slug ? (
          <Link
            href={`/projects/${preview.slug}`}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-6 py-4 font-semibold text-white/90"
            target="_blank"
            rel="noreferrer"
          >
            Halka acik sayfa
          </Link>
        ) : null}
      </div>
    </div>
  );
}
