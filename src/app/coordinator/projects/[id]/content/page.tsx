"use client";

import { useParams } from "next/navigation";
import { ProjectContentEditor } from "@/components/projects/ProjectContentEditor";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

export default function CoordinatorProjectContentPage() {
  const params = useParams<{ id: string }>();
  const { canAccessProject } = usePermissions();
  const projectIdNum = params.id ? Number(params.id) : NaN;
  const canEditContent = Number.isFinite(projectIdNum) && canAccessProject("projects.content.update", projectIdNum);

  if (!Number.isFinite(projectIdNum)) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
        Gecersiz proje.
      </div>
    );
  }

  return (
    <PermissionGate
      requireProjectAccess={{ permission: "projects.view", projectId: projectIdNum }}
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Bu projenin icerigini goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
      <ProjectContentEditor projectId={params.id} panelBasePath="/coordinator" readOnly={!canEditContent} />
    </PermissionGate>
  );
}
