export type ProgramWorkMode = "core" | "media" | "logistics" | "community_event";

const coreOperationPermissions = [
  "programs.create",
  "programs.update",
  "programs.complete",
  "programs.attendance.view",
  "programs.attendance.manage",
  "programs.qr.manage",
  "programs.export",
];

export function resolveProgramWorkMode(
  hasPermission: (permission: string) => boolean,
): ProgramWorkMode {
  if (hasPermission("programs.view")) {
    const hasCoreOperation = coreOperationPermissions.some(hasPermission);
    if (hasPermission("programs.media.upload") && !hasCoreOperation) return "media";
    return "core";
  }

  if (hasPermission("programs.community_event.view")) return "community_event";
  return "logistics";
}

export function programEntryPermissionForMode(mode: ProgramWorkMode): string {
  if (mode === "community_event") return "programs.community_event.view";
  if (mode === "logistics") return "programs.logistics.view";
  return "programs.view";
}
