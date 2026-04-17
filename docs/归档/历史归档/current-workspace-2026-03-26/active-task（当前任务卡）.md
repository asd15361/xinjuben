# active-task（当前任务卡）

这个文件永远只放当前正在做的这一件事。  
如果电脑重启、会话断掉、任务被打断，先看这份。

## 所属大计划

- 当前所属主线：`docs/plans/计划总表.md`
- 当前执行计划：`docs/plans/计划总表.md`
- 当前任务卡路径：`docs/当前工作区/active-task（当前任务卡）.md`

## 大任务阶段

- 大任务名称：项目打开与切页 fallback 止血链修复
- 大任务总阶段数：1 个止血收口阶段
- 当前大计划路径：`docs/plans/计划总表.md`

## 任务状态

- 当前任务技术收口已完成；当前处于验收归档与下一主线切换前状态。

## 任务名称

- 项目打开与切页 fallback 止血链修复

## 任务目标（本质）

- 把 `renderer dynamic import recovery lifecycle` 收成唯一真相，不再允许 `startup flag clear`、`root-rendered fake success`、`window load rearm`、本地假重试和多套恢复权威并存。
- 当前任务只对 recovery lifecycle 本体负责；`foundation-verdicts` 剩余 `formal` / `visible` 红灯已单列为后续主线，不再混进本任务的完成定义。

## 当前做到哪一步

### 止血收口阶段已完成

- 已完成：`renderer dynamic import recovery lifecycle` 已改成 `failure-only lifecycle + explicit success ACK`；自动恢复只允许一条失败检测链，rearm 只允许来自真实 lazy 成功面。
- 已完成：`AppShell` 的 `HomeShell` 成功挂载与 `StageViewport` 的当前 active stage 成功挂载，已成为唯一 success ACK 入口；`ProjectShell`、root render、`window load`、`document.readyState` 不再充当成功。
- 已完成：动态导入恢复纯逻辑单测通过：`node --test --experimental-strip-types src/renderer/src/app/utils/dynamic-import-recovery.test.ts` = `11/11` 通过。
- 已完成：官方 probe 已切到显式 ACK 语义并通过：`node tools/e2e/dynamic-import-recovery-lifecycle-probe.mjs` = `pass`。
- 已完成：MAIN repo `npm run typecheck` 通过。
- 已完成：MAIN repo `npm run build` 通过。
- 已完成：`quality` 已从 `not_ready` 正式化为 `official pass`；`node tools/e2e/quality-gate.mjs`、`node tools/e2e/quality-gate.mjs authority:check`、`npm run verify:quality` 均通过。
- 已确认：`foundation-verdicts` 当前剩余红灯是 `formal` 与 `visible`，不是 recovery 本体失败。

## 当前判断

- 本任务卡对应的 recovery lifecycle 硬验收已全部通过，不得再把它汇报为“仍未开始”或“只差手测”。
- 当前项目整体还不能汇报为总完成，因为 `foundation-verdicts` 仍有两条真实红灯：
  1. `formal`：`parseCharacterBundleText` 未覆盖 `roleLayer` / `activeBlockNos`。
  2. `visible`：`p0-real-regression-v1` seed 与现行 formal-fact gate 不兼容，表现为 `p0_start_button_disabled`。
- 用户手测现在只保留为体验复核，不再作为当前任务主权门槛。

## 总任务进度

- 85%（recovery lifecycle、probe、typecheck、build、quality 已收口；项目剩余红灯已缩到 `formal` 与 `visible` 两条并行后续主线）

## 当前小任务

- 100%（`renderer dynamic import recovery lifecycle` 已按官方口径完成技术收口并通过主仓库复验）

## 验收标准（当前任务）

1. `renderer dynamic import recovery lifecycle` 只保留 `single authority`：已通过
2. 启动链不得出现 `startup flag clear`：已通过
3. 不得出现 `root-rendered fake success`：已通过
4. 持续失败时不得出现 `reload loop on persistent failure`：已通过
5. 恢复链必须改成 `success-based rearm`：已通过
6. MAIN repo `npm run typecheck` 通过：已通过
7. MAIN repo `npm run build` 通过：已通过

## 后续切线

- 下一主线优先级 1：`formal` 合同红灯收口，补齐人物正式 parser 对 `roleLayer` / `activeBlockNos` 的覆盖。
- 下一主线优先级 2：`visible` seeded runner 治理，决定是升级 seed 以满足现行 formal-fact gate，还是调整 runner 分类/退役旧 seed 口径。

## 更新时间

- 2026-03-25
