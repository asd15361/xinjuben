import path from 'node:path';
import fs from 'node:fs/promises';

const DEFAULT_KEEP_LATEST = 2;

function getUserdataFamilyName(entryName) {
  const match = /^userdata-([a-z0-9-]+?)-[a-z0-9]+(?:-\d+)?$/i.exec(entryName);
  return match ? match[1] : null;
}

async function removePathSafe(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true }).catch(() => {});
}

export async function pruneE2EOutDir(outDir, options = {}) {
  const keepLatestPerFamily = options.keepLatestPerFamily ?? DEFAULT_KEEP_LATEST;
  await fs.mkdir(outDir, { recursive: true });
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const familyMap = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const family = getUserdataFamilyName(entry.name);
    if (!family) continue;

    const entryPath = path.join(outDir, entry.name);
    const stat = await fs.stat(entryPath).catch(() => null);
    if (!stat) continue;

    const bucket = familyMap.get(family) || [];
    bucket.push({
      name: entry.name,
      path: entryPath,
      mtimeMs: stat.mtimeMs
    });
    familyMap.set(family, bucket);
  }

  const removed = [];
  for (const items of familyMap.values()) {
    items.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const item of items.slice(keepLatestPerFamily)) {
      await removePathSafe(item.path);
      removed.push(item.name);
    }
  }

  return removed;
}

export async function prepareE2EOutDir(repoRoot, userDataPrefix, options = {}) {
  const outDir = path.join(repoRoot, 'tools', 'e2e', 'out');
  await pruneE2EOutDir(outDir, options);
  const userDataDir = path.join(outDir, `userdata-${userDataPrefix}-${Date.now().toString(36)}`);
  await fs.mkdir(userDataDir, { recursive: true });
  return { outDir, userDataDir };
}
