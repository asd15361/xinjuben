- 2026-03-24：新增 `useWorkflowStore.applyStageTransition(nextStage, projectSnapshot)` 作为 renderer 内 `currentStage` 的唯一正式写口；各组件禁止分散直接写 `currentStage`。
- 2026-03-24：`applyStageTransition` 在切 stage 时按 stage 选择性保留数据：chat 保留 `chatMessages/storyIntent`，script 保留 script runtime truth，runtime_console 仅保留运行态历史，其余跨 stage runtime 一律清空，避免旧页脏状态串入新页。

- 2026-03-24: 项目存储从单 projects.json 改为 index + per-project shards；listProjects/open shell 仅依赖 index，stage/get/save 走按需 shard 读写。

- 2026-03-24：`first_interactive` 统一以 renderer 侧 open-chain 起点为基准；非 script 页在 `StageViewport` 首次挂载时收口，script 页额外等待 `useScriptGenerationPlan` ready 后再记首交互，确保“打开项目 -> 第一可交互”口径一致。

- 2026-03-24：`ScriptSceneList` 后续修复优先级应先处理“动态高度测量策略”，再微调 `overscan`；建议改成收起态固定高度估算、展开态显式 `virtualizer.measure()` / `resizeItem` 收口，避免把所有抖动都留给默认连续测量。
- 2026-03-24：若继续保留虚拟列表，`SceneCard` memo 不是主因；真正要先修的是 item 高度模型、展开态重测节奏、以及是否继续在动态测量列表容器上使用 `contain: 'strict'`。
- 2026-03-24：renderer 内所有仍承担“阶段跳转”职责的按钮/动作，统一改为调用 `switchStageSession(projectId, targetStage)`；即使文件当前只是在 `setStage(...)`，也不再允许本地单独改 stage truth。
- 2026-03-24：`DetailedOutlineStage.tsx` 因仓内 contract/store 已回退到 `segments` 结构，不能沿用依赖 `detailedOutlineBlocks / activeCharacterBlocks / saveDetailedOutlineBlocks` 的新版实现；本次仅保留 stage switch service 替换，并用现有 `segments + setSegment + setSegmentEpisodeBeat` 结构收口到可编译状态。
