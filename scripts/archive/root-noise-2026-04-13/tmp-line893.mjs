import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

const lines = content.split('\n');

// Find the exact content of lines 893, 899, 909
// (0-based: 892, 898, 908)
const lineChecks = [892, 898, 908];
for (const idx of lineChecks) {
  if (idx < lines.length) {
    console.log(`Line ${idx+1}: ${lines[idx]}`);
  }
}
