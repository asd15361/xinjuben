# 创作基础地基硬化计划

## TL;DR

> **Summary**: 先把创作系统的地基补成真正可执行、可验证、不可漂移的基础设施，再恢复任何质量调优、恢复链、60/100 集承载讨论。8 条原则不是优化方向，而是项目准入线；当前文档层已大体认清，但运行时 enforcement 仍不足。
> **Deliverables**:
>
> - 运行时 truth enforcement（不是只在文档里定义）
> - 用户真相 / 系统推断 / 下游展开分层治理真正落地
> - 实体主数据层（人物 / 势力 / 地点 / 道具 / 关系）
> - 工序边界守卫与单一 writer 收口
> - 失败结果可见但正式联动受阻的双轨机制
> - 承重角色识别与大体量分组/分层/分批治理
> - 探针 / 可见结果 / 正式放行 / 质量通过 四层测试体系
>   **Effort**: XL
>   **Parallel**: YES - 5 waves
>   **Critical Path**: Runtime truth enforcement → entity master data → process boundary guardian → failure-visible UX + test-layer separation → quality tuning resume gate

## Context

### Original Request

- 那 8 条不是大方向，而是最最基本的东西
- 这些都必须做到位；做不到就不要谈优质内容或 100 集能力
- 做一份计划，把这些都落实，把基础做好先
- 参考最近一个月反复重构的教训，避免再在错层修补

### Interview Summary

- 用户明确拒绝把这 8 条当“未来优化方向”；它们是项目地基。
- 当前 repo 已经有大量 authority / truth / batching / contract 文档与部分代码实现，但 Oracle、代码探索、Metis 一致指出：**文档比 enforcement 更成熟**。
- 当前最大风险不是“没有方向”，而是把“规则已写”误当成“运行时已执行”，从而在地基未稳时继续做 P0 质量、恢复链、60/100 集承载。

### Metis Review (gaps addressed)

- 这份计划必须优先做 **runtime enforcement**，不能再做一份只补口径的文档计划。
- 必须显式把“quality tuning / 长测 / 恢复链”降为**后续阶段**，等地基验收通过后才恢复。
- Acceptance Criteria 必须能用命令或页面行为证明，不接受“文档里已经写了”的软结论。
- 要防止 overclaim：`truth-authority-unification` 等旧计划虽然打勾，但不能再拿它当“已经彻底实现”的证据。

## Work Objectives

### Core Objective

把创作系统从“文档上承认地基重要，但运行时仍可漂移”的状态，升级成“真相拆解、实体主表、工序边界、状态分层、失败可见、分批治理、测试分层都真实强制执行”的基础设施状态。只有这个目标通过，才允许重新把 P0/P1/P2 当主线。

### Deliverables

- 真相拆解与 authority enforcement 真正进入 `src/main/ipc/`、`src/main/application/`、`src/renderer/` 边界。
- 用户声明真相 / 系统推断真相 / 下游展开内容三层 provenance 明确落盘、可追踪、可阻断。
- 新增实体主数据层与 project draft 层分离：至少覆盖人物、势力、地点、关键道具、关系。
- 新增工序边界守卫：outline → character → detailed outline → script 不能越级读取、不能后工序兜底前工序。
- 页面层彻底退出第二写口 / 第二裁判口 / 第二发布口。
- 失败结果“可见可分析”与“正式联动阻断”分成两条机制。
- 承重角色识别 + grouped/layered/batched generation 成为正式能力，而不是只靠 `core/active` 雏形。
- 探针通过 / 可见结果 / 正式放行 / 质量通过 四层测试体系落地成正式命令与证据。

### Definition of Done (verifiable conditions with commands)

- [ ] `src/main/ipc/` 关键 truth 边界存在 authority/runtime enforcement 调用，且能被搜索命中。
- [ ] `generationStatus`、`scriptRuntimeState`、`failureHistory`、`stage` 等核心真相只有一个 writer owner。
- [ ] repo 中存在实体主数据层文件与 CRUD/selector/mapper，且人物/势力/地点/道具/关系不再只停留在 project draft 字段里。
- [ ] outline / character / detailed outline / script 存在正式 process-boundary guardian，并能阻断越级使用。
- [ ] 失败结果在 UI 或正式读取口中可见、可分析、可保留历史，而 formal release 仍被 gate 拦住。
- [ ] 批次构造结果中包含承重角色/实体依赖信息，不能只按 episode count 切批。
- [ ] 测试入口正式区分 probe / visible / formal / quality 四层，并有独立证据输出。
- [ ] 在上述条件全部通过前，`计划总表.md` / 任务卡 / worklog 明确禁止继续把 P0/P1/P2 当正式主线。

### Must Have

- 所有“唯一真相”都必须落实到运行时 owner，而不是停在文档定义。
- 任何 user/system/downstream truth 转换都必须保留 provenance，禁止覆盖来源。
- 页面层不允许直接产生命令性真相：只能显示、请求、消费、回显。
- 失败结果必须保留：至少保留历史队列、可见页面、原因分类、formal gate 状态。
- 大体量项目治理必须先有实体主数据和承重分析，再恢复 60/100 集测试。

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)

- 不再接受“文档已有规则”作为完成依据。
- 不再把 P0 质量调优当成地基未完成时的主优先级。
- 不再新增只做说明、不做 enforcement 的影子方案。
- 不允许再让 gate / fallback / repair 抢成主方案。
- 不允许 UI/runner/compat layer 继续生成第二裁判口。

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: tests-after，先做 runtime enforcement / ownership / boundary / fixture / UI-visible validation，再允许质量测试恢复
- QA policy: 每个任务同时包含“结构验证 + 真实行为验证”
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Truth enforcement foundation

- T1 runtime truth domain inventory and single-writer matrix
- T2 IPC/main truth enforcement hooks
- T3 renderer second-writer purge（known explicit violations may begin immediately once T1 matrix draft confirms owner mapping）
- T4 failure-history persistence & visibility baseline

Wave 2: Truth layering and entity master data

- T5 fact provenance model repair
- T6 entity master data schema and storage
- T7 draft↔master mapping layer
- T8 process input decomposition layer

Wave 3: Process boundary and stage governance

- T9 process-boundary guardian
- T10 downstream invalidation strategy
- T11 page-only-display enforcement
- T12 formal release vs visible result separation

Wave 4: Large-project governance and testing layers

- T13 load-bearing role/entity analysis
- T14 grouped/layered/batched generation formalization and upgrade
- T15 four-layer test system
- T16 trusted runner taxonomy & evidence routing

Wave 5: Mainline requalification

- T17 requalify P0/P1/P2 prerequisites in plan/task/worklog
- T18 rerun structural gates and sample-visible flows
- T19 decide whether quality tuning may resume

### Dependency Matrix (full, all tasks)

- T1 blocks T2-T4, T17-T19
- T2-T4 block T9-T12 and T15
- T5 blocks T6-T8 and T13
- T6-T8 block T9, T10, T13, T14
- T9-T12 block T15-T19
- T13-T16 block T17-T19
- T17-T19 block FINAL

### Agent Dispatch Summary (wave → task count → categories)

- Wave 1 → 4 tasks → `unspecified-high`
- Wave 2 → 4 tasks → `unspecified-high`
- Wave 3 → 4 tasks → `unspecified-high` + `deep`
- Wave 4 → 4 tasks → `deep` + `unspecified-high`
- Wave 5 → 3 tasks → `writing` + `unspecified-high`

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. 建立 truth domain 清单与 single-writer 矩阵

  **What to do**:
  - 盘点所有核心 truth domain：stage、blockedReason、resumeEligibility、generationStatus、scriptRuntimeState、facts、failureHistory、ledger、visibleResult、formalRelease。
  - 为每个 truth domain 指定唯一 producer、consumer、persister、display-only consumers。
  - 在代码中补一份 machine-readable truth-owner matrix（例如 `src/shared/domain/workflow/truth-owner-matrix.ts`），供运行时 enforcement 与测试使用。

  **Must NOT do**:
  - 不只写 markdown 说明
  - 不保留多 owner 模糊口径

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及全系统真相域梳理与 owner 定义
  - Skills: [`coding-standards`] — 统一命名与边界表示
  - Omitted: [`ai-regression-testing`] — 当前不是回归测试实现

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,17 | Blocked By: None

  **References**:
  - `src/shared/domain/workflow/truth-authority.ts`
  - `src/shared/domain/workflow/authority-constitution.ts`
  - `src/shared/contracts/authority-failure.ts`
  - `docs/system-authority（系统定义权与主权规则）.md`
  - `docs/当前工作区/active-task（当前任务卡）.md:171-205`

  **Acceptance Criteria**:
  - [ ] 所有核心 truth domain 在代码里有唯一 owner matrix
  - [ ] 至少覆盖 stage / generationStatus / failureHistory / scriptRuntimeState / facts / visibleResult / formalRelease

  **QA Scenarios**:

  ```
  Scenario: truth owner matrix 可读且完整
    Tool: Read
    Steps: 打开 truth-owner matrix 文件，对照 authority 文档列出的 truth 域
    Expected: 每个 truth 域都有 producer / consumer / persister 定义
    Evidence: .sisyphus/evidence/task-1-truth-owner-matrix.txt

  Scenario: 不再依赖文档口径单独描述
    Tool: Grep
    Steps: 搜索代码里 owner matrix 的引用位置
    Expected: 不只是一份孤立定义，后续 enforcement/validation 会引用它
    Evidence: .sisyphus/evidence/task-1-owner-matrix-usage.txt
  ```

  **Commit**: YES | Message: `feat(truth): add runtime truth owner matrix` | Files: truth authority domain files

- [x] 2. 在 IPC/main 边界接入 runtime truth enforcement

  **What to do**:
  - 在 `src/main/ipc/` 与关键 `src/main/application/` 入口接入 authority/runtime enforcement。
  - 使用 `assertAuthorityCheck` / `enforceWriteAuthority` / `enforceNoForbiddenFallback`（或等效新 guard）在运行时校验 truth domain owner。
  - 对任何不合法 producer / forbidden fallback 直接抛 authority failure，不允许继续。
  - enforcement 必须同时落在 **IPC generation entry / stage entry** 与 **关键 main application dispatch** 两层，不能只留在纯 domain helper。

  **Must NOT do**:
  - 不只在模块 import 时校验一次
  - 不允许 guard 定义存在但没有实际调用

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及跨 IPC / main 层的运行时 enforcement
  - Skills: [`coding-standards`] — 保持失败语义和 owner 约束一致
  - Omitted: [`backend-patterns`] — 本质是运行时边界治理，不是服务端 API 设计

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9,11,15,17 | Blocked By: 1

  **References**:
  - `src/main/ipc/**/*.ts`
  - `src/shared/domain/workflow/authority-constitution.ts`
  - `src/shared/domain/workflow/truth-authority.ts`
  - `src/shared/contracts/authority-failure.ts`
  - `docs/system-authority（系统定义权与主权规则）.md`

  **Acceptance Criteria**:
  - [ ] `src/main/ipc/` 能搜索到运行时 authority/truth enforcement 调用
  - [ ] 非法写入或 fallback 会抛 authority failure

  **QA Scenarios**:

  ```
  Scenario: IPC 边界存在 enforcement
    Tool: Grep
    Steps: 搜索 src/main/ipc 中 authority enforcement 调用
    Expected: 至少关键 truth domain handler 都有 enforcement 调用
    Evidence: .sisyphus/evidence/task-2-ipc-enforcement.txt

  Scenario: 非法写入被阻断
    Tool: Bash / targeted test
    Steps: 触发一个已知 forbidden fallback 或非法 producer 写入测试场景
    Expected: 返回 authority failure，不继续推进
    Evidence: .sisyphus/evidence/task-2-forbidden-write-block.txt
  ```

  **Commit**: YES | Message: `feat(authority): enforce truth ownership at ipc boundaries` | Files: src/main/ipc/**, src/shared/domain/workflow/**

- [x] 3. 清掉 renderer 第二写口 / 第二裁判口 / 第二发布口

  **What to do**:
  - 系统性清理 renderer 中对 stage、generationStatus、failure/state 等核心真相的本地生产与越权写入。
  - 收口 `useWorkflowStore` / shell / feature hooks，使 renderer 只消费 authoritative data，不再本地重算或重写。
  - 对 UI 侧需要临时派生的状态，明确标注 display-only，不得回写主 truth domain。
  - 已知显式违规（例如 `useWorkflowStore` 中的直接 setter 写口）必须作为优先清理项写进实施顺序。

  **Must NOT do**:
  - 不把 display-only 派生继续存回主 store
  - 不让页面继续兼任裁判或发布口

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及多页面多 hook 的 writer 收口
  - Skills: [`coding-standards`] — 控制状态 ownership 和命名边界
  - Omitted: [`frontend-design`] — 本任务不是 UI 美化

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 11,17 | Blocked By: 1

  **References**:
  - `src/renderer/src/app/store/useWorkflowStore.ts`
  - `src/renderer/src/features/**`
  - `src/renderer/src/app/utils/stage-navigation-truth.ts`
  - `docs/当前工作区/active-task（当前任务卡）.md:175-205`

  **Acceptance Criteria**:
  - [ ] renderer 中核心 truth domain 的本地 writer 被清掉或降为 display-only
  - [ ] 页面层不存在第二裁判/第二发布口

  **QA Scenarios**:

  ```
  Scenario: renderer 不再写 generationStatus
    Tool: Grep
    Steps: 搜索 src/renderer/src 中 generationStatus 写入点
    Expected: 核心 truth 不再由 renderer 直接产生命令性写入
    Evidence: .sisyphus/evidence/task-3-renderer-writers.txt

  Scenario: 页面只显示不裁决
    Tool: Read
    Steps: 阅读关键 page/hook/store 路径
    Expected: 页面逻辑只消费 main/IPC 返回，不自行改写正式真相
    Evidence: .sisyphus/evidence/task-3-display-only-boundary.txt
  ```

  **Commit**: YES | Message: `refactor(renderer): remove second writers and judges` | Files: renderer stores/hooks/components

- [x] 4. 修复 failure history 持久化与可见性基线

  **What to do**:
  - 把 `failureHistory` 从“名义队列、实际 0/1 条”修成真正可保留最近 N 条的历史。
  - 把 `failurePreview` / `runtime failure history` 接到正式消费口，而不是只存在 hook/孤岛结构。
  - 失败结果必须能同时做到：阻断 formal progression、可见、可分析、可追踪。

  **Must NOT do**:
  - 不在成功后把分析价值直接清空
  - 不只存 latest failure

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及 failure state 语义与 UI/持久化联动
  - Skills: [`coding-standards`] — 保持失败分类、历史队列、展示一致
  - Omitted: [`verification-loop`] — 当前先修机制，再做全面验证

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 12,15,17 | Blocked By: 1

  **References**:
  - `src/shared/domain/workflow/failure-history-queue.ts`
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`
  - `src/shared/contracts/authority-failure.ts`
  - `docs/当前工作区/active-task（当前任务卡）.md:236-250`

  **Acceptance Criteria**:
  - [ ] 最近 N 条失败历史被真实保留
  - [ ] UI 或正式读取口能看到 failure history / preview
  - [ ] formal release 仍会被 failure gate 阻断

  **QA Scenarios**:

  ```
  Scenario: 三次失败历史可见
    Tool: Bash / targeted test
    Steps: 连续制造三次失败，读取 failure history
    Expected: 三条 distinct failure 均可见，而不是只剩一条
    Evidence: .sisyphus/evidence/task-4-failure-history.txt

  Scenario: 失败结果可见但不放行
    Tool: UI / runtime API
    Steps: 触发失败后查看页面或正式 failure endpoint
    Expected: 用户能看到失败结果与原因，但 formal progression 被阻断
    Evidence: .sisyphus/evidence/task-4-visible-but-blocked.txt
  ```

  **Commit**: YES | Message: `feat(runtime): persist and expose failure history` | Files: runtime state/history/ui hooks

- [x] 5. 修复真相 provenance 模型：用户真相 / 系统推断 / 下游展开三层分离

  **What to do**:
  - 明确 formal fact provenance 至少三层：`user_declared`、`system_inferred`、`downstream_expanded`（命名可调整，但层级不可少）。
  - 保留 origin 与 confirmation/elevation 轨迹，禁止确认动作覆盖事实来源。
  - 让 downstream 只能读取满足 gate 的 truth，而不是把来源擦掉后混入主线。

  **Must NOT do**:
  - 不再用“确认即改写 authorityType”这种方式抹平 provenance
  - 不把所有已确认内容都伪装成 `user_declared`

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及 formal fact domain 的核心语义修复
  - Skills: [`coding-standards`] — 确保类型、策略、selectors 一致
  - Omitted: [`api-design`] — 不是外部 API 设计任务

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7,8,13,15 | Blocked By: 1

  **References**:
  - `src/shared/contracts/formal-fact.ts`
  - `src/shared/domain/formal-fact/authority-policy.ts`
  - `src/shared/domain/formal-fact/definition-engine.ts`
  - `src/shared/domain/formal-fact/elevation-engine.ts`
  - `src/shared/domain/formal-fact/selectors.ts`
  - `src/main/application/workspace/declare-formal-fact.ts`
  - `src/main/application/workspace/confirm-formal-fact.ts`

  **Acceptance Criteria**:
  - [ ] provenance 三层在合同和实现中都存在
  - [ ] confirm/elevate 不覆盖 origin provenance
  - [ ] downstream 读取 gate 有明确约束

  **QA Scenarios**:

  ```
  Scenario: ai_suggested 确认后保留来源
    Tool: Targeted test / Read
    Steps: 创建 ai-suggested fact，确认后读取其 provenance
    Expected: 仍保留原始来源，同时记录确认动作
    Evidence: .sisyphus/evidence/task-5-provenance-retention.txt

  Scenario: downstream 不能读未经 gate 的 fact
    Tool: Targeted test
    Steps: 让一个未满足 gate 的 fact 尝试进入 mainline
    Expected: 被 policy 阻断
    Evidence: .sisyphus/evidence/task-5-gated-fact-flow.txt
  ```

  **Commit**: YES | Message: `feat(facts): preserve provenance tiers and gating` | Files: formal-fact domain + handlers

- [x] 6. 建立实体主数据层（人物 / 势力 / 地点 / 道具 / 关系）

  **What to do**:
  - 新增实体主表/主数据层，不再只靠 project-scoped draft 承载一切。
  - 至少覆盖：人物、势力/门派/组织、地点、关键道具、关系。
  - 每类实体必须有稳定 ID、结构化字段、project mapping、source provenance。
  - 现有 CharacterDraft 继续保留为工序产物，但必须能映射到 master entity。

  **Must NOT do**:
  - 不把 master data 简化成又一份 draft
  - 不继续只靠名字字符串硬连关系

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 这是创作系统地基级数据建模
  - Skills: [`coding-standards`] — 保持 schema / DTO / mapper 一致
  - Omitted: [`database-migrations`] — 当前未必有 DB migration，先就 repo 持久化结构建模

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,8,10,13,14 | Blocked By: 5

  **References**:
  - `src/shared/contracts/workflow.ts`
  - `src/shared/contracts/story-contract.ts`
  - `src/shared/contracts/input-contract.ts`
  - `src/main/infrastructure/storage/project-store*.ts`
  - `docs/当前工作区/active-task（当前任务卡）.md`

  **Acceptance Criteria**:
  - [ ] repo 中存在实体主数据层代码与持久化路径
  - [ ] 人物/势力/地点/道具/关系不是只存在于自由文本或 draft 字段中
  - [ ] 实体具备稳定 ID 与 provenance

  **QA Scenarios**:

  ```
  Scenario: character draft 可映射到 master entity
    Tool: Targeted test
    Steps: 给定一个 character draft，执行映射流程
    Expected: 生成或关联稳定 entity ID，而不是只保留名字字符串
    Evidence: .sisyphus/evidence/task-6-character-master-mapping.txt

  Scenario: faction/location/item/relation 有正式 schema
    Tool: Read + Grep
    Steps: 搜索实体主数据合同和实现
    Expected: 五类实体均有正式结构与存取路径
    Evidence: .sisyphus/evidence/task-6-entity-schemas.txt
  ```

  **Commit**: YES | Message: `feat(entities): add master-data layer for creative truth` | Files: shared contracts/domain/storage

- [x] 7. 建立 master data ↔ draft 映射层

  **What to do**:
  - 定义 entity master data 与 outline/character/detailed outline/script drafts 之间的 mapper。
  - 明确哪些字段来自 master，哪些是 stage-local expansion。
  - 任一 draft 不得再偷偷承担“主数据 + 工序产物 + 展示内容”三重职责。

  **Must NOT do**:
  - 不把映射写成隐式字符串拼接
  - 不让 draft 继续直接充当 master data

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 需要精细映射和职责拆分
  - Skills: [`coding-standards`] — 防止 DTO/mapping 混乱
  - Omitted: [`backend-patterns`] — 本质是创作域 mapping

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10,13,14 | Blocked By: 5,6

  **References**:
  - `src/shared/contracts/workflow.ts`
  - `src/shared/contracts/story-contract.ts`
  - `src/main/application/workspace/*`
  - 新实体主数据层

  **Acceptance Criteria**:
  - [ ] 每个 draft 层能追溯 master entity 来源
  - [ ] draft/local expansion 不会反过来篡改 master truth

  **QA Scenarios**:

  ```
  Scenario: draft 来源可追踪
    Tool: Targeted test
    Steps: 生成一个包含角色和关系的 outline/character draft
    Expected: 能追踪回 master entity ID 与 provenance
    Evidence: .sisyphus/evidence/task-7-draft-provenance.txt

  Scenario: local expansion 不污染 master
    Tool: Targeted test
    Steps: 在某 stage 中做局部展开/补充
    Expected: master data 仅在显式确认/映射路径上更新
    Evidence: .sisyphus/evidence/task-7-no-master-pollution.txt
  ```

  **Commit**: YES | Message: `feat(mapping): separate entity masters from stage drafts` | Files: mappers/contracts/selectors

- [x] 8. 建立输入拆解层：用户输入先拆真相，再允许生成

  **What to do**:
  - 把自由输入与生成之间插入正式 truth decomposition layer。
  - 最低要求拆出：人物、势力、地点、关键道具、关系、不可变事实。
  - 对拆解结果分层：user-declared / suggested / inferred / unresolved。

  **Must NOT do**:
  - 不再让“整段自由文本”直接作为下游工序主输入
  - 不只抽名字，不做实体和关系拆解

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 这是创作入口层设计核心
  - Skills: [`coding-standards`] — 保持输入层、实体层、工序层分离
  - Omitted: [`ai-regression-testing`] — 当前不是回归测试任务

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,13 | Blocked By: 5,6

  **References**:
  - `src/shared/contracts/intake.ts`
  - `src/main/application/workspace/summarize-chat-for-generation-*.ts`
  - `src/main/application/workspace/outline-facts.ts`
  - 新 master data 层

  **Acceptance Criteria**:
  - [ ] 用户输入先进入 truth decomposition layer
  - [ ] 下游 outline/character generation 不再直接吃未拆分长文本

  **QA Scenarios**:

  ```
  Scenario: 自由输入被拆成实体与事实
    Tool: Targeted test
    Steps: 输入一段含人物/地点/关系/道具的自由描述
    Expected: 输出明确的 decomposition result，而不是只一段 summary
    Evidence: .sisyphus/evidence/task-8-input-decomposition.txt

  Scenario: unresolved truth 被保留而不硬猜
    Tool: Targeted test
    Steps: 输入存在歧义的自由描述
    Expected: 不会直接硬写主线真相，未解项保留为 unresolved
    Evidence: .sisyphus/evidence/task-8-unresolved-truth.txt
  ```

  **Commit**: YES | Message: `feat(intake): add truth decomposition layer before generation` | Files: intake/application/shared contracts

- [x] 9. 建立 process-boundary guardian

  **What to do**:
  - 为 outline / character / detailed outline / script 建立正式边界守卫。
  - 阻止下游读取不完整 upstream，阻止后工序替前工序兜底。
  - guardian 必须在 **persistence save/update path** 与 **IPC generation entry path** 两侧都生效，而不是只做 UI 提示。

  **Must NOT do**:
  - 不只保留纯函数 `deriveStage()` 作为“参考逻辑”
  - 不允许 process boundary 只在展示层判断

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 涉及主流程执行边界与系统责任划分
  - Skills: [`coding-standards`] — 守住边界与错误语义
  - Omitted: [`verification-loop`] — 先实现 guardian，再整体验证

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10,11,12,15,17 | Blocked By: 2,7,8

  **References**:
  - `src/shared/domain/workflow/stage-derivation.ts`
  - `src/shared/contracts/stage-contract.ts`
  - `src/main/application/stage-contract/*.ts`
  - `src/main/ipc/workflow/*.ts`

  **Acceptance Criteria**:
  - [ ] 下游不能越级读取不完整 upstream
  - [ ] 后工序不能替前工序兜底
  - [ ] 边界错误产生正式 failure 而非只提示

  **QA Scenarios**:

  ```
  Scenario: detailed outline 未 ready 时 script 入口被 guardian 阻断
    Tool: Targeted test
    Steps: 在缺失必要 upstream 的情况下启动 script generation
    Expected: 正式 boundary failure，且不会继续生成
    Evidence: .sisyphus/evidence/task-9-boundary-block.txt

  Scenario: guardian 在 persistence 边界也生效
    Tool: Targeted test
    Steps: 试图写入与当前 stage/contract 不匹配的数据
    Expected: 持久化拒绝，而不是只在 UI 层提示
    Evidence: .sisyphus/evidence/task-9-persistence-guardian.txt
  ```

  **Commit**: YES | Message: `feat(boundary): enforce stage and process guardians` | Files: workflow/stage/persistence boundaries

- [x] 10. 建立上游变更 → 下游失效策略

  **What to do**:
  - 定义 outline / character / detailed outline 变化时，哪些 downstream runtime assets 必须失效：scriptDraft、board、resume、failure、failureHistory、ledger、visibleResult、formalRelease 等。
  - 统一在 save/update path 上执行 invalidation，而不是各处手写局部清理。

  **Must NOT do**:
  - 不允许再保留旧 runtime asset 串线
  - 不允许只清 UI 不清 persistence

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及状态一致性与 invalidation 机制
  - Skills: [`coding-standards`] — 保持 invalidation 范围一致
  - Omitted: [`backend-patterns`] — 核心是状态治理，不是接口模式

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12,17,18 | Blocked By: 6,7,9

  **References**:
  - `src/main/infrastructure/storage/project-store*.ts`
  - `src/shared/contracts/workspace.ts`
  - `docs/当前工作区/active-task（当前任务卡）.md:224-241`

  **Acceptance Criteria**:
  - [ ] 上游真源变化会统一让下游 runtime assets 失效
  - [ ] 失效策略在 persistence 与 renderer 状态中一致生效

  **QA Scenarios**:

  ```
  Scenario: 修改详纲后旧 script runtime asset 被清空
    Tool: Targeted test
    Steps: 生成 script runtime 后修改 detailed outline
    Expected: scriptDraft / board / resume / failure / ledger 等统一失效
    Evidence: .sisyphus/evidence/task-10-invalidation.txt

  Scenario: failureHistory 不再跨世代串线
    Tool: Targeted test
    Steps: 让 A 版本失败，再重生成 B 版本 upstream
    Expected: B 不继承 A 的 runtime failure baggage
    Evidence: .sisyphus/evidence/task-10-no-cross-generation-history.txt
  ```

  **Commit**: YES | Message: `feat(runtime): unify downstream invalidation policy` | Files: storage/workspace/runtime state

- [x] 11. 页面层只显示，不做第二写口 / 第二裁判口 / 第二发布口

  **What to do**:
  - 对首页、project 页、script 页、runtime 页、sidebar/header 的状态消费重新梳理。
  - 页面不再自行拼装“只差这一条”的压扁真相，不再自己定义 release/ready 状态。
  - 对页面需要展示的结果，统一由 main/IPC 交付结构化 truth snapshot。

  **Must NOT do**:
  - 不允许页面继续从零重算 ledger / release / boundary truth
  - 不允许 UI 临时推断上升成正式真相

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及多页面状态展示收口
  - Skills: [`coding-standards`] — 保持 truth snapshot 与 display-only 边界
  - Omitted: [`frontend-design`] — 不是视觉任务

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 17,18 | Blocked By: 3,9

  **References**:
  - `src/renderer/src/app/shell/*`
  - `src/renderer/src/features/**`
  - `src/renderer/src/app/utils/stage-navigation-truth.ts`
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`

  **Acceptance Criteria**:
  - [ ] 页面消费结构化 truth snapshot，而不是自行裁判
  - [ ] `blockedBy` / failure / release reasons 不再只显示第一条

  **QA Scenarios**:

  ```
  Scenario: 页面可见完整阻断清单
    Tool: UI / targeted test
    Steps: 构造多条 blocked issue 场景
    Expected: 页面可见完整清单或完整摘要，不再只剩第一条
    Evidence: .sisyphus/evidence/task-11-multi-issue-visible.txt

  Scenario: 页面不再重算 ledger truth
    Tool: Grep + Read
    Steps: 搜索 renderer 中 ledger/release truth 计算路径
    Expected: 页面只消费 authoritative snapshot，不自行生成第二份 truth
    Evidence: .sisyphus/evidence/task-11-no-shadow-judges.txt
  ```

  **Commit**: YES | Message: `refactor(ui): consume authoritative snapshots only` | Files: renderer pages/hooks/stores

- [x] 12. 建立“失败结果可见”与“正式放行阻断”双轨机制

  **What to do**:
  - 失败结果必须被保留下来并可查看（visibleResult），但 formalRelease 必须单独判断，不能因为结果可见就自动放行。
  - 明确区分：运行草稿 / 可见草稿 / 待确认 / 正式放行。
  - 用正式合同或专门 DTO 固定这些状态层。

  **Must NOT do**:
  - 不把可见结果当正式真相
  - 不再出现“失败结果完全不可见，只剩一句重试”

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及产品状态分层与 release semantics
  - Skills: [`coding-standards`] — 保持状态层命名和过渡清晰
  - Omitted: [`api-design`] — 重点不是接口资源命名，而是状态层语义

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15,16,17,18 | Blocked By: 4,9,10

  **References**:
  - `src/shared/contracts/*`
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`
  - `src/renderer/src/app/store/useWorkflowStore.ts`
  - `docs/system-authority（系统定义权与主权规则）.md`

  **Acceptance Criteria**:
  - [ ] 结果可见层与正式放行层分开
  - [ ] visible result 失败也可查看
  - [ ] formal release 需要独立通过条件

  **QA Scenarios**:

  ```
  Scenario: 失败结果仍可查看
    Tool: UI / targeted test
    Steps: 触发失败后进入结果查看口
    Expected: 用户能看到当前失败结果与分析信息
    Evidence: .sisyphus/evidence/task-12-visible-failure-result.txt

  Scenario: 可见结果不等于正式放行
    Tool: Targeted test
    Steps: 在 visible result 存在但 formal gate 未过时查看状态
    Expected: formal release 仍 blocked
    Evidence: .sisyphus/evidence/task-12-visible-not-release.txt
  ```

  **Commit**: YES | Message: `feat(release): separate visible result from formal release` | Files: shared contracts/ui/runtime state

- [x] 13. 建立承重角色 / 承重实体识别

  **What to do**:
  - 在角色/实体治理中新增承重分析：识别谁承载主冲突、关系杠杆、关键道具线、主题兑现、阶段推进。
  - 第一版必须采用 **规则 / contract 驱动**（基于 storyContract、entity relations、open hooks、fact bindings、active blocks），禁止把新模型或黑箱评分器当成前提。
  - 把承重分析结果接进 batch context 和 prompt context，避免只按块号简单筛角色。

  **Must NOT do**:
  - 不只按名字出现频次或 blockNo 机械筛人
  - 不把所有 active 角色等同于承重角色

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 需要 narrative load-bearing 模型设计
  - Skills: [`coding-standards`] — 保持 schema 与 batch consumer 一致
  - Omitted: [`frontend-design`] — 非 UI 任务

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 14,18,19 | Blocked By: 5,6,7,8

  **References**:
  - `src/main/application/script-generation/plan/planning-blocks.ts`
  - `src/shared/contracts/workflow.ts`
  - `src/shared/contracts/story-contract.ts`
  - 新 entity master data 层

  **Acceptance Criteria**:
  - [ ] batch context 中包含 load-bearing annotations
  - [ ] prompt / plan 不再只按 activeBlockNos 粗筛角色

  **QA Scenarios**:

  ```
  Scenario: batch context 带承重标注
    Tool: Targeted test
    Steps: 构建 60 集项目的 batch contexts
    Expected: 每批 context 含有 load-bearing role/entity 标签与理由
    Evidence: .sisyphus/evidence/task-13-load-bearing-context.txt

  Scenario: 承重角色不同于普通 active 角色
    Tool: Targeted test
    Steps: 对同一批角色做分层分析
    Expected: 承重角色集合是有依据的子集，不是简单等于 active 列表
    Evidence: .sisyphus/evidence/task-13-role-differentiation.txt
  ```

  **Commit**: YES | Message: `feat(batch): add load-bearing role analysis` | Files: planning/story-contract/entity analysis

- [x] 14. 把 grouped / layered / batched generation 升级成正式大体量治理系统

  **What to do**:
  - 先把当前 `10/10/5` batching 正式化成可验证治理能力（contract + tests + evidence），再在其上新增 grouped / layered governance：核心人物、阶段人物、群像人物、功能人物；主冲突组、关系组、世界规则组等。
  - 让大项目承载不只依赖固定 batch size，而依赖结构化 grouping + layering + batching。

  **Must NOT do**:
  - 不继续只靠 episode count 切批
  - 不让大体量治理停在“5 集一批”层面

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 涉及大体量承载模型升级
  - Skills: [`coding-standards`] — 保持 grouping/layering schema 与 batch runtime 一致
  - Omitted: [`database-migrations`] — 当前聚焦域模型与 orchestration

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 18,19 | Blocked By: 6,7,13

  **References**:
  - `src/main/application/script-generation/plan/planning-blocks.ts`
  - `src/shared/contracts/workflow.ts`
  - `AGENTS.md`
  - `docs/当前工作区/active-task（当前任务卡）.md`

  **Acceptance Criteria**:
  - [ ] 当前 `10/10/5` batching 被正式 contract / tests / evidence 固化
  - [ ] grouped/layered/batched governance 在 batch builder 中有正式实现
  - [ ] 60/100 集项目能表达不同层级角色/实体承载，而不是线性 episode 切块

  **QA Scenarios**:

  ```
  Scenario: 100 集项目分组分层分批输出可解释
    Tool: Targeted test / Read
    Steps: 构造大体量项目并读取 batch plan
    Expected: 能看到 group/layer/batch 三层治理结果
    Evidence: .sisyphus/evidence/task-14-large-project-governance.txt

  Scenario: grouping 不改变 formal truth owner
    Tool: Targeted test
    Steps: 检查 grouping/layering 输出如何引用 master data
    Expected: grouping 只消费 truth，不产生第二真相层
    Evidence: .sisyphus/evidence/task-14-no-second-truth.txt
  ```

  **Commit**: YES | Message: `feat(governance): formalize grouped layered batched generation` | Files: planning/orchestration/contracts

- [x] 15. 建立四层测试体系：probe / visible / formal / quality

  **What to do**:
  - 正式定义并实现四层测试门：
    1. probe pass（能跑起来）
    2. visible result（有可见结果）
    3. formal release（符合正式合同）
    4. quality pass（质量可交付）
  - 每层必须有独立命令、独立证据、独立 gate，禁止混为一谈。
  - 必须基于当前实际可用底座实现，不得假设已清退的旧黄金链脚本仍可直接复活。

  **Must NOT do**:
  - 不允许“探针通过 = 产品通过”
  - 不允许“有可见结果 = 正式放行”

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 测试体系重构关系到整条主线可信度
  - Skills: [`verification-loop`, `ai-regression-testing`] — 需要正式验证与分层回归设计
  - Omitted: [`requesting-code-review`] — 当前先建测试体系本身

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 16,18,19 | Blocked By: 2,4,9,10,12

  **References**:
  - `tools/e2e/contract_guard_check.mjs`
  - `tools/e2e/e2e-output.mjs`
  - `tools/e2e/electron_launch_smoke.mjs`
  - `tools/e2e/electron_p0_real_regression.mjs`
  - `package.json`
  - `docs/当前工作区/E2E重建准入标准（2026-03-22）.md`
  - `docs/当前工作区/active-task（当前任务卡）.md`

  **Acceptance Criteria**:
  - [ ] 四层测试门有正式命令和命名
  - [ ] 同一轮测试结果能明确区分四层 verdict
  - [ ] 旧 trusted runner 被纳入新 taxonomy，而不是继续做隐性总裁判

  **QA Scenarios**:

  ```
  Scenario: probe 通过但 formal 未过
    Tool: Bash
    Steps: 跑一条只完成生成启动但不满足合同的样本
    Expected: probe pass，visible maybe pass，formal fail，quality not evaluated or fail
    Evidence: .sisyphus/evidence/task-15-layered-test-verdicts.txt

  Scenario: 四层结果彼此独立
    Tool: Read + Bash
    Steps: 查看测试命令、输出和 evidence 命名
    Expected: 四层不混级，不共享同一个模糊“通过/失败”口径
    Evidence: .sisyphus/evidence/task-15-separate-gates.txt
  ```

  **Commit**: YES | Message: `feat(testing): formalize four-layer verification gates` | Files: tools/e2e package.json docs/tests

- [x] 16. 建 trusted runner taxonomy 与 evidence routing

  **What to do**:
  - 对现有 trusted runner、seeded runner、manual QA runner 做正式分类。
  - 每类 runner 明确属于 probe/visible/formal/quality 哪一层，以及产物落哪里。
  - evidence 路径与命名规范统一，禁止 runner 各自发明 verdict 词汇。

  **Must NOT do**:
  - 不允许 runner 继续各自定义第二测试裁判口
  - 不允许 evidence 输出无层级归属

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 属于测试治理与证据路由收口
  - Skills: [`verification-loop`] — 保持验证证据清晰可追
  - Omitted: [`frontend-design`] — 无关

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 18,19 | Blocked By: 15

  **References**:
  - `tools/e2e/*`
  - `package.json`
  - `docs/当前工作区/E2E重建准入标准（2026-03-22）.md`

  **Acceptance Criteria**:
  - [ ] trusted runner taxonomy 被正式定义并接线
  - [ ] 每个 runner 的 verdict 归属明确
  - [ ] evidence 路径统一

  **QA Scenarios**:

  ```
  Scenario: runner 分类明确
    Tool: Read
    Steps: 阅读 runner taxonomy 文档/代码映射
    Expected: 每个 runner 明确归属 probe/visible/formal/quality 某一层
    Evidence: .sisyphus/evidence/task-16-runner-taxonomy.txt

  Scenario: evidence 路径统一
    Tool: Glob
    Steps: 查看 evidence 输出目录
    Expected: 产物命名与层级一致，不再各写各的 verdict
    Evidence: .sisyphus/evidence/task-16-evidence-routing.txt
  ```

  **Commit**: YES | Message: `chore(runners): unify runner taxonomy and evidence routing` | Files: tools/e2e package/docs

- [x] 17. 在计划总表 / 任务卡 / worklog 中正式降级 P0/P1/P2 为“地基完成后的后续阶段”

  **What to do**:
  - 更新三处正式记录，明确：在 creative foundation hardening 完成前，P0/P1/P2 不是正式主线，只是后续阶段。
  - 停止把 P0 质量调优当当前主任务，改为“地基通过后的 resumed mainline”。

  **Must NOT do**:
  - 不允许继续写成“边修地基边正式做质量验收”
  - 不允许 authority 完成后直接默认 P0 已可恢复

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 三处唯一记录口的策略同步
  - Skills: []
  - Omitted: [`strategic-compact`] — 不是上下文压缩任务

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 18,19 | Blocked By: 1,2,3,4,9,10,11,12,15,16

  **References**:
  - `docs/plans/计划总表.md`
  - `docs/当前工作区/active-task（当前任务卡）.md`
  - `4.worklog.md`

  **Acceptance Criteria**:
  - [ ] 三处正式记录都明确地基优先
  - [ ] P0/P1/P2 被重定义为 foundation-complete 之后的后续阶段

  **QA Scenarios**:

  ```
  Scenario: 三处文档口径一致降级 P0/P1/P2
    Tool: Read
    Steps: 对照三份文档当前主线定义
    Expected: 都明确写 foundation 先于质量/恢复/长测
    Evidence: .sisyphus/evidence/task-17-doc-reprioritization.txt

  Scenario: 不再边修地基边假装正式验收
    Tool: Read
    Steps: 搜索 P0/P1/P2 当前描述
    Expected: 不再把它们写成“现在就可作为正式主线执行”
    Evidence: .sisyphus/evidence/task-17-no-premature-mainline.txt
  ```

  **Commit**: YES | Message: `docs(plan): reprioritize quality phases after foundation hardening` | Files: docs sync files

- [x] 18. 重跑地基结构门：single-writer / provenance / boundary / failure-visible / test-layers

  **What to do**:
  - 用正式命令和 targeted tests 重跑所有 foundation gates。
  - 输出一份基线报告：哪些基础设施真正通过、哪些仍失败、是否允许恢复质量调优。

  **Must NOT do**:
  - 不只跑 typecheck/build 就宣布 foundation complete
  - 不让某个单点 probe pass 冒充全地基通过

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 这是 foundation completion 的正式验收
  - Skills: [`verification-loop`, `ai-regression-testing`] — 需要严谨验证
  - Omitted: [`requesting-code-review`] — 当前重点先跑正式验收门

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 19 | Blocked By: 10,11,12,13,14,15,16,17

  **References**:
  - 所有新增 foundation gates / commands / tests / docs

  **Acceptance Criteria**:
  - [ ] foundation baseline report 产出并可追溯
  - [ ] 至少覆盖 single-writer / provenance / boundary / failure visibility / test layers / batch governance

  **QA Scenarios**:

  ```
  Scenario: foundation gates 全部有 verdict
    Tool: Bash + Read
    Steps: 运行各 foundation gate 命令并汇总报告
    Expected: 每个基础门都有 pass/fail 结果，而不是只有一条总状态
    Evidence: .sisyphus/evidence/task-18-foundation-baseline.txt

  Scenario: baseline 能区分未完成地基与产品质量问题
    Tool: Read
    Steps: 阅读 baseline report
    Expected: 报告明确区分 foundation gap vs content-quality gap
    Evidence: .sisyphus/evidence/task-18-gap-classification.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

- [x] 19. 决定是否允许恢复质量调优 / 恢复链 / 长测主线

  **What to do**:
  - 以 Task 18 的 foundation baseline 为依据，显式给出：
    - 能否恢复 P0
    - 能否恢复 P1
    - 能否恢复 P2
  - 任何一项恢复都必须有明确前提，不允许默认继续。

  **Must NOT do**:
  - 不允许“看起来差不多了”就恢复主线
  - 不允许 P0/P1/P2 一起无条件恢复

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 这是阶段切换与放行决定
  - Skills: []
  - Omitted: [`strategic-compact`] — 非压缩任务

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: FINAL | Blocked By: 18

  **References**:
  - Task 18 foundation baseline report
  - `docs/plans/计划总表.md`
  - `docs/当前工作区/active-task（当前任务卡）.md`

  **Acceptance Criteria**:
  - [ ] 是否恢复 P0/P1/P2 有明确书面结论
  - [ ] 结论直接绑定 foundation baseline，不靠主观判断

  **QA Scenarios**:

  ```
  Scenario: P0/P1/P2 恢复条件明确
    Tool: Read
    Steps: 阅读恢复决策结论
    Expected: 每一项恢复都有条件和证据绑定
    Evidence: .sisyphus/evidence/task-19-resume-criteria.txt

  Scenario: 未通过 foundation 不恢复主线
    Tool: Read
    Steps: 检查 baseline 与恢复决定的关系
    Expected: foundation baseline 未满足时不会放行 P0/P1/P2
    Evidence: .sisyphus/evidence/task-19-no-premature-resume.txt
  ```

  **Commit**: YES | Message: `docs(foundation): gate mainline resumption on baseline completion` | Files: docs sync files

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

### Current Final Wave Status (2026-03-23)

- F1 Plan Compliance Audit: APPROVE（latest rerun after T12/T14 + formal/quality fixes）
- F2 Code Quality Review: APPROVE（latest rerun after dual-state producer leak fix）
- F3 Real Manual QA: APPROVE（user acceptance provided; manual QA gate closed by user-side acceptance）
- F4 Scope Fidelity Check: APPROVE（latest rerun after T12/T14 closure）

> Note: User has now provided explicit acceptance ("验收"). Final Verification Wave is closed.

- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy

- Commit 1: runtime truth enforcement and single-writer groundwork
- Commit 2: provenance model + entity master data + input decomposition
- Commit 3: process-boundary guardian + invalidation + page-only-display enforcement
- Commit 4: failure-visible + formal release separation + four-layer test system + runner taxonomy
- Commit 5: docs reprioritization + foundation baseline + resume decision
- Never mix quality-tuning content work into foundation-hardening commits.

## Success Criteria

- 8 条地基原则从“文档里承认”升级成“运行时 enforced + 可验证”
- 文档和代码不再出现“规则成熟、实现空心”的错位
- 页面层不再当第二写口 / 第二裁判口 / 第二发布口
- entity master data 和 truth decomposition layer 成为真实存在的系统层
- failure results 可见、可分析、可保留历史，同时 formal release 仍被单独 gate 控制
- 大项目治理不再只靠固定 batch size，而是建立了 grouped/layered/batched + load-bearing 分析
- probe / visible / formal / quality 四层测试门成为正式体系
- 在 foundation baseline 未通过前，不再继续把优质内容、恢复链、60/100 集承载当主线
