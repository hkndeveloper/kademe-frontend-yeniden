export const COORDINATION_UNIT_HEADER = "X-Coordination-Unit-Id";

export function coordinationUnitHeaders(activeUnitId: number | null | undefined): Record<string, string> {
  if (activeUnitId === null || activeUnitId === undefined || !Number.isInteger(activeUnitId) || activeUnitId < 1) {
    return {};
  }

  return { [COORDINATION_UNIT_HEADER]: String(activeUnitId) };
}

export function activeCoordinationContextMatches(
  requestedUnitId: number | null,
  backendUnitId: number | null | undefined
): boolean {
  return requestedUnitId === null || requestedUnitId === backendUnitId;
}
