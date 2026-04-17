# E2E Authority

## Quality

- Official quality gate: `npm run verify:quality`
- Official authority contract check: `npm run authority:check`
- Quality is official and must remain a runnable gate

## Visible

- Official `visible` authority runner: `node tools/e2e/electron_p0_real_regression.mjs`
- Official `visible` seed: `tools/e2e/seeds/p0-real-regression-v1/workspace/projects.json`
- Seed refresh constructor: `node tools/e2e/seed-constructors/p0-real-regression-v1.mjs --write`
- Legacy compatibility entry: `tools/e2e/electron_real_project_gate_check.mjs`
- Compatibility entry delegates to the official runner and is not an independent authority
