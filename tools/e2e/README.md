# tools/e2e 目录说明

这个目录只负责测试、验证、观察和分析，不是业务主链。

## 1. 官方现役口

当前正式只认 `utils/runner-taxonomy.mjs` 里声明为 `official: true` 的入口：

- `runners/official/electron_launch_smoke.mjs`
- `runners/official/dynamic-import-recovery-lifecycle-probe.mjs`
- `runners/official/electron_p0_real_regression.mjs`
- `runners/official/contract_guard_check.mjs`
- `runners/official/quality-gate.mjs`

`utils/foundation-verdicts.mjs` 是官方质量门共用的 verdict builder，不是独立 runner 入口。

其中真正的质量入口以 `package.json` 为准：

- `npm run authority:check`
- `npm run verify:quality`

## 2. 观察口

这批脚本可以继续做专项验证，但不冒充唯一官方验收口：

- `runners/observation/electron_real_*`
- `runners/observation/electron_seeded_*`
- `runners/observation/electron_golden_chain.mjs`
- `runners/observation/electron_failure_resume.mjs`
- `runners/observation/electron_workspace_stage_smoke.mjs`
- `runners/observation/v11-wordcount-strap-test.mjs`
- `observation/character-stage-slot-regression.mjs`
- `observation/script-quality-matrix.mjs`
- `observation/scene-heading-verify.mjs`

## 3. 分析工具口

这批脚本只做分析和报告，不做官方裁判：

- `analysis/` 目录：
  - `content-quality-scan-v12.mjs`
  - `analyze-*`

## 4. 官方证据基础件

这批不是 runner，也不是分析脚本，而是官方口共用的基础模块：

- `utils/evidence-routing.mjs`

## 5. 目录内其他块

- `runners/`
  - 官方 runner 和观察 runner 分层目录
- `out/`
  - 运行证据和用户数据残留目录
- `analysis/`
  - 已确认的纯分析脚本
- `observation/`
  - 已确认的观察 / 专项 runner
- `prototype/`
  - 场级原型验证脚本，不属于当前正式剧本主链
- `seed-constructors/`
  - 测试种子构造器
- `seeds/`
  - 固定种子材料
- `utils/e2e-output.mjs`
  - `out/` 清理和用户数据目录准备基础件
- `tests/quality-gate.test.mjs`
  - 官方质量门脚本的自测
- `tests/script-quality-shared.test.mjs`
  - 观察 runner 共享 helper 的自测
- `utils/legacy/golden_chain_smoke.py`
  - 旧 Playwright 烟测辅助脚本
- `utils/legacy/ui_snapshot.py`
  - 旧 UI 快照辅助脚本
- `utils/legacy/run_dev_mock.ps1`
  - 本地 mock 开发启动辅助

## 6. 维护规则

1. 要新增官方口，先改 `utils/runner-taxonomy.mjs`，再改 `package.json`，最后补验证。
2. 观察口和分析口可以扩展，但不要在命名和文案上冒充 official。
3. 官方共用基础件统一留在 `utils/`，不要误搬进 `analysis/`、`observation/` 或 `runners/`。
4. prototype 场级验证脚本统一放 `prototype/`，不要继续和现役 episode 级 runner 混放。
5. 已废弃兼容入口直接删除，不保留薄壳转调。
6. `out/` 里是证据和运行残留，不把它当源码资产。

