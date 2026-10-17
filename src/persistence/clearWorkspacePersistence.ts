import { clearWorkspacePersistedKeys } from "@/persistence/storage"
import { resetInitialRestoredSimulationCache } from "@/persistence/lastSimulationSnapshot"

/**
 * Clears persisted workspace data (projects, active tab, last simulation snapshot)
 * and invalidates loaders’ one-shot caches. Call before applying blank runtime state.
 */
export function clearWorkspacePersistence(): void {
  clearWorkspacePersistedKeys()
  resetInitialRestoredSimulationCache()
}
