# Authority 验证固化、验收落档与主线回接计划

## TL;DR

> **Summary**: 先把 authority 这轮从“验收通过但验证入口零散”固化成正式、跨平台、可重复执行的结构门禁；再把本轮结论写回唯一记录口；最后按当前任务卡既定顺序切回 `稳定优质 60 集专项调整与验收恢复` 主线。
> **Deliverables**:
>
> - authority 正式验证命令（跨平台）
> - authority 验收结论回填到唯一记录口
> - 当前主任务回接说明与执行顺序同步
> - 主线恢复前的最小验证清单
>   **Effort**: Short
>   **Parallel**: YES - 3 waves
>   **Critical Path**: authority gate 正式化 → authority 验收落档 → 主线回接同步 → 恢复 P0/P1/P2 执行

## Context

### Original Request

- 补 authority 测试/脚本入口，变成正式验证命令
- 把本轮验收结论写入计划完成记录 / 当前任务记录
- 切回当前主任务，继续推进创作主链交付

### Interview Summary

- 本轮 authority-elimination 已经完成验收，但验证入口仍是“typecheck + bash gate + 零散 node:test”的临时组合，不够正式。
- 仓库当前唯一执行计划入口仍是 `docs/plans/计划总表.md`；当前任务口仍是 `docs/当前工作区/active-task（当前任务卡）.md`；阶段摘要仍写 `4.worklog.md`。
- 当前主任务不是继续谈 authority，而是回到 `稳定优质 60 集专项调整与验收恢复`，并严格按任务卡中已写明的 P0（首稿质量）→ P1（恢复链）→ P2（60 集长测）顺序推进。

### Metis Review (gaps addressed)

- authority 门禁与 60 集质量验收必须分层：authority 只验证结构与 owner 边界，不冒充产品质量验收。
- `scripts/authority-gate.sh` 是 bash-only；计划必须明确跨平台正式入口，不能把 Git Bash/WSL 当默认前提。
- 验收结论不能新开第二套记录体系；只允许写入现有唯一记录口。
- 计划必须明确当“结构 gate 与 authority 测试结果不一致”时的裁决顺序，避免执行人临场判断。

## Work Objectives

### Core Objective

把 authority 这轮从“一次性验收通过”升级成“仓库内有正式命令、有正式记录、有正式回接动作”的稳定状态，并在不扩 scope 的前提下恢复当前主任务推进。

### Deliverables

- `package.json` 中新增 authority 正式命令，覆盖结构门禁与 authority 行为测试。
- `scripts/authority-gate.sh` 保留为历史参考或对照，但正式入口改为跨平台 Node 方案。
- `docs/plans/计划总表.md` 写入 authority 这轮已完成结论、边界与当前非阻断观察项。
- `docs/当前工作区/active-task（当前任务卡）.md` 同步 authority 收口已完成，并明确主线回接位置。
- `4.worklog.md` 补一条 authority 验收通过与主线切回记录。
- 主线恢复前检查表：authority 结构 gate 通过、authority 测试通过、当前主任务排序未被改乱。

### Definition of Done (verifiable conditions with commands)

- [ ] `package.json` 存在 authority 正式命令，且在 Windows/Node 环境可直接执行。
- [ ] authority 正式命令能同时覆盖“anti-pattern 结构扫描”与“authority 行为回归测试”。
- [ ] `docs/plans/计划总表.md`、`docs/当前工作区/active-task（当前任务卡）.md`、`4.worklog.md` 三处对 authority 本轮结论和主线回接口径一致。
- [ ] 当前主任务仍明确保持 `P0 首稿质量 → P1 恢复链 → P2 60 集长测` 顺序，未被 authority 尾活改写。

### Must Have

- authority 正式入口必须跨平台，默认只依赖 Node/npm。
- authority 验证必须拆成两层：
  - 结构门禁：查 forbidden fallback / owner 越权 / optimistic state update
  - 行为测试：authority failure notice、regression、status 相关 node:test
- 当 authority 行为测试与结构 gate 冲突时，**任何一项失败都算 authority 验证失败**。
- authority 结论只写现有唯一记录口：`计划总表.md` + `active-task（当前任务卡）.md` + `4.worklog.md`。
- 主线回接必须明确 authority 只是前置结构门禁，不是 60 集质量通过证明。

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)

- 不新增第二份当前计划入口。
- 不新建 authority 专属长期记录体系或平行台账目录。
- 不把 authority gate 扩写成 60 集质量验收脚本。
- 不顺手修改 P0/P1/P2 的业务目标，只允许补“回接说明”和“当前位置”。
- 不继续依赖 bash-only 脚本作为官方唯一入口。

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: tests-after + Node `node:test` + cross-platform authority gate
- QA policy: 每个任务都必须同时覆盖 happy path 和 failure/edge case
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: authority 验证入口定型

- T1 authority 正式命令规范定稿
- T2 盘点并确认 authority 测试入口清单
- T3 把 bash gate 逻辑迁成跨平台 Node gate
- T4 package.json 正式脚本接线

Wave 2: 验收结论落档

- T5 计划总表写入 authority 验收结论与边界
- T6 当前任务卡写入 authority 已完成与主线回接位
- T7 worklog 写入 authority 验收摘要

Wave 3: 主线回接与恢复准备

- T8 定义 authority gate 与主线质量验收的边界说明
- T9 同步主任务回接顺序与最小恢复清单
- T10 运行正式 authority 命令并记录 baseline 结果

Wave 4: 收尾

- T11 核对三处文档口径一致
- T12 核对主线仍锁定 P0→P1→P2，未被 authority 尾活改写

### Dependency Matrix (full, all tasks)

- T1-T3：无前置，阻塞 T4、T10
- T4：依赖 T1-T3，阻塞 T10
- T5-T7：依赖 T1（脚本命名与正式口径定稿），阻塞 T11
- T8-T9：依赖 T5-T7，阻塞 T11-T12
- T10：依赖 T4，阻塞 T11
- T11-T12：依赖 T5-T10，阻塞 FINAL

### Agent Dispatch Summary (wave → task count → categories)

- Wave 1 → 4 tasks → `unspecified-high` + `quick`
- Wave 2 → 3 tasks → `writing`
- Wave 3 → 3 tasks → `writing` + `unspecified-high`
- Wave 4 → 2 tasks → `quick`

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. 定义 authority 正式命令规范

  **What to do**:
  - 明确官方 authority 验证由两个命令组成：
    1. `authority:gate`：跨平台结构门禁
    2. `test:authority`：authority 行为测试
  - 再定义总入口：`authority:check`，顺序执行 `authority:gate` → `test:authority`。
  - 明确裁决规则：任一子命令失败，`authority:check` 即失败。

  **Must NOT do**:
  - 不把 `npm test` 扩成整个仓库所有测试入口
  - 不把 60 集质量验收脚本塞进 authority 入口

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 需要同时做脚本命名、职责边界和失败裁决设计
  - Skills: [`coding-standards`] — 统一命名与命令语义
  - Omitted: [`tdd-workflow`] — 本任务是验证入口规划，不是业务特性设计

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,6,7,10 | Blocked By: None

  **References**:
  - `package.json:7-22` — 当前无 `test` 相关脚本
  - `scripts/authority-gate.sh:1-125` — 现有 authority 结构扫描逻辑
  - `src/shared/contracts/authority-failure.test.ts` — authority contract 测试集合
  - `src/renderer/src/app/utils/authority-failure-regression.test.ts` — authority regression 测试集合
  - `src/renderer/src/app/utils/authority-failure-notice.test.ts` — authority notice 测试集合

  **Acceptance Criteria**:
  - [ ] authority 官方命令名、职责、执行顺序、失败规则写成明确方案
  - [ ] 方案明确区分 structure gate 与 behavior tests

  **QA Scenarios**:

  ```
  Scenario: 命令职责不重叠
    Tool: Read
    Steps: 阅读 package.json 目标脚本定义与计划说明
    Expected: authority:gate 只做结构门禁，test:authority 只做 authority 行为测试，authority:check 串联两者
    Evidence: .sisyphus/evidence/task-1-command-contract.txt

  Scenario: 失败裁决明确
    Tool: Read
    Steps: 核对脚本说明与文档中的失败规则
    Expected: 任一子命令失败即 authority:check 失败，没有“部分通过”灰区
    Evidence: .sisyphus/evidence/task-1-failure-policy.txt
  ```

  **Commit**: YES | Message: `chore(authority): define official verification commands` | Files: `package.json`, docs sync files, scripts authority gate files

- [x] 2. 确认 authority 行为测试清单与运行入口

  **What to do**:
  - 固定本轮 authority 行为测试至少包含：
    - `src/renderer/src/app/utils/authority-failure-regression.test.ts`
    - `src/renderer/src/app/utils/authority-failure-notice.test.ts`
    - `src/shared/contracts/authority-failure.test.ts`
  - 若 `authority-failure.test.ts` 直接 Node 跑仍有 ESM/扩展名问题，执行人必须一并修正测试运行方式，使其纳入正式入口。
  - 若需要编译/loader/路径修正，只能围绕“让现有 authority 测试可被正式命令跑通”展开，不得扩大到全仓测试重构。

  **Must NOT do**:
  - 不忽略 `authority-failure.test.ts` 的当前执行问题
  - 不把 `.tmp-node-tests/` 当长期官方入口

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 要处理 Node/TS/ESM 测试入口边界问题
  - Skills: [`coding-standards`] — 约束测试入口命名与最小改动
  - Omitted: [`verification-loop`] — 此处只需 authority 定向验证，不做全仓验证闭环

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,10 | Blocked By: None

  **References**:
  - `package.json:7-22` — 当前无测试脚本
  - `src/shared/contracts/authority-failure.test.ts:1-15` — 当前无扩展名导入 `./authority-failure`
  - `src/renderer/src/app/utils/authority-failure-regression.test.ts` — 已实跑通过的行为回归测试
  - `src/renderer/src/app/utils/authority-failure-notice.test.ts` — 已实跑通过的 notice 测试

  **Acceptance Criteria**:
  - [ ] authority 正式测试入口覆盖 3 个 authority 核心测试文件
  - [ ] 当前已知 `authority-failure.test.ts` 入口问题被纳入正式修正范围

  **QA Scenarios**:

  ```
  Scenario: authority 测试清单完整
    Tool: Read + Glob
    Steps: 对照计划清单与仓库 authority 测试文件
    Expected: 3 个核心 authority 测试文件全部被正式命令覆盖
    Evidence: .sisyphus/evidence/task-2-test-inventory.txt

  Scenario: 不再依赖临时测试产物
    Tool: Read
    Steps: 核对正式命令描述与相关脚本
    Expected: 官方入口不以 .tmp-node-tests 作为长期测试源
    Evidence: .sisyphus/evidence/task-2-no-temp-artifacts.txt
  ```

  **Commit**: YES | Message: `test(authority): formalize authority test entrypoints` | Files: `package.json`, authority test files if needed for runner compatibility

- [x] 3. 把 bash-only authority gate 迁为跨平台 Node gate

  **What to do**:
  - 新增 Node 版 authority gate，完整复刻 `scripts/authority-gate.sh` 的两类检测：
    1. `catch { setStage(...) }`
    2. 缺失 authority 结果时的 optimistic `setStage(...)`
  - 输出格式需与现有 bash gate 语义一致：显示结果摘要、列出命中项、0 表 clean、非 0 表 failed。
  - 保留 `authority-gate.sh` 作为历史对照或临时兼容，但 package.json 官方入口只指向 Node 版 gate。

  **Must NOT do**:
  - 不改变 gate 的业务判定语义
  - 不把 gate 扩写成 AST 大改造或全仓质量扫描

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 需要把 shell 判定无损迁移到 Node 并保证跨平台行为一致
  - Skills: [`coding-standards`] — 保持输出与退出码清晰稳定
  - Omitted: [`backend-patterns`] — 非服务端业务问题

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,10 | Blocked By: None

  **References**:
  - `scripts/authority-gate.sh:1-125` — 现有逻辑真源
  - `src/shared/domain/workflow/authority-constitution.ts` — forbidden fallback 语义来源
  - `src/renderer/src/components/ProjectGenerationBanner.tsx` — 正确 authority-first 示例
  - `src/renderer/src/features/outline/ui/OutlineStage.tsx` — 正确 authority-first 示例

  **Acceptance Criteria**:
  - [ ] Node gate 在 Windows/Node 环境可运行
  - [ ] Node gate 复刻现有两类反模式扫描
  - [ ] package.json 官方入口不再依赖 bash-only 脚本

  **QA Scenarios**:

  ```
  Scenario: Node gate 空仓清洁时返回 clean
    Tool: Bash
    Steps: 运行新的 authority:gate 命令
    Expected: 输出 clean 摘要，退出码为 0
    Evidence: .sisyphus/evidence/task-3-gate-clean.txt

  Scenario: Node gate 与旧 bash 语义一致
    Tool: Bash
    Steps: 分别运行 Node gate 与 bash gate，对照当前代码库结果
    Expected: 两者都报告 clean，且扫描维度一致
    Evidence: .sisyphus/evidence/task-3-parity.txt
  ```

  **Commit**: YES | Message: `chore(authority): add cross-platform authority gate` | Files: `scripts/*authority*`, `package.json`

- [x] 4. 在 package.json 接通 authority 正式脚本

  **What to do**:
  - 在 `package.json` 新增至少以下脚本：
    - `authority:gate`
    - `test:authority`
    - `authority:check`
  - `authority:check` 必须按固定顺序执行 `authority:gate && test:authority`。
  - 若仓库保留无总 `test` 脚本，允许不新增 `test`，避免 scope 扩到全仓测试系统改造。

  **Must NOT do**:
  - 不顺手定义全仓 `npm test` 并收全仓测试
  - 不把 authority 脚本命名成含糊的 `check` / `verify` 单词而没有 authority 前缀

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: 改动集中且规则已由 T1-T3 确定
  - Skills: [`coding-standards`] — 保证脚本命名一致
  - Omitted: [`verification-loop`] — 非最终全仓回归任务

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 10 | Blocked By: 1,2,3

  **References**:
  - `package.json:7-22` — 当前脚本基线
  - T1-T3 设计结论

  **Acceptance Criteria**:
  - [ ] package.json 存在 3 个 authority 正式脚本
  - [ ] `authority:check` 串联顺序固定且可直接执行

  **QA Scenarios**:

  ```
  Scenario: 脚本可被 npm 识别
    Tool: Bash
    Steps: 运行 `npm run authority:check`
    Expected: npm 能识别脚本并实际执行 gate + tests
    Evidence: .sisyphus/evidence/task-4-authority-check.txt

  Scenario: 子命令顺序固定
    Tool: Read + Bash
    Steps: 阅读 package.json 后执行 authority:check
    Expected: 先运行 authority:gate，再运行 test:authority
    Evidence: .sisyphus/evidence/task-4-order.txt
  ```

  **Commit**: YES | Message: `chore(authority): wire official verification scripts` | Files: `package.json`

- [x] 5. 把 authority 验收结论写入计划总表

  **What to do**:
  - 在 `docs/plans/计划总表.md` 增补一段 authority 本轮收口结论，必须写清：
    - 本轮解决的是 authority / fallback / error-surface / orchestrator 收口
    - 结论是“结构口径已统一、authority 失败显式报错”
    - 非阻断观察项仅剩“验证入口正式化/跨平台化”，不再把 authority 当当前主任务
  - 该段必须明确 authority 只是主线前置结构门禁，不是 60 集质量验收结论。

  **Must NOT do**:
  - 不重写总表主任务目标
  - 不把 authority 验收写成“项目已整体完成”

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 需要高精度同步项目级口径
  - Skills: []
  - Omitted: [`strategic-compact`] — 当前不是压缩上下文，而是正式落档

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9,11 | Blocked By: 1

  **References**:
  - `docs/plans/计划总表.md:99-218` — 当前主线和 P0/P1/P2 定义
  - `.sisyphus/plans/judge-authority-elimination.md` — authority 本轮计划真源
  - 当前验收结论（本轮对话归纳）

  **Acceptance Criteria**:
  - [ ] 计划总表新增 authority 本轮完成摘要
  - [ ] 文字明确 authority 与 60 集质量验收的边界

  **QA Scenarios**:

  ```
  Scenario: 总表保留单一主线
    Tool: Read
    Steps: 阅读 authority 新增段与 P0/P1/P2 主线段落
    Expected: authority 被定义为已收口前置结构工作，主线仍是稳定优质60集专项调整与验收恢复
    Evidence: .sisyphus/evidence/task-5-plan-record.txt

  Scenario: 无项目整体完成误导
    Tool: Read
    Steps: 检查新增文字的结论用语
    Expected: 不出现“项目已完成/全部通过”类越界表述
    Evidence: .sisyphus/evidence/task-5-no-overclaim.txt
  ```

  **Commit**: YES | Message: `docs(plan): record authority acceptance conclusion` | Files: `docs/plans/计划总表.md`

- [x] 6. 把 authority 验收结论写入当前任务卡

  **What to do**:
  - 在 `docs/当前工作区/active-task（当前任务卡）.md` 加一段本轮 authority 收口摘要。
  - 明确写出：authority 这轮已经收完，不再是当前主卡点；当前主卡点仍是首稿质量密度、恢复链可信闭环、60 集长测证据。
  - 把 authority 正式验证命令写入任务卡，作为执行人每轮切回主线前的结构检查入口。

  **Must NOT do**:
  - 不把 authority 相关尾活提升成新的当前主任务
  - 不覆盖已存在的 P0/P1/P2 顺序

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 任务卡是当前唯一执行口，必须精确同步
  - Skills: []
  - Omitted: [`requesting-code-review`] — 不是代码审查任务

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9,11,12 | Blocked By: 1

  **References**:
  - `docs/当前工作区/active-task（当前任务卡）.md:47-96` — 当前主任务和最小验收标准
  - `docs/当前工作区/active-task（当前任务卡）.md:120-163` — 当前优先级顺序与最新战略判断

  **Acceptance Criteria**:
  - [ ] 任务卡新增 authority 已完成摘要
  - [ ] 任务卡明确当前主卡点仍是 P0/P1/P2 主线
  - [ ] 任务卡写入 authority 正式验证命令

  **QA Scenarios**:

  ```
  Scenario: 任务卡不改主任务
    Tool: Read
    Steps: 阅读新增 authority 段和“当前正在做”段落
    Expected: 当前主任务仍是稳定优质60集专项调整与验收恢复
    Evidence: .sisyphus/evidence/task-6-active-task-alignment.txt

  Scenario: 执行人可直接照命令复查结构 gate
    Tool: Read
    Steps: 检查任务卡中 authority 正式命令写法
    Expected: 执行人无需猜测即可运行 authority:check
    Evidence: .sisyphus/evidence/task-6-command-visible.txt
  ```

  **Commit**: YES | Message: `docs(task): sync authority closure and mainline return` | Files: `docs/当前工作区/active-task（当前任务卡）.md`

- [x] 7. 把 authority 验收结论写入 worklog

  **What to do**:
  - 在 `4.worklog.md` 补一条新的阶段记录，记录 authority-elimination 验收通过、验证入口固化、以及“现在切回 P0/P1/P2 主线”的结论。
  - 记录里必须写清本轮通过依据：typecheck、authority gate、authority 测试、独立审查。

  **Must NOT do**:
  - 不写成长篇规则说明
  - 不在 worklog 里再定义第二套计划

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: worklog 只保留阶段摘要，需短而准
  - Skills: []
  - Omitted: [`strategic-compact`] — 非压缩任务

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 1

  **References**:
  - `4.worklog.md:24-50` — 最近阶段记录风格
  - authority 本轮验收结果汇总

  **Acceptance Criteria**:
  - [ ] worklog 新增 authority 通过与主线回接摘要
  - [ ] worklog 只保留阶段结论，不扩成第二计划

  **QA Scenarios**:

  ```
  Scenario: worklog 记录风格一致
    Tool: Read
    Steps: 对照最近两条 worklog 与新增 authority 记录
    Expected: 新记录保持“主任务/本轮完成/当前结论/当前下一步”风格
    Evidence: .sisyphus/evidence/task-7-worklog-style.txt

  Scenario: authority 通过依据可追溯
    Tool: Read
    Steps: 阅读新增 authority 记录内容
    Expected: 明确列出 typecheck、gate、tests、独立审查等依据
    Evidence: .sisyphus/evidence/task-7-worklog-evidence.txt
  ```

  **Commit**: YES | Message: `docs(worklog): record authority acceptance and return path` | Files: `4.worklog.md`

- [x] 8. 定义 authority gate 与主线质量验收的边界说明

  **What to do**:
  - 在计划总表或任务卡适当位置明确一句硬规则：
    - `authority:check` 通过 ≠ 60 集质量通过
    - `authority:check` 只证明“结构没有第二裁判口、authority failure 会显式报错”
    - 产品主线仍需通过 `11-15 集真实回归 / 恢复链真实闭环 / 60 集长测新鲜证据`
  - 让执行人不会把 authority 绿灯误解为产品绿灯。

  **Must NOT do**:
  - 不重复开第二份说明文档
  - 不让边界说明漂浮在对话里而不落档

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 属于协作边界声明，需要精准语言
  - Skills: []
  - Omitted: [`api-design`] — 无关

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11,12 | Blocked By: 5,6

  **References**:
  - `docs/plans/计划总表.md:128-218` — P0/P1/P2 验收定义
  - `docs/当前工作区/active-task（当前任务卡）.md:91-96` — 当前最小验收标准

  **Acceptance Criteria**:
  - [ ] 至少一处正式记录明确写出 authority gate 与主线质量验收边界
  - [ ] 执行人不会把 authority 通过误判成主线完成

  **QA Scenarios**:

  ```
  Scenario: 边界说明显式存在
    Tool: Read
    Steps: 搜索 authority:check 与 11-15/恢复链/60集长测表述
    Expected: 文档明确写出“结构 gate ≠ 产品质量验收”
    Evidence: .sisyphus/evidence/task-8-boundary.txt

  Scenario: 主线质量标准仍完整
    Tool: Read
    Steps: 阅读 P0/P1/P2 和当前最小验收标准
    Expected: 主线质量与恢复验收标准未被 authority gate 覆盖或替代
    Evidence: .sisyphus/evidence/task-8-mainline-criteria.txt
  ```

  **Commit**: YES | Message: `docs(authority): clarify gate versus product acceptance` | Files: `docs/plans/计划总表.md`, `docs/当前工作区/active-task（当前任务卡）.md`

- [x] 9. 同步主任务回接顺序与最小恢复清单

  **What to do**:
  - 在任务卡或总表中补一段“authority 尾活完成后的恢复动作”，顺序固定为：
    1. 先跑 `authority:check`
    2. 再回到 P0 首稿质量密度 / 11-15 集真实回归
    3. P0 稳后再做 P1 恢复链真实闭环
    4. P1 稳后再做 P2 60 集长测
  - 明确 authority 只是每轮回主线前的结构 guard，不改变主任务排序。

  **Must NOT do**:
  - 不改写当前任务卡中已有 P0/P1/P2 本质目标
  - 不让 authority 检查变成每一步的主裁判

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: 属于执行顺序同步，不涉及新架构设计
  - Skills: []
  - Omitted: [`gitnexus-impact-analysis`] — 当前非依赖风险分析任务

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11,12 | Blocked By: 5,6

  **References**:
  - `docs/当前工作区/active-task（当前任务卡）.md:64-89` — 执行人直接执行顺序
  - `docs/plans/计划总表.md:128-218` — P0/P1/P2 目标与验收标准

  **Acceptance Criteria**:
  - [ ] 回主线前检查顺序被明确写入正式记录
  - [ ] authority gate 被定义为“前置 guard”，不是主线替代物

  **QA Scenarios**:

  ```
  Scenario: 回接顺序明确
    Tool: Read
    Steps: 阅读新增回接清单
    Expected: 明确写出 authority:check → P0 → P1 → P2
    Evidence: .sisyphus/evidence/task-9-return-order.txt

  Scenario: 不改变主线排序
    Tool: Read
    Steps: 对比新增回接清单与原 P0/P1/P2 定义
    Expected: 原排序保持不变
    Evidence: .sisyphus/evidence/task-9-no-reorder.txt
  ```

  **Commit**: YES | Message: `docs(mainline): add post-authority return sequence` | Files: `docs/当前工作区/active-task（当前任务卡）.md`, `docs/plans/计划总表.md`

- [x] 10. 运行 authority 正式命令并记录 baseline 结果

  **What to do**:
  - 在新脚本接好后运行 `npm run authority:check`。
  - 记录 baseline：
    - gate 是否 clean
    - authority 测试通过数
    - 若失败，失败项必须落入记录口，并阻断“authority 已固化”结论
  - 只有 baseline 通过，才允许在文档中写“authority 正式入口已收口”。

  **Must NOT do**:
  - 不在 authority:check 未跑通时宣称固化完成
  - 不只跑子命令之一就当完成

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 需要实际验证命令链路并处理 runner 失败
  - Skills: [`verification-loop`] — 适合跑正式验证并记录失败项
  - Omitted: [`tdd-workflow`] — 不是新功能开发顺序控制

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11 | Blocked By: 4

  **References**:
  - `package.json` 中新增 authority 脚本
  - 新 Node authority gate
  - authority 相关测试文件

  **Acceptance Criteria**:
  - [ ] `npm run authority:check` 可执行
  - [ ] baseline 结果被记录且可追溯
  - [ ] 若 baseline 失败，不会写出错误“已固化完成”结论

  **QA Scenarios**:

  ```
  Scenario: authority 正式入口可执行
    Tool: Bash
    Steps: 运行 `npm run authority:check`
    Expected: 命令完整跑完，输出 gate + tests 结果
    Evidence: .sisyphus/evidence/task-10-authority-baseline.txt

  Scenario: baseline 结果被同步到记录口
    Tool: Read
    Steps: 阅读总表/任务卡/worklog 对 authority baseline 的记录
    Expected: 至少一处正式记录写明 baseline pass/fail 结果
    Evidence: .sisyphus/evidence/task-10-baseline-record.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence only

- [x] 11. 核对三处记录口径一致

  **What to do**:
  - 对照 `docs/plans/计划总表.md`、`docs/当前工作区/active-task（当前任务卡）.md`、`4.worklog.md`，核对这三类信息一致：
    - authority 这轮已完成
    - authority 正式命令名
    - authority 只是结构门禁，不替代主线质量验收
    - 当前主线仍是 P0 → P1 → P2

  **Must NOT do**:
  - 不允许三处各写一套不同结论
  - 不允许 worklog 抢走计划定义权

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: 核对任务，逻辑单一
  - Skills: []
  - Omitted: [`requesting-code-review`] — 文档一致性检查无需代码 review 技法

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: FINAL | Blocked By: 5,6,7,8,9,10

  **References**:
  - `docs/plans/计划总表.md`
  - `docs/当前工作区/active-task（当前任务卡）.md`
  - `4.worklog.md`

  **Acceptance Criteria**:
  - [ ] 三处记录在 authority 结论、命令名、主线回接顺序上完全一致

  **QA Scenarios**:

  ```
  Scenario: 三处 authority 结论一致
    Tool: Read
    Steps: 对照三份文档 authority 段落
    Expected: 不存在“已完成/未完成/仍是主线”互相矛盾表述
    Evidence: .sisyphus/evidence/task-11-doc-sync.txt

  Scenario: 命令名一致
    Tool: Read
    Steps: 检查三份文档中 authority 命令写法
    Expected: 全部写成同一组正式命令名
    Evidence: .sisyphus/evidence/task-11-command-sync.txt
  ```

  **Commit**: YES | Message: `docs(sync): align authority records across plan task and worklog` | Files: docs sync files only

- [x] 12. 核对主线仍锁定 P0→P1→P2

  **What to do**:
  - 审核 authority 尾活完成后，当前执行口是否仍是：
    - P0：首稿质量密度 / 11-15 集真实回归
    - P1：恢复链真实闭环
    - P2：60 集长测重验
  - 若任何文档出现 authority 尾活插队成新主任务，必须回修文案。

  **Must NOT do**:
  - 不在 authority 文档补记时重新发明主任务
  - 不允许“先把 authority 继续优化一下”替代真实主线推进

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: 最终范围核对任务
  - Skills: []
  - Omitted: [`gitnexus-exploring`] — 非代码执行流探索任务

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: FINAL | Blocked By: 6,8,9,11

  **References**:
  - `docs/当前工作区/active-task（当前任务卡）.md:120-163`
  - `docs/plans/计划总表.md:128-218`

  **Acceptance Criteria**:
  - [ ] 所有正式记录仍锁定 P0→P1→P2 主线
  - [ ] authority 尾活未改写主任务顺序

  **QA Scenarios**:

  ```
  Scenario: 当前主线排序保持不变
    Tool: Read
    Steps: 检查任务卡和计划总表中的优先级顺序
    Expected: 仍是 P0 首稿质量 → P1 恢复链 → P2 长测
    Evidence: .sisyphus/evidence/task-12-mainline-order.txt

  Scenario: authority 未反客为主
    Tool: Read
    Steps: 检查 authority 段落与当前正在做段落
    Expected: authority 被归为已完成结构尾活，不是新的当前主任务
    Evidence: .sisyphus/evidence/task-12-no-scope-hijack.txt
  ```

  **Commit**: YES | Message: `docs(mainline): preserve P0-P2 priority after authority closure` | Files: docs sync files only

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy

- Commit 1: authority gate and script officialization (`chore(authority): add official verification entrypoints`)
- Commit 2: acceptance records sync (`docs(authority): record closure and return to mainline`)
- Commit 3: optional docs consistency cleanup if required by review (`docs(sync): align authority closure records`)
- Do not combine mainline business changes into the authority-hardening commits.

## Success Criteria

- authority 验证拥有官方、跨平台、可重复执行入口
- authority 结构 gate 与 authority 行为测试都能被 `authority:check` 收口
- authority 本轮通过结论已写回唯一记录口，且三处一致
- 当前主任务继续锁定 P0→P1→P2，没有被 authority 尾活挤掉
- 执行人现在可以先跑 `authority:check`，然后直接回到 `11-15 集真实回归 → 恢复链真实闭环 → 60 集长测` 主线
