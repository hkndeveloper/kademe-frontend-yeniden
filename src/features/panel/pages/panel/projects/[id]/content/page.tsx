"use client";

import { useParams } from "next/navigation";
import { ProjectContentEditor } from "@/components/projects/ProjectContentEditor";
import { usePermissions } from "@/hooks/usePermissions";

export default function PanelUnifiedProjectContentPage() {
  const params = useParams();
  const projectId = String(params?.id ?? "");
  const projectIdNumber = Number(projectId);
  const { hasPermission, canAccessProject } = usePermissions();
  const canEdit =
    Number.isFinite(projectIdNumber) &&
    hasPermission("projects.content.update") &&
    canAccessProject("projects.content.update", projectIdNumber);

  return <ProjectContentEditor projectId={projectId} panelBasePath="/panel" readOnly={!canEdit} />;
}
