import { CombatPackManifest, CombatPackAsset } from './types';

const EXPECTED_SCHEMA_VERSION = '1.0';

export class PackVersionError extends Error {
  constructor(got: string) {
    super(`Combat pack version mismatch: expected "${EXPECTED_SCHEMA_VERSION}", got "${got}". Re-export from archon-workshop.`);
  }
}

export class PackMissingAssetsError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Combat pack missing required assets: ${missing.join(', ')}`);
  }
}

/** Loads and validates the combat pack manifest from within the bundled JSON */
export function validatePack(
  pack: CombatPackManifest,
  requiredIds: string[]
): void {
  if (pack.schema_version !== EXPECTED_SCHEMA_VERSION) {
    throw new PackVersionError(pack.schema_version);
  }
  const indexed = new Set(pack.assets.map((a: CombatPackAsset) => a.id));
  const missing = requiredIds.filter(id => !indexed.has(id));
  if (missing.length > 0) {
    throw new PackMissingAssetsError(missing);
  }
}

/** Returns asset URL from pack, relative to /assets/ public folder */
export function getAssetUrl(pack: CombatPackManifest, id: string): string {
  const asset = pack.assets.find((a: CombatPackAsset) => a.id === id);
  if (!asset) return '';
  // Pack paths look like "/assets/unit-light-knight-token-v1.png"
  // Vite serves files from /public — strip leading slash for import
  return asset.path;
}

export function getAssetById(pack: CombatPackManifest, id: string): CombatPackAsset | undefined {
  return pack.assets.find((a: CombatPackAsset) => a.id === id);
}
