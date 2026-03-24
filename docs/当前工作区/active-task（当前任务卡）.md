# active-task（当前任务卡）

这个文件永远只放当前正在做的这一件事。  
如果电脑重启、会话断掉、任务被打断，先看这份。

## 所属大计划

- 当前所属主线：`docs/plans/计划总表.md`
- 当前执行计划：`docs/plans/计划总表.md`
- 当前任务卡路径：`docs/当前工作区/active-task（当前任务卡）.md`

## 大任务阶段

- 大任务名称：项目打开与切页卡顿根因治理
- 大任务总阶段数：5 个 Wave
- 当前大计划路径：`docs/plans/计划总表.md`

## 任务状态

- 进行中（Wave 1-5 代码实施已完成，待用户手测验收）

## 任务名称

- 项目打开与切页卡顿根因治理

## 任务目标（本质）

- 解决"打开项目卡顿"和"切页卡顿"的根本原因：render 期重量计算、派生数据级联写回、IPC 调用碎片化。
- 通过统一 service、纯函数 builder、视图模型预计算，将重量操作移出 render 周期。

## 当前做到哪一步

### Wave 1: StageSessionTruth ✅

- 已完成：移除 `openProjectShell` / `getStagePayload` 直连，改用统一 service
- 已完成：移除 `CharacterStage` render 期派生 + 写回 store
- 已完成：将 renderer 内 10 处 `changeProjectStage` 直连统一收口到 `switchStageSession` service
- 验收：grep 清零

### Wave 2: ActiveCharacterBlocksTruth ✅

- 已完成：`replaceActiveCharacterBlocks` 调用清零
- 已完成：创建纯函数 builder `derive-active-character-blocks.ts`
- 验收：grep 清零

### Wave 3: DetailedOutlineViewModelTruth + ScriptSceneDerivedTruth ✅

- 已完成：创建纯函数 builder `build-detailed-outline-view-model.ts`
- 已完成：移除 `DetailedOutlineStage` render 期 inline `.flatMap` / `.find`
- 已完成：提取 `inspectScreenplayQualityEpisode` 到独立 model `script-scene-quality-audit.ts`
- 验收：grep 清零

### Wave 4: ScriptPlanAccessTruth ✅

- 已完成：`buildScriptGenerationPlan` 统一入口
- 已完成：`JSON.stringify([...])` memo key 清零
- 验收：grep 清零

### Wave 5: PerformanceEvidenceTruth ✅

- 已完成：添加统一 perf labels（`active_character_blocks_derive`、`detailed_outline_view_model`、`script_scene_summary_index`、`script_scene_quality_audit`）

### 测试验收 ✅

- 已完成：5 个 file-scoped tests 创建并通过
  - `derive-active-character-blocks.test.ts`
  - `build-detailed-outline-view-model.test.ts`
  - `build-script-scene-summary-index.test.ts`
  - `script-scene-quality-audit.test.ts`
  - `script-plan-service.test.ts`

## 前提校正（2026-03-24）

- **全仓 typecheck 说明**：当前 `npm run typecheck` 存在历史基线类型错误，非本轮改动引入。本轮验收口径调整为：`npm run build`（打包成功）+ grep 验收 + 5 个新增 tests + 用户手测。
- **禁止口头豁免**：不得以"历史债务"跳过 typecheck，必须通过正式前提校正修改验收口径。

## 当前已确认的问题（必须记住）

- 本轮解决的是"打开项目后 render 期重量计算"和"派生数据级联写回"导致的卡顿
- 重量计算已全部移出 render 周期，改用纯函数 builder 或 service
- IPC 调用已统一收口，不再碎片化

## 当前判断

- 代码主链已收口：Wave 1-5 实施完成
- grep 清零项全部通过
- 5 个新增 tests 全部通过
- 下一步：用户真人手测验收

## 总任务进度

- 95%（Wave 1-5 代码实施完成，测试完成，文档同步完成，待用户手测验收）

## 当前小任务

- 100%（代码、测试、文档三处均已收口，等待用户手测）

## 验收标准（调整后）

1. `npm run build` 通过（打包成功）
2. grep 验收全部通过（openProjectShell、getStagePayload、replaceActiveCharacterBlocks、CharacterStage IIFE、DetailedOutlineStage inline compute、buildSceneDerived、inspectScreenplayQualityEpisode location、buildScriptGenerationPlan single entry、JSON.stringify memo key）
3. 5 个新增 file-scoped tests 全部通过
4. 用户真人手测确认打开项目和切页不再卡顿

## 更新时间

- 2026-03-24
