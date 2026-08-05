export * from "./types";
export * from "./context-safety";
import type { FaultDefinition, OntologyManifest } from "./types";

export interface OntologyClientBundle {
  manifest: OntologyManifest;
  faults: Record<string, FaultDefinition>;
  overlayRecipes: Record<string, unknown>;
  scoringProfiles: Record<string, unknown>;
}

export function getFault(bundle: OntologyClientBundle, faultId: string): FaultDefinition {
  const fault = bundle.faults[faultId];
  if (!fault) throw new Error(`Unknown fault_id: ${faultId}`);
  return fault;
}

export function formatPlayerFinding(
  fault: FaultDefinition,
  count: number,
  total: number,
): string {
  return `${fault.player_message} We saw this on ${count} of ${total} comparable strokes.`;
}
