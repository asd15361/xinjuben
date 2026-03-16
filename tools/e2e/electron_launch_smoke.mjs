import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { prepareE2EOutDir } from './e2e-output.mjs';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { userDataDir } = await prepareE2EOutDir(repoRoot, 'smoke');
  console.log(`launch:${mainEntry}`);

  const app = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, MOCK_AI_ENABLE: '1', E2E_USER_DATA_DIR: userDataDir }
  });

  console.log('launched');
  try {
    const win = await app.firstWindow();
    console.log('first_window');
    await win.waitForLoadState('domcontentloaded', { timeout: 15000 });
    console.log('loaded');
  } finally {
    await app.close();
    console.log('closed');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

