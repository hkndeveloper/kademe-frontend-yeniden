"use client";

import { useParams } from "next/navigation";
import { ProjectContentEditor } from "@/components/projects/ProjectContentEditor";
import { useAuth } from "@/store/useAuth";

export default function PanelUnifiedProjectContentPage() {
  const params = useParams();
  const projectId = String(params?.id ?? "");
  const canEdit = useAuth((s) => s.hasPermission("projects.content.update"));

  return <ProjectContentEditor projectId={projectId} panelBasePath="/panel" readOnly={!canEdit} />;
}
