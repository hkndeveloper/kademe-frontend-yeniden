"use client";

import { useParams } from "next/navigation";
import { ProjectContentEditor } from "@/components/projects/ProjectContentEditor";
import { usePermissions } from "@/hooks/usePermissions";

export default function AdminProjectContentPage() {
  const params = useParams<{ id: string }>();
  const { canAccessProject } = usePermissions();
  const projectIdNum = params.id ? Number(params.id) : NaN;
  const canEditContent = Number.isFinite(projectIdNum) && canAccessProject("projects.content.update", projectIdNum);

  return <ProjectContentEditor projectId={params.id} panelBasePath="/admin" readOnly={!canEditContent} />;
}
