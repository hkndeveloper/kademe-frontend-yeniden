"use client";

import { useParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ProjectContentEditor } from "@/components/projects/ProjectContentEditor";
import { AdmissionsEditor } from "@/components/projects/AdmissionsEditor";
import { usePermissions } from "@/hooks/usePermissions";

export default function PanelUnifiedProjectContentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = String(params?.id ?? "");
  const periodId = searchParams.get("period_id") ?? "";
  const projectIdNumber = Number(projectId);
  const { hasPermission, canAccessProject } = usePermissions();
  const contentPermissions = [
    "projects.content.update",
    "projects.public_content.update",
    "projects.gallery.update",
  ];
  const canEdit = Number.isFinite(projectIdNumber) && contentPermissions.some(
    (permission) => hasPermission(permission) && canAccessProject(permission, projectIdNumber),
  );

  return <><AdmissionsEditor projectId={projectIdNumber} /><ProjectContentEditor projectId={projectId} panelBasePath="/panel" periodId={periodId} readOnly={!canEdit} /></>;
}
