# 真相统一与生成链收口总计�?
## TL;DR

> **Quick Summary**：收口剧本系统的唯一真相源，消灭 UI 第二裁判口、旧口径残留、legacy 决策干扰、恢复链失真与假绿吞错，让“用户确认的需�?�?正式事实 �?详细大纲 �?剧本生成 �?恢复/验收”只走一条权威链路�?>
> **Deliverables**�?>
> - 一个唯一的阶�?合同/真相判定中心
> - 一条唯一的剧本生成与恢复编排�?> - 一套统一阈值、统一错误语义、统一 UI 展示口径
> - 一�?legacy 桥接降权与残留清�?>
> **Estimated Effort**：XL
> **Parallel Execution**：YES - 4 waves
> **Critical Path**：真相定义收�?�?合同/阈值统一 �?生成/恢复编排统一 �?UI 去裁判化 �?最终核�?
---

## Context

### Original Request

用户要求做一份总计划，系统性解决：真相源不统一、旧残留/旧逻辑并存、UI 第二裁判口、越权切�?写状态、legacy bridge、恢复链失真、假�?吞错、多入口、多层不对齐，以及生成结果与用户需求对不上的问题�?
### Interview Summary

**Key Discussions**�?
- 现有系统存在“一个意思三四套口径”的问题，main / renderer / shared / legacy / UI 提示各自判断�?- 剧本生成原先 5 集后停住，本质是批次单元与续批编排缺失叠加多入口、多状态源问题�?- 项目进入即卡，本质是 hydration / 状态处�?/ UI 渲染链耦合�?- 用户目标不是补丁�?bug，而是统一真相、统一判定、统一恢复、统一展示�?
**Research Findings**�?
- `resolve-runtime-profile.ts` 存在 5 集写作单元约束，生成编排历史上缺自动续批�?- `progress-board` / `scriptResumeResolution` / `scriptFailureResolution` / `scriptRuntimeFailureHistory` 存在多源并行、复用不可靠�?- `screenplay-quality.ts`、`audit-scene-issues.ts`、测试脚本、提示词中阈值不一致�?- Renderer 侧存�?`plan.ready`、blocked reason、completion、stage 决策、resume 提示等二次裁判�?- `legacyFormat`、旧三段稿字段、兼容修补路径仍参与主判断�?- 存在吞错、假绿、部分成功仍落盘/仍展示的问题�?
### Metis Review

**Identified Gaps**（已纳入计划）：

- 必须明确定义“真�?authority”到底是模块、合同还是决策边�?—�?本计划按“单一合同 + 单一决策入口 + 单一持久化解释权”三件套收口�?- 需要防 scope creep —�?本计划只做真相统一、链路收口、口径清洗，不扩展新功能�?- 需要明�?legacy 退场策�?—�?本计划包含“降权、隔离、迁移、删除”的分步处理�?- 需要明确验�?—�?本计划要求所有阶�?gate、阈值、resume、UI 展示都以同一源为准，并给�?agent 可执�?QA�?
### Relationship to Current Active Task

本计划用�?*接管并收束当�?active-task 的剩余问�?*，不是平行再开第二条整改线�?
**Authoritative current task path**：`docs/当前工作�?active-task（当前任务卡�?md`

**直接被本计划接管的当前问�?*�?
- `script gate 真实阻断清单拆解�?UI 真相补漏` �?Task 2 / 13 / 14 / 16
- `恢复链真实闭环` �?Task 5 / 8 / 10 / 11
- `11-15 集真实回归` 与长测恢�?�?Task 7-12 + F2
- `E2E 重建准入标准` �?Task 22 + Final Wave

**执行规则**�?
- active-task 中未完成项视为本计划前情与输入，不再单独形成第二套真相与修复口径�?- 如果 active-task 中已有局部修复与本计划冲突，以本计划的单一权威收口方案为准�?- 本计划开始执行后，`active-task（当前任务卡�?md` 仅保留进度同步，不再单独定义第二套裁判规则�?- **切换时点**：从 `/start-work truth-authority-unification` 开始，视为正式完成�?active-task 到本计划的执行切换�?
**当前状态说�?*�?
- 当前系统处于“问题已暴露、局部已修、整体未统一”的阶段�?- 本计划从统一收口开始接管，当前 active-task 中的剩余项不再作为单独终点维持�?
### Active Issue Consolidation Map

> 当前 active-task 中已识别�?31+ 个问题，不再单独散落推进；全部并入以下任务组统一收口�?
- **真相/合同/阈值分裂类** �?Task 1 / 2 / 3 / 4 / 22
- **resume / board / failure / ledger 失真�?* �?Task 5 / 8 / 10 / 11 / 16
- **生成 5 集停�?/ 多入口分�?/ stop-rewrite-continue 语义冲突** �?Task 6 / 7 / 10 / 17
- **吞错 / 假绿 / partial success / verify 伪成�?* �?Task 9 / 11
- **UI 第二裁判�?/ blocked reason 分裂 / stage 判断分裂** �?Task 2 / 13 / 14 / 16 / 17
- **越权切页 / 先改 store 后保�?/ 乐观更新污染真相** �?Task 11 / 15 / 16
- **legacyFormat / 旧三段稿 / bridge 回写 / 旧口径残�?* �?Task 18 / 19 / 20 / 21 / 22
- **项目打开卡顿 / hydration 伪空�?/ UI 状态错�?* �?Task 12 / 16 / F5

**执行要求**�?
- 开工前先把 active-task 中尚未关闭的问题逐条映射到本计划任务号�?- 若发现某�?active-task 问题无法映射�?1-22，必须先补映射，再允许执行�?
---

## Work Objectives

### Core Objective

建立一个唯一可信的创作运行链：用户确�?�?正式事实 �?输入合同 �?生成计划 �?批次执行 �?修复/验收 �?恢复/展示，所有核心决策只允许出现一个权威版本�?
### Concrete Deliverables

- `shared/domain` 中唯一的阶段、合同、阈值、判定与恢复决策中心
- `main/application` 中唯一的生�?恢复/失败编排入口
- `renderer` 中展示化�?UI，移除核心裁判和真相写入职责
- 统一后的 legacy 兼容策略与迁移收尾方�?
### Definition of Done

- [ ] 同一项目�?stage / blocked reason / generation status / resume status �?main、renderer、shared 三层输出一�?- [ ] 所有剧本质量阈值、场次阈值、钩子要求来自单一常量�?- [ ] Renderer 不再直接决定核心 gate、blocked reason、resume 可否、主 stage 权限
- [ ] Resume / failure / board / ledger 状态只由单一编排链读�?- [ ] legacyFormat、旧三段稿、旧 segments 不再主导任何主判�?
### Must Have

- 唯一真相�?- 唯一合同�?- 唯一恢复�?- 唯一入口编排
- 唯一错误语义

### Must NOT Have (Guardrails)

- 不在本次整改中顺手新增产品功�?- 不保留“双轨并行长期共存”口�?- 不允�?UI 继续担任第二裁判�?- 不允�?legacy 字段继续主导 repair / audit / gate
- 不允许“失败但看起来成功”的落盘或展示行�?
### Conflict Arbitration Rule

- �?renderer �?main 对同一核心状态存在解释冲突时�?*main / shared 权威派生结果胜出**，renderer 只能展示，不可改判�?- 当持久化快照与运行�?UI store 冲突时，**持久化真�?+ main 重新派生结果胜出**，UI store 必须重同步�?- �?legacy 字段与新合同字段冲突时，**新合同字段胜�?*；legacy 仅允许用于迁移读取，不允许决定主流程�?- 当两个入口都能触发同一行为时，**唯一 orchestrator 胜出**；其他入口只能转发，不可自带业务分支�?- 任何无法根据上述规则自动裁决的冲突，必须作为阻断错误显式暴露，不允许静默兜底�?
### Error Priority Matrix

- **主进程权威结�?vs renderer 本地判断冲突**：主进程权威结果优先，renderer 必须回收本地判断�?- **主进程权威结�?vs 持久化快照冲�?*：以“持久化快照 + 主进程重新派生”作为最终结果；若无法重派生则阻断�?- **权威派生过程中同时发�?IPC/通信失败**：优先暴露通信失败，不允许 renderer 用旧结论顶替新结论�?- **生成成功但持久化失败**：按失败处理，不允许 UI 展示成功�?- **迁移成功但验证失�?*：按迁移失败处理，不允许进入主链�?
---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** �?所有核验由代理执行，不依赖人工脑补�?
### Test Decision

- **Infrastructure exists**：NO dedicated test script
- **Automated tests**：Tests-after（优�?typecheck/build + targeted command/manual chain QA�?- **Framework**：TypeScript typecheck + Electron build + agent-executed runtime verification

### QA Policy

每个任务都必须至少包含：

- 1 个结构验证（代码路径/输出一致性）
- 1 个行为验证（真实链路是否按权威源运行�?- 1 个负向验证（旧口�?越权路径被拦下）

Evidence 保存�?`.sisyphus/evidence/`�?
### QA Pass Thresholds

- `rg` / `grep` / 代码扫描类场景：**Expected Result = 0 残留匹配**，除非任务文本明确允许保留测试快照或迁移隔离文件�?- `typecheck` / `build` / 自动脚本类场景：**Expected Result = exit code 0**�?- Playwright / 运行链脚本类场景�?*Expected Result = 所有断言通过 + 证据文件存在**�?- 迁移/恢复/状态一致性类场景�?*Expected Result = 同一快照对比结果完全一致，不接受“基本一致�?*�?- 若某 QA 场景未写明数值阈值，默认按上述规则执行，不允许模糊放行�?
### Preflight Requirements

- 开始执行前必须创建并验�?`.sisyphus/evidence/` 目录可写�?- 开始执行前必须确认 `docs/当前工作�?active-task（当前任务卡�?md` 可读，并完成 issue→task 映射�?
---

## Execution Strategy

### Parallel Execution Waves

Wave 1（立法层：定义唯一真相与唯一合同�?*以串行为主，局部并�?*�?├── Task 1: 真相 authority 定义�?owner 收口
├── Task 2: 阶段/导航/blocked reason 单一派生中心
├── Task 3: 阈�?合同/质量规则常量�?├── Task 4: 共享 DTO 与字段语义统一
├── Task 5: 生成状�?恢复状�?失败状态模型统一
└── Task 6: 入口清单与唯一 orchestrator 规范�?
Wave 2（执行层：生�?恢复/失败链统一�?├── Task 7: 剧本生成 orchestrator 单入口化
├── Task 8: Resume / board / failure / ledger 原子链统一
├── Task 9: 吞错/假绿/部分成功落盘彻底收口
├── Task 10: 自动续批与停�?重写行为统一
├── Task 11: 保存链与事务边界统一
└── Task 12: hydration / 运行态读取链去阻塞与单源�?
Wave 3（界面层：UI 去裁判化 + 越权清理�?├── Task 13: Script UI �?plan.ready / blocked reason 决策�?├── Task 14: DetailedOutline / Chat / Home 页去第二裁判�?├── Task 15: setStage / store mutation 收权到主进程确认�?├── Task 16: UI runtime 展示与真实状态对�?└── Task 17: 多入口统一为同一调用链与同一按钮语义

Wave 4（兼容层：legacy 降权、迁移、删除）
├── Task 18: legacyFormat / 旧三段稿字段降权
├── Task 19: 兼容层只读化�?bridge 去主�?├── Task 20: 旧阈�?旧脚�?旧判定删除或隔离
├── Task 21: 迁移策略与旧项目兼容验证
└── Task 22: 文档/提示/契约口径统一

Wave FINAL（并行审计）
├── F1: 真相源一致性审�?├── F2: 生成/恢复真实链路审计
├── F3: UI 越权与展示一致性审�?├── F4: legacy 残留与旧口径清扫审计
└── F5: 性能基线与交互响应审�?
Critical Path�? �?2 �?7 �?8 �?13 �?18 �?F1-F4

### Dependency Matrix

- 1-6: None �?7-22
- 7: 1,2,3,4,5,6 �?8,9,10,11,17
- 8: 5,7 �?16,21,F2
- 9: 5,7 �?F2
- 10: 7,8 �?F2
- 11: 1,5,7 �?15,16,F2
- 12: 5,11 �?16,F3
- 13: 2,7 �?14,16,17,F3
- 14: 2,7,13 �?F3
- 15: 1,2,11 �?16,F3
- 16: 8,11,12,13,15 �?F2,F3
- 17: 6,7,13 �?F2,F3
- 18: 3,4 �?19,20,21,F4
- 19: 1,4,18 �?F4
- 20: 3,18 �?F1,F4
- 21: 8,18,19,20 �?F1,F2,F4
- 22: 1,2,3,4,5,6,20 �?F1

### Agent Dispatch Summary

- Wave 1�? agents �?deep / quick / writing（以 Task 1 为前置，1 完成�?2-5 才局部并行，6 最后接入）
- Wave 2�? agents �?deep / unspecified-high
- Wave 3�? agents �?deep / visual-engineering / unspecified-high
- Wave 4�? agents �?deep / unspecified-high / writing
- Final�? agents �?oracle / deep / unspecified-high

### Real Parallel Zones

- **真并行区�?A**：Task 2-5（Task 1 完成后局部并行）
- **真并行区�?B**：Task 8 / 9 / 11 / 12（Task 7 与各自前置完成后局部并行）
- **真并行区�?C**：Task 13-17（Task 13 先行后局部并行）
- **真并行区�?D**：Task 18-20 / 22（满足前置后局部并行）
- **非并行瓶�?*：Task 1、Task 7、Task 21、Final Wave

### Wave 2 Preparation Owner

- �?**Wave 2** 指定一个前置准备子任务（由 Task 7 负责人兼任），负责：
  - 建立旧项目样本池清单
  - 收集 `.tmp-projects.json` 与历史项目快照中的真�?legacy 形�?  - 若真实样本不足，则生�?synthetic legacy fixtures
  - 输出�?Task 21 使用的冻结候选样本池

---

## TODOs

- [x] 1. 统一“唯一真相 authority”定�?
  **What to do**:
  - 默认将唯一权威模块落到 `src/shared/domain/workflow/truth-authority.ts`（如不存在则创建），作为 stage / gate / blocked reason / resume authority 的共享入�?  - 指定唯一真相 owner：阶段、blocked reason、resume、generation status、正式事实、script runtime state 各由谁定�?  - 画出 producer / consumer / persister 边界，消灭“一字段�?owner�?  - �?authority 原则固化为代码契约与文档准则

  **Must NOT do**:
  - 不允许保留“main 一套、renderer 一套”的双权�?  - 不允许继续通过 UI store 临时状态充当真�?
  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及系统定义权、跨层边界与长期演化
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7-22
  - **Blocked By**: None

  **References**:
  - `docs/system-authority（系统定义权与主权规则）.md` - 系统主权与真相归属总原�?  - `src/main/ipc/workspace-handlers.ts` - 主进程作为权威入口的现状
  - `src/preload/index.ts` - UI 与主进程的授权边�?
  **Acceptance Criteria**:
  - [ ] 唯一权威模块路径与职责被明确，不再悬�?  - [ ] 真相 owner 清单可映射到唯一模块/函数
  - [ ] 不存在未归属的核心状态字�?  - [ ] 任意核心字段冲突都能按固定仲裁规则得出唯一胜�?
  **QA Scenarios**:

  ```
  Scenario: 权威映射完整
    Tool: Bash (rg)
    Preconditions: 仓库代码可读
    Steps:
      1. 搜索 stage / generationStatus / scriptResumeResolution / facts 的定义与写入�?      2. 校验每个字段只有一个主判定入口
      3. 记录�?owner 冲突是否清零
    Expected Result: 核心字段都能映射到唯一 owner
    Evidence: .sisyphus/evidence/task-1-authority-map.txt

  Scenario: 旧双权威残留被发�?    Tool: Bash (rg)
    Preconditions: 同上
    Steps:
      1. 搜索 renderer �?main 对同一字段的重复判�?      2. 输出剩余冲突�?    Expected Result: 剩余冲突点为 0；否则任务不通过
    Evidence: .sisyphus/evidence/task-1-authority-conflicts.txt
  ```

- [x] 2. 统一阶段、导航与 blocked reason 派生中心

  **What to do**:
  - �?stage derivation、blocked reason、recommended stage 收到 shared/main 单一派生函数
  - Renderer 只读派生结果，不再本地计算关键业务判�?  - 统一错误码与用户提示语义来源

  **Must NOT do**:
  - 不允�?UI 保留自己�?blocked reason 映射�?
  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7,13,14,15,22
  - **Blocked By**: 1

  **References**:
  - `src/renderer/src/app/utils/stage-navigation-truth.ts` - 当前 renderer 派生逻辑
  - `src/main/infrastructure/storage/project-store-core.ts` - 当前 main 派生逻辑
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts` - blocked reason 提示映射现状

  **Acceptance Criteria**:
  - [ ] stage / blocked reason 派生只剩一套实�?  - [ ] UI 不再硬编码核�?blocked reason 文案映射

  **QA Scenarios**:

  ```
  Scenario: Main/renderer 阶段一�?    Tool: Bash (rg + node)
    Steps:
      1. 对同一项目快照调用统一派生函数
      2. 校验 UI 展示源直接来自该结果
    Expected Result: 不存在两�?stage 结果
    Evidence: .sisyphus/evidence/task-2-stage-derivation.txt

  Scenario: UI 第二裁判已移�?    Tool: Bash (rg)
    Steps:
      1. 搜索 renderer �?plan.ready / blockedBy / code=== 的业务判�?      2. 校验仅剩展示逻辑
    Expected Result: 核心判定残留�?0
    Evidence: .sisyphus/evidence/task-2-ui-judge-scan.txt
  ```

- [x] 3. 统一阈值、合同与质量规则常量�?
  **What to do**:
  - 把场次数、字数、钩子、对白轮次等阈值集中到单一常量/合同�?  - 替换 audit / quality / prompt / tests 中的散落硬编�?  - 规定阈值变更必须一处改动全链生�?
  **Must NOT do**:
  - 不允�?`audit-scene-issues.ts`、测试脚本、提示词继续保留旧阈�?
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7,18,20,22
  - **Blocked By**: 1

  **References**:
  - `src/shared/domain/script/screenplay-quality.ts` - 生产质量阈�?  - `src/main/application/script-generation/audit/audit-scene-issues.ts` - 旧阈值残�?  - `测试/剧本/validate-screenplay-quality.mjs` - 非生产校验口径残�?
  **Acceptance Criteria**:
  - [ ] 场次数与字数阈值只有一处权威源
  - [ ] rg 搜索不到旧阈值硬编码残留

  **QA Scenarios**:

  ```
  Scenario: 阈值单源验�?    Tool: Bash (rg)
    Steps:
      1. 搜索 300|500|800|900|1200|1-3|2-4 等旧阈值散�?      2. 核对是否仅保留权威定义与测试引用
    Expected Result: 旧口径散点清零或仅留测试快照说明
    Evidence: .sisyphus/evidence/task-3-threshold-scan.txt

  Scenario: 统一阈值实际生�?    Tool: Bash (node)
    Steps:
      1. 用同一份样本文本分别走质量与审计函�?      2. 对比结果是否一�?    Expected Result: 同一样本不再出现双结�?    Evidence: .sisyphus/evidence/task-3-threshold-consistency.txt
  ```

- [x] 4. 统一共享 DTO 与字段语�?
  **What to do**:
  - 清理 `ScriptSegmentDto`、`ProjectGenerationStatusDto`、stage 相关类型的同名不同义
  - 明确 `screenplay` 与旧三段稿字段的主次关系
  - 明确可选字段与必填字段的真实语�?
  **Must NOT do**:
  - 不允许同一字段在不同层被不同解�?
  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7,18,22
  - **Blocked By**: 1

  **References**:
  - `src/shared/contracts/workflow.ts` - 核心 DTO 定义
  - `src/shared/contracts/generation.ts` - generation status 定义
  - `src/renderer/src/store/useStageStore.ts` - renderer 解释方式

  **Acceptance Criteria**:
  - [ ] 同一 DTO 字段语义在三层一�?  - [ ] 不存在缺�?stage 值的半残类型定义

  **QA Scenarios**:

  ```
  Scenario: 类型语义对齐
    Tool: Bash (rg)
    Steps:
      1. 搜索 ProjectGenerationStatusDto.stage、WorkflowStage、InputContractIssueDto.stage
      2. 比较允许值集�?    Expected Result: 集合一�?    Evidence: .sisyphus/evidence/task-4-stage-type-alignment.txt

  Scenario: ScriptSegment 主字段唯一�?    Tool: Bash (rg)
    Steps:
      1. 搜索 screenplay / action / dialogue / emotion 的主判断路径
      2. 校验只有一个主正文来源
    Expected Result: 主正文判断唯一
    Evidence: .sisyphus/evidence/task-4-scriptsegment-source.txt
  ```

- [x] 5. 统一 generation / resume / failure / ledger 状态模�?
  **What to do**:
  - 合并 board、resumeResolution、failureResolution、failureHistory、ledger 的职责划�?  - 规定哪些是运行态、哪些是持久态、哪些是派生�?  - 防止同一事实被多份状态重复描�?
  **Must NOT do**:
  - 不允许继续出现双来源 resume 起点

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8,9,10,11,12,16,21
  - **Blocked By**: 1

  **References**:
  - `src/main/application/script-generation/progress-board.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
  - `.tmp-projects.json` 中的 scriptProgressBoard / scriptResumeResolution / scriptFailureResolution / scriptRuntimeFailureHistory

  **Acceptance Criteria**:
  - [ ] resume 起点只有一个权威来�?  - [ ] board / failure / history 的读写是原子化策�?
  **QA Scenarios**:

  ```
  Scenario: Resume 单源验证
    Tool: Bash (rg + node)
    Steps:
      1. 追踪 resumeEpisode 的所有计算来�?      2. 验证最终只保留一条权威链
    Expected Result: 不再�?dual-source resume
    Evidence: .sisyphus/evidence/task-5-resume-single-source.txt

  Scenario: 状态原子性验�?    Tool: Bash (node)
    Steps:
      1. 模拟失败写入后读�?runtime state
      2. 校验 board/history/failure 不出现版本错�?    Expected Result: 不出现半新半旧状�?    Evidence: .sisyphus/evidence/task-5-runtime-atomicity.txt
  ```

- [x] 6. 收口所有生成入口到唯一 orchestrator

  **What to do**:
  - 统一 start / resume / rewrite / auto-continue / banner / button 入口
  - 任何入口都必须走同一 plan -> execute -> repair -> persist -> present 流程
  - 定义唯一竞争保护与并发拦�?
  **Must NOT do**:
  - 不允许不同按钮用不同 disabled/gate 逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7,10,17
  - **Blocked By**: 1,2,5

  **References**:
  - `src/renderer/src/features/script/ui/ScriptStage.tsx`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`

  **Acceptance Criteria**:
  - [ ] 所有生成入口指向同一 orchestrator
  - [ ] disabled/generationStatus 保护逻辑一�?
  **QA Scenarios**:

  ```
  Scenario: 多入口统一扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索 startScriptGeneration / handleStartGeneration / rewrite / resume 调用�?      2. 比对调用链是否统一
    Expected Result: 所有入口收口到一条主�?    Evidence: .sisyphus/evidence/task-6-entry-map.txt

  Scenario: 双击/竞争保护验证
    Tool: Bash (rg)
    Steps:
      1. 搜索 generationStatus guard 与按�?disabled 条件
      2. 校验两处按钮条件一�?    Expected Result: 不存在一处可点一处不可点的竞争窗�?    Evidence: .sisyphus/evidence/task-6-race-guard.txt
  ```

- [x] 7. 剧本生成 orchestrator 单入口化

  **What to do**:
  - 先产�?orchestrator 接口契约：输入、输出、状态机事件、失败语义、停止语义、续批语�?  - �?Wave 2 启动前冻�?orchestrator 契约版本；若后续需改契约，必须先重跑双审与下游扩散检�?  - �?renderer 崩溃 / 页面离开 / 切项目导致的续批中断纳入 orchestrator 恢复语义，确保续批意图可持久化并在重新进入时恢复
  - �?fresh_start / resume / rewrite / auto-continue 全部收口到唯一 orchestrator
  - 删除任何直达 batch / repair / persist 的旁路入�?  - 让所有入口只传上下文，不再自带独立业务判�?
  **Must NOT do**:
  - 不允许多按钮、多 hook 继续各自带一份调用链

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 1-6
  - **Blocks**: 8,9,10,11,13,14,17
  - **Blocked By**: 1,2,3,4,5,6

  **References**:
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
  - `src/main/application/script-generation/start-script-generation.ts`

  **Acceptance Criteria**:
  - [ ] orchestrator 接口契约先明确并被下游任务引�?  - [ ] orchestrator 接口契约经至�?2 个独立审查代理确认无歧义
  - [ ] renderer 中断后，续批状态不会丢失且能恢�?  - [ ] 所有剧本生成入口最终只调用一�?orchestrator
  - [ ] orchestration 内部承担 plan �?execute �?repair �?persist �?present 全链责任

  **Review Disagreement Protocol**:
  - �?2 个独立审查代理对契约结论不一致，默认视为**未通过**�?  - 必须把分歧点整理成对照清单，交由�?3 个审查代理或 oracle 做仲裁�?  - 未完成仲裁前，Task 7 不得宣告完成，Wave 2 下游任务不得启动�?
  **QA Scenarios**:

  ```
  Scenario: orchestrator 契约双审
    Tool: Task (2 review agents)
    Steps:
      1. �?orchestrator 契约提交�?2 个独立审查代�?      2. 对比输入/输出/状态机/失败语义是否有歧�?    Expected Result: 两份审查都确认契约可执行且无关键歧义
    Evidence: .sisyphus/evidence/task-7-orchestrator-contract-review.txt

  Scenario: orchestrator 契约扩散验证
    Tool: Bash (rg)
    Steps:
      1. 在契约冻结后搜索任务 8-17 �?orchestrator 输入/输出/事件的引用点
      2. 检查是否仍存在旧字段、旧事件名或未迁移调�?    Expected Result: 下游引用全部对齐冻结契约
    Evidence: .sisyphus/evidence/task-7-contract-fanout-check.txt

  Scenario: renderer 崩溃续批恢复
    Tool: Playwright / Bash
    Steps:
      1. 启动 10 集生成并�?1-5 后模拟关闭或离开 renderer
      2. 重新进入项目
      3. 检�?orchestrator 是否能从持久化续批意图恢�?6-10
    Expected Result: 不因 renderer 中断永久停在 5 �?    Evidence: .sisyphus/evidence/task-7-renderer-reconnect.txt

  Scenario: 单入口调用链验证
    Tool: Bash (rg)
    Steps:
      1. 搜索 startScriptGeneration / runScriptGenerationBatch / repairGeneratedScenes 的调用点
      2. 验证外部入口只剩 orchestrator
    Expected Result: 不存在直接旁路调�?    Evidence: .sisyphus/evidence/task-7-orchestrator-single-entry.txt

  Scenario: 入口统一后无漏网路径
    Tool: Bash (rg)
    Steps:
      1. 搜索 rewrite / resume / fresh_start 相关触发�?      2. 校验它们全部只是组装参数并调�?orchestrator
    Expected Result: 无独立业务分�?    Evidence: .sisyphus/evidence/task-7-entry-unification.txt
  ```

- [x] 8. Resume / board / failure / ledger 原子链统一

  **What to do**:
  - 合并 board、resume、failure、ledger 的保存与读取边界
  - 统一 resume 起点，只保留单源决策
  - 禁止部分状态更新成功、部分失败造成半新半旧

  **Must NOT do**:
  - 不允�?saveScriptRuntimeState �?failure history 再双写错�?
  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 10,11,16,21,F2
  - **Blocked By**: 5,7

  **References**:
  - `src/main/application/script-generation/progress-board.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`

  **Acceptance Criteria**:
  - [ ] board/resume/failure/ledger 读写具有单次提交语义
  - [ ] resumeEpisode 只有一个最终来�?
  **QA Scenarios**:

  ```
  Scenario: Runtime 状态原子�?    Tool: Bash (node)
    Steps:
      1. 模拟中断与失败恢复写�?      2. 读取 runtime state 快照
      3. 校验 board/resume/failure/ledger 版本一�?    Expected Result: 没有半新半旧状�?    Evidence: .sisyphus/evidence/task-8-runtime-atomicity.txt

  Scenario: Resume 单源
    Tool: Bash (rg)
    Steps:
      1. 搜索 resumeEpisode / resumeStartEpisode 计算�?      2. 校验只剩一个最终裁决函�?    Expected Result: dual-source 清零
    Evidence: .sisyphus/evidence/task-8-resume-source.txt
  ```

- [x] 9. 吞错、假绿与部分成功落盘彻底收口

  **What to do**:
  - 让所有失败都显式进入 failure 语义，不允许静默 fallback 假装成功
  - 清理 partial-success append/save 路径
  - 统一 store verify 失败、repair 失败、parse 失败、runtime 失败的错误传�?  - 明确定义“假�?吞错”代码模式，并建立主链禁止清�?
  **Must NOT do**:
  - 不允�?catch 后只�?debug 文件、不回传失败

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2
  - **Blocked By**: 5,7

  **References**:
  - `src/main/application/script-generation/repair/execute-script-repair.ts`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`
  - `src/main/infrastructure/storage/project-store.ts`

  **Acceptance Criteria**:
  - [ ] 失败不会再导�?scriptDraft 被错误追�?  - [ ] 所有失败都有一致的 error surface
  - [ ] 主链不再出现定义内的“假�?吞错”模�?
  **QA Scenarios**:

  ```
  Scenario: 假绿/吞错模式扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索 `catch(() => undefined|null|{})`、空 catch、仅 debug 不抛错、success=false �?append/save 等模�?      2. 校验主链已清�?    Expected Result: 定义内的假绿/吞错模式在主链为 0
    Evidence: .sisyphus/evidence/task-9-falsegreen-patterns.txt

  Scenario: 失败不假�?    Tool: Bash (node / runtime mock)
    Steps:
      1. 构�?repair 失败�?parse 失败
      2. 校验 UI 显示失败、磁盘不追加、history 增加
    Expected Result: 失败只失�?    Evidence: .sisyphus/evidence/task-9-false-green.txt

  Scenario: 吞错扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索 catch(() => undefined|null|{}) 与空 catch
      2. 验证主链关键路径中吞错已清零
    Expected Result: 主链无吞�?    Evidence: .sisyphus/evidence/task-9-swallow-scan.txt
  ```

- [x] 10. 自动续批、停止、重写与继续行为统一

  **What to do**:
  - 统一 5 集写作单元与 10 集目标之间的续批编排
  - 明确续批触发条件：上一�?*成功通过真实验收�?*才进入下一批；若失败则停在失败批次，不自动越过
  - 明确批次语义�?-5�?-10 是独立批次，但共享同一 orchestrator 会话与统一 board
  - 明确失败语义：若 6-10 失败�?-5 作为已通过批次保留，失败批次不得假绿落�?  - �?stop / rewrite / resume / continue 使用同一状态机
  - 明确“暂停”“失败”“完成”“可继续”的唯一语义

  **Must NOT do**:
  - 不允�?UI 只显示“可继续”但系统不自�?不一致地执行

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2
  - **Blocked By**: 7,8

  **References**:
  - `src/main/application/script-generation/plan/resolve-runtime-profile.ts`
  - `src/main/application/script-generation/runtime/run-script-generation-batch.ts`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`

  **Acceptance Criteria**:
  - [ ] 请求 10 集时，系统自动推�?1-5 �?6-10
  - [ ] 停止/重写/继续不会出现双语义冲�?
  **QA Scenarios**:

  ```
  Scenario: 10 集自动续�?    Tool: Bash / Playwright
    Steps:
      1. �?10 集大纲触�?fresh_start
      2. 观察 1-5 完成后自动进�?6-10
    Expected Result: 不再停在 5 集等待人工接�?    Evidence: .sisyphus/evidence/task-10-auto-continue.txt

  Scenario: 停止后状态正�?    Tool: Bash / Playwright
    Steps:
      1. 生成中点�?stop
      2. 检�?UI/board/resume/failure 显示
    Expected Result: 停止状态一致且可解�?    Evidence: .sisyphus/evidence/task-10-stop-state.txt
  ```

- [x] 11. 保存链与事务边界统一

  **What to do**:
  - 统一 saveScriptDraft / saveRuntimeState / saveFailureHistory / saveGenerationStatus 的事务边�?  - 让磁盘真相返回后再更�?renderer，不再双写漂�?  - 规定 verify 失败必须失败，不允许返回伪成�?
  **Must NOT do**:
  - 不允许先�?store 再异步碰碰运气保�?
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12,15,16,F2
  - **Blocked By**: 1,5,7

  **References**:
  - `src/main/infrastructure/storage/project-store-core.ts`
  - `src/main/infrastructure/storage/project-store.ts`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`

  **Acceptance Criteria**:
  - [ ] save 成功�?UI 才更新核心真�?  - [ ] verify 失败不再返回 success

  **QA Scenarios**:

  ```
  Scenario: 持久化先�?UI 更新
    Tool: Bash (rg + node)
    Steps:
      1. 检�?save 调用�?store 更新顺序
      2. 验证核心路径先持久化后展�?    Expected Result: 无乐观更新污染真�?    Evidence: .sisyphus/evidence/task-11-save-order.txt

  Scenario: verify 失败不伪成功
    Tool: Bash (node)
    Steps:
      1. 模拟 store verify 失败
      2. 检查调用方收到失败而非 project 对象
    Expected Result: 无伪成功
    Evidence: .sisyphus/evidence/task-11-verify-failure.txt
  ```

- [x] 12. hydration 与运行态读取链去阻塞、去多源

  **What to do**:
  - 进入项目时避免多次重 set、多轮空态、重�?normalize
  - �?hydration 的中间态限制为只读过渡，不参与业务误判
  - �?UI 打开项目时尽快可交互且不显示伪空�?
  **Must NOT do**:
  - 不允许先清空 script/detailedOutline 再晚到恢复造成 UI 误判

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 16,F3
  - **Blocked By**: 5,11

  **References**:
  - `src/renderer/src/store/useStageStore.ts`
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`
  - `src/renderer/src/app/shell/ProjectShell.tsx`

  **Acceptance Criteria**:
  - [ ] 进入项目�?UI 不再出现明显空白/假空�?  - [ ] hydration 中间态不参与 stage/gate 误判

  **QA Scenarios**:

  ```
  Scenario: 项目打开响应性验�?    Tool: Playwright
    Steps:
      1. 打开包含完整剧本的大项目
      2. 观察首屏交互时间与内容稳定�?    Expected Result: 可快速交互，且不出现先空后有
    Evidence: .sisyphus/evidence/task-12-project-open.txt

  Scenario: hydration 误判扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索 hydration 期间会触�?stage/gate 的依赖链
      2. 验证中间态不会触发业务拒�?    Expected Result: hydration 不参与核心误�?    Evidence: .sisyphus/evidence/task-12-hydration-gates.txt
  ```

- [x] 13. Script UI �?plan.ready / blocked reason 决策�?
  **What to do**:
  - 删除 Script 页对 ready / blockedBy / blocked code 的主判断
  - �?Script 页只消费主进�?共享派生结果
  - 统一按钮状态、提示文案、运行态展示来�?
  **Must NOT do**:
  - 不允�?ScriptStage / hook 再硬编码 blocked code 文案

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 14,16,17,F3
  - **Blocked By**: 2,7

  **References**:
  - `src/renderer/src/features/script/ui/ScriptStage.tsx`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`

  **Acceptance Criteria**:
  - [ ] Script UI 不再自行判断 plan.ready
  - [ ] blocked reason 文案来自统一权威�?
  **QA Scenarios**:

  ```
  Scenario: Script UI 去裁判化
    Tool: Bash (rg)
    Steps:
      1. 搜索 ScriptStage / hook 中的 plan.ready、blockedBy、code===
      2. 验证只剩展示逻辑
    Expected Result: 第二裁判口清�?    Evidence: .sisyphus/evidence/task-13-script-ui-authority.txt

  Scenario: 按钮语义统一
    Tool: Playwright
    Steps:
      1. 检查不同生成按钮在相同状态下 enable/disable 是否一�?      2. 校验点击后都走同一行为
    Expected Result: 无按钮分裂语�?    Evidence: .sisyphus/evidence/task-13-button-consistency.txt
  ```

- [x] 14. DetailedOutline / Chat / Home 去第二裁判口

  **What to do**:
  - 删除详细大纲页、聊天页、首页对 stage/gate/完成度的独立业务判断
  - 保留展示逻辑，但关键结论全部来自统一派生

  **Must NOT do**:
  - 不允许首页自己讲“项目可从第几集恢复”却和主链不一�?
  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F3
  - **Blocked By**: 2,7,13

  **References**:
  - `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts`
  - `src/renderer/src/features/chat/ui/ChatStage.tsx`
  - `src/renderer/src/features/home/ui/useHomePageActions.ts`

  **Acceptance Criteria**:
  - [ ] 这三页只展示，不再主裁决
  - [ ] 同一项目在三页展示的阶段/blocked/resume 结论一�?
  **QA Scenarios**:

  ```
  Scenario: 跨页面结论一�?    Tool: Playwright
    Steps:
      1. 同一项目分别进入首页/详纲/剧本�?      2. 对比 stage/gate/resume 文案
    Expected Result: 无跨页冲�?    Evidence: .sisyphus/evidence/task-14-cross-page-consistency.txt

  Scenario: 第二裁判口扫�?    Tool: Bash (rg)
    Steps:
      1. 搜索 filledCount、canGenerate、plan.ready 等本地判�?      2. 验证只剩展示型派�?    Expected Result: 第二裁判口清�?    Evidence: .sisyphus/evidence/task-14-ui-judge-scan.txt
  ```

- [x] 15. setStage / store mutation 收权到主进程确认�?
  **What to do**:
  - 建立 stage 切换与核心状态修改的授权通道
  - 清理 renderer 直接 setStage / setStore 后再保存的越权顺�?  - 对乐观更新增加回滚或彻底取消

  **Must NOT do**:
  - 不允许核心真相先�?UI、后碰碰运气存盘

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16,F3
  - **Blocked By**: 1,2,11

  **References**:
  - `src/renderer/src/app/store/useWorkflowStore.ts`
  - `src/renderer/src/app/sidebar/AppSidebar.tsx`
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`

  **Acceptance Criteria**:
  - [ ] stage 切换与核心状态落盘都经过主进程确认链
  - [ ] 无回滚能力的乐观更新从主链移�?
  **QA Scenarios**:

  ```
  Scenario: 越权切页清零
    Tool: Bash (rg)
    Steps:
      1. 搜索 setStage( 与核心数�?setter 的直接调用点
      2. 验证核心路径都改为授权调�?    Expected Result: 无越权切�?写状态主链残�?    Evidence: .sisyphus/evidence/task-15-stage-write-authority.txt

  Scenario: 保存失败不污�?UI
    Tool: Playwright / Bash
    Steps:
      1. 模拟保存失败
      2. 检�?UI 是否回滚或保持旧真相
    Expected Result: UI 不会显示未持久化的真�?    Evidence: .sisyphus/evidence/task-15-save-rollback.txt
  ```

- [x] 16. UI runtime 展示与真实状态对�?
  **What to do**:
  - 统一 board、resume、failurePreview、generationStatus 的显示来�?  - 修掉“UI �?存储无”“存储有/UI 无”“刷新后才出现”的状态错�?
  **Must NOT do**:
  - 不允�?defer/hydration 造成 UI 假空或假成功

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F2,F3
  - **Blocked By**: 8,11,12,13,15

  **References**:
  - `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`
  - `src/renderer/src/features/script/ui/ScriptStage.tsx`
  - `.tmp-projects.json` 对应 runtime 字段

  **Acceptance Criteria**:
  - [ ] 刷新、切项目、失败、恢复后 UI 与持久化状态一�?  - [ ] 不再出现“写了但看不到”或“看到了但没存”的错位

  **QA Scenarios**:

  ```
  Scenario: 刷新后一致�?    Tool: Playwright
    Steps:
      1. 生成一批剧本后刷新页面
      2. 比较 UI 与持久化状�?    Expected Result: 状态完全一�?    Evidence: .sisyphus/evidence/task-16-refresh-alignment.txt

  Scenario: 切项目后一致�?    Tool: Playwright
    Steps:
      1. 生成中切到另一个项目再切回
      2. 检�?scenes / generationStatus / resume 是否一�?    Expected Result: �?UI 丢场次或错状�?    Evidence: .sisyphus/evidence/task-16-project-switch.txt
  ```

- [x] 17. 多入口统一为同一调用链与同一按钮语义

  **What to do**:
  - 对“开始写”“继续生成”“重写本轮”“首�?banner 恢复”等入口统一语义
  - 确保 disabled、文案、状态判断一�?
  **Must NOT do**:
  - 不允许一个按钮受 generationStatus 保护，另一个没�?
  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F2,F3
  - **Blocked By**: 6,7,13

  **References**:
  - `src/renderer/src/features/script/ui/ScriptStage.tsx`
  - `src/renderer/src/features/home/ui/ProjectGenerationBanner.tsx`

  **Acceptance Criteria**:
  - [ ] 所有生成相关按钮语义一�?  - [ ] 无入口绕�?generationStatus / plan gate

  **QA Scenarios**:

  ```
  Scenario: 多按钮一致�?    Tool: Playwright
    Steps:
      1. 分别点击不同生成入口
      2. 观察行为与状态变�?    Expected Result: 行为完全一�?    Evidence: .sisyphus/evidence/task-17-button-unification.txt

  Scenario: disabled 条件扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索所有生成按�?disabled 逻辑
      2. 对比 guard 条件
    Expected Result: 条件统一
    Evidence: .sisyphus/evidence/task-17-disabled-scan.txt
  ```

- [x] 18. legacyFormat / 旧三段稿字段降权

  **What to do**:
  - �?legacyFormat 只作为迁�?显示辅助，不再决�?repair / audit / gate
  - 明确 screenplay 为主正文，旧三段稿只做转换输�?
  **Must NOT do**:
  - 不允�?legacyFormat 优先级高于质量比�?
  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 19,20,21,F4
  - **Blocked By**: 3,4

  **References**:
  - `src/shared/domain/script/screenplay-repair-guard.ts`
  - `src/main/application/script-generation/repair/parse-ai-repaired-scene.ts`
  - `src/renderer/src/store/useStageStore.ts`

  **Acceptance Criteria**:
  - [ ] legacyFormat 不再决定主链行为
  - [ ] screenplay 成为唯一正文真相

  **QA Scenarios**:

  ```
  Scenario: legacy 决策权清�?    Tool: Bash (rg)
    Steps:
      1. 搜索 legacyFormat 参与 if/return/guard 的主链分�?      2. 验证只剩迁移/展示用�?    Expected Result: 主链�?legacy 决策
    Evidence: .sisyphus/evidence/task-18-legacy-authority.txt

  Scenario: 正文唯一源验�?    Tool: Bash (node)
    Steps:
      1. 构造含 screenplay 与旧三段稿字段的样本
      2. 验证系统主判断只�?screenplay
    Expected Result: 正文唯一源成�?    Evidence: .sisyphus/evidence/task-18-screenplay-source.txt
  ```

- [x] 19. 兼容层只读化�?bridge 去主�?
  **What to do**:
  - �?migration / read-repair / compatible bridge 限制为迁移、读取修复、只读过�?  - 禁止 compatibility 路径回写主链并主导运行时决策

  **Must NOT do**:
  - 不允�?bridge 再决定生成结果、恢复结果或 UI 主判�?
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 21,F4
  - **Blocked By**: 1,4,18

  **References**:
  - `src/main/infrastructure/storage/project-store-migration.ts`
  - `src/main/infrastructure/storage/project-store-read-repair.ts`

  **Acceptance Criteria**:
  - [ ] 兼容层不再写主数据决定主行为
  - [ ] migration/read-repair 失败不会静默污染主链

  **QA Scenarios**:

  ```
  Scenario: bridge 写回扫描
    Tool: Bash (rg)
    Steps:
      1. 搜索 legacy/compatible/fallback 模块中的 write/update/mutate
      2. 验证仅保留迁移或隔离场景
    Expected Result: �?bridge 主导写回
    Evidence: .sisyphus/evidence/task-19-bridge-writeback.txt

  Scenario: 兼容层只读职责验�?    Tool: Bash (node)
    Steps:
      1. 运行旧项目加载路�?      2. 检查兼容层是否仅转换，不主导业务结�?    Expected Result: 兼容层只读化成立
    Evidence: .sisyphus/evidence/task-19-bridge-readonly.txt
  ```

- [x] 20. 旧阈值、旧脚本、旧判定删除或隔�?
  **What to do**:
  - 删除废弃但仍生效的旧阈值、旧 audit 判定、旧提示口径
  - 无法立即删除的，隔离到不影响主链的遗留区

  **Must NOT do**:
  - 不允许旧口径继续参与当前生成/验收

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 21,22,F1,F4
  - **Blocked By**: 3,18

  **References**:
  - `src/main/application/script-generation/audit/audit-scene-issues.ts`
  - `测试/剧本/validate-screenplay-quality.mjs`
  - `src/main/application/script-generation/prompt/create-script-generation-prompt.ts`

  **Acceptance Criteria**:
  - [ ] 主链 rg 不再扫出旧阈�?旧判定残�?  - [ ] 旧脚�?旧提示被迁出主链或删�?
  **QA Scenarios**:

  ```
  Scenario: 旧口径残留扫�?    Tool: Bash (rg)
    Steps:
      1. 搜索 1-3场�?00-900、旧 blocked 文案等残�?      2. 验证主链中不存在
    Expected Result: 旧口径不再生�?    Evidence: .sisyphus/evidence/task-20-old-rules-scan.txt

  Scenario: 主链隔离验证
    Tool: Bash (rg)
    Steps:
      1. 检查遗留文件是否仍被主�?import
      2. 验证孤立或删�?    Expected Result: 旧逻辑不再被主链引�?    Evidence: .sisyphus/evidence/task-20-import-isolation.txt
  ```

- [x] 21. 迁移策略与旧项目兼容验证

  **What to do**:
  - �?Wave 2 开始就并行收集旧项目样本，不等�?Wave 4 才启动样本准�?  - 提前建立旧项目样本池（正常样本、半旧半新样本、损坏样本）作为迁移验证前置资产
  - 定义迁移冻结窗口：进�?Wave 4 前冻结迁移规则和样本池，不允许边迁移边改合同
  - �?`.tmp-projects.json` 或现成旧样本不足，先生成并固�?synthetic legacy fixtures，再允许进入正式迁移验证
  - 制定旧项目进入新真相系统的迁移规�?  - 明确一次性迁移、懒迁移、失败回退与只读降级策�?
  **Must NOT do**:
  - 不允许旧项目在升级后悄悄变成错误真相

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1,F2,F4
  - **Blocked By**: 8,18,19,20

  **References**:
  - `src/main/infrastructure/storage/project-store-migration.ts`
  - `src/main/infrastructure/storage/project-store-read-repair.ts`
  - `.tmp-projects.json` 旧项目样�?
  **Acceptance Criteria**:
  - [ ] 迁移验证前已具备覆盖主要 legacy 形态的样本�?  - [ ] Wave 4 开始前迁移规则、样本池、回退策略已冻�?  - [ ] 若真实旧样本不足，synthetic fixtures 已补齐并通过审查
  - [ ] 旧项目升级后 stage / resume / script / facts 解释正确
  - [ ] 失败迁移可回退或显式阻�?
  **QA Scenarios**:

  ```
  Scenario: 冻结窗口验证
    Tool: Bash (read + rg)
    Steps:
      1. 检�?Wave 4 开始时迁移规则版本与样本池清单
      2. 验证执行期间无新增未审样本直接混�?    Expected Result: 迁移窗口冻结成立
    Evidence: .sisyphus/evidence/task-21-freeze-window.txt

  Scenario: 旧项目升级验�?    Tool: Bash (node)
    Steps:
      1. 载入旧版本项目快�?      2. 执行迁移与统一派生
      3. 校验关键状�?    Expected Result: 旧项目可正确进入新链�?    Evidence: .sisyphus/evidence/task-21-legacy-project-migration.txt

  Scenario: 迁移失败可解�?    Tool: Bash (node)
    Steps:
      1. 构造损坏旧项目
      2. 执行迁移
      3. 检查回退或阻断信�?    Expected Result: 无静默损�?    Evidence: .sisyphus/evidence/task-21-migration-failure.txt
  ```

- [x] 22. 文档、提示与契约口径统一

  **What to do**:
  - 采用伴随式同步：每完成一个任务，同步对应文档/提示/契约，而不是全部堆到最�?  - 在每�?wave 结束时执行一�?wave-end 文档对齐检查，Task 22 负责最终总收口而不是从零开始补文档
  - 对齐 system-authority、workflow、提示词、验收说明、计划文档中的术语与口径
  - 防止文档口径继续反向污染代码决策

  **Must NOT do**:
  - 不允许文档仍写旧口径、代码执行新口径

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1
  - **Blocked By**: 1,2,3,4,5,6,20

  **References**:
  - `docs/system-authority（系统定义权与主权规则）.md`
  - `AGENTS.md`
  - `src/shared/contracts/*.ts`

  **Acceptance Criteria**:
  - [ ] 文档与代码中的术语、阈值、阶段定义一�?  - [ ] 不存在文档引导用户走旧链路的描述

  **QA Scenarios**:

  ```
  Scenario: 文档代码口径对齐
    Tool: Bash (rg)
    Steps:
      1. 搜索文档和代码中的核心术语与阈�?      2. 对比是否一�?    Expected Result: 无术�?阈值分�?    Evidence: .sisyphus/evidence/task-22-doc-contract-alignment.txt

  Scenario: 旧口径文档清�?    Tool: Bash (rg)
    Steps:
      1. 搜索�?blocked 文案、旧阈值、旧阶段�?      2. 验证文档中已清理
    Expected Result: 文档无旧口径残留
    Evidence: .sisyphus/evidence/task-22-doc-cleanup.txt

  Scenario: 文档一致性命令验�?    Tool: Bash (rg)
    Steps:
      1. 运行 `rg "1-3场|300-900|500字|�?blocked|legacyFormat.*主判" docs src`
      2. 运行 `rg "ProjectGenerationStatusDto.stage|WorkflowStage|InputContractIssueDto.stage" src/shared src/main src/renderer`
      3. 对照输出是否仍有旧口径残留或 stage 集合分裂
    Expected Result: 主链与主文档不再出现旧口径关键词；stage 类型集合一�?    Evidence: .sisyphus/evidence/task-22-doc-grep-proof.txt
  ```

---

## Rollback & Abort Criteria

- 任一波次若出现“同一核心字段新增第二 owner”，立即停止后续波次，先回滚该波次设计�?- 任一整改若导致旧项目无法读取且无显式迁移阻断说明，视为失败，不得继续扩大修改面�?- 若主�?typecheck/build 失败，当前波次不得继续向后推进�?- �?UI 去裁判化后出现用户无法完成原有主流程，必须先恢复可用性，再继续收权�?- �?legacy 清理导致真实链路缺字�?缺数据，必须先补迁移映射，不允许直接硬删�?- Final Wave 任一审计 reject，则整轮整改不得宣告完成�?
### Final Wave Rejection Granularity

- **F1 reject**：回退�?Wave 1，重新收�?authority / contract / type 设计；Wave 2-4 不得继续叠补丁�?- **F2 reject**：保�?Wave 1，但回退�?Wave 2 重新修生�?恢复/失败/事务链�?- **F3 reject**：保�?Wave 1-2，回退 Wave 3 �?UI 收权与展示对齐调整�?- **F4 reject**：保�?Wave 1-3，回退 Wave 4 �?legacy 清扫与迁移策略�?- **F5 reject**：保留正确性整改，但不得合并发布；必须先修性能/交互回退后再重审�?
### Multi-Reject Priority Rule

- �?**F1** 与其他审计同�?reject，以 **F1** 为最高优先级，先回到 Wave 1 收口 authority�?- 若无 F1，但 **F2** �?F3/F4/F5 同时 reject，以 **F2** 为优先级最高，先修执行链�?- 若仅 **F3 / F4 / F5** 同时 reject，按 **F3 �?F4 �?F5** 顺序处理：先保住 UI 可用性，再清 legacy，最后收性能�?
### Cross-Task Handoff Checks

- **1 �?2**：authority map �?owner 清单落地后，Task 2 才能绑定统一派生中心�?- **2 �?7**：stage / blocked reason 单一派生函数可调用后，orchestrator 才能接入统一 gate�?- **5 �?8**：状态模型归类完成后，原子链统一才允许开始�?- **7 �?13**：唯一 orchestrator 成立后，UI 去裁判化才允许切断本地业务判断�?- **18 �?21**：legacy 降权完成后，旧项目迁移验证才有意义�?
### Wave Gates

- **Wave 2 启动门禁**：Task 1-6 全部通过 typecheck/build + authority/contract/gate QA 后方可进入�?- **Wave 3 启动门禁**：Task 7-12 完成�?fresh_start / resume / rewrite 三条主链都能跑通后方可进入�?- **Wave 4 启动门禁**：Task 1-17 完成，且迁移规则版本、样本池、回退策略冻结后方可进入�?
### UI Rollback Smoke Gate

- �?Wave 3 每次大改后，必须执行一�?**Playwright 自动烟测**：打开项目 �?切换 outline / detailed_outline / script �?点击生成入口 �?返回首页�?- 若脚本化烟测失败，则视为 UI 回退门禁失败，必须先修复可用性，再继�?Wave 3�?
  **What to do**:
  - �?Wave 2-4 逐项实施，覆盖恢复链、吞错、落盘事务、hydration、UI 展示、越权切页、legacy bridge、旧口径删除、文档同�?  - 每项都必须先删重复判断，再建立唯一权威调用

  **Must NOT do**:
  - 不允许只“再包一层”，但旧逻辑还留着继续�?
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2-4
  - **Blocks**: Final wave
  - **Blocked By**: 1-6

  **References**:
  - `src/main/application/script-generation/start-script-generation.ts`
  - `src/main/application/script-generation/runtime/run-script-generation-batch.ts`
  - `src/main/application/script-generation/repair/execute-script-repair.ts`
  - `src/main/application/script-generation/audit/audit-scene-issues.ts`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`
  - `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts`
  - `src/renderer/src/features/home/ui/useHomePageActions.ts`
  - `src/main/infrastructure/storage/project-store-core.ts`
  - `src/main/infrastructure/storage/project-store-migration.ts`
  - `src/main/infrastructure/storage/project-store-read-repair.ts`

  **Acceptance Criteria**:
  - [ ] 旧逻辑不再执行，只保留迁移/只读兼容
  - [ ] UI 展示与磁�?主进程状态一�?  - [ ] �?partial-success append / swallow-error / duplicate judge

  **QA Scenarios**:

  ```
  Scenario: 失败不假�?    Tool: Bash (node / runtime mock)
    Steps:
      1. 构造生成失败场�?      2. 校验 scriptDraft 未追加、UI 状态为失败、failure history 增加
    Expected Result: 失败只失败，不落假成功数�?    Evidence: .sisyphus/evidence/task-9-false-green.txt

  Scenario: UI 去裁判化
    Tool: Bash (rg)
    Steps:
      1. 搜索 renderer �?ready / blockedBy / code=== / setStage 的越权判�?      2. 验证仅剩展示与触发调�?    Expected Result: UI 第二裁判口清�?    Evidence: .sisyphus/evidence/task-13-ui-authority.txt

  Scenario: legacy 不再主导
    Tool: Bash (rg)
    Steps:
      1. 搜索 legacyFormat / fallback / compatible / segments 注释字段的决策分�?      2. 验证主链中只剩迁移或只读兼容
    Expected Result: legacy 不再决定主行�?    Evidence: .sisyphus/evidence/task-18-legacy-authority.txt
  ```

---

## Final Verification Wave

- [x] F1. **真相源一致性审�?* �?`oracle`
      检查阶段、blocked reason、resume、generationStatus、facts、ledger 的唯一 owner 是否成立。对同一项目快照比较 main / renderer / shared 输出，任何分歧直接拒绝�?
- [x] F2. **生成/恢复真实链审�?* �?`deep`
      �?fresh_start、resume、rewrite、stop 四条路径真实执行，验证所有入口都走同一 orchestrator�?0 集请求不会在 5 集后静默停住，失败不会假绿�?
- [x] F3. **UI 权限与展示一致性审�?* �?`unspecified-high`
      审核所�?UI 页面�?hooks，确认不再二次裁判、不再越权切�?写状态，且展示与磁盘/主进程状态一致�?
- [x] F4. **legacy / 旧口径清扫审�?* �?`deep`
      搜索旧阈值、legacyFormat 主判断、旧三段稿兜底主逻辑、segments 废弃字段主链使用。存在任一残留�?reject�?
- [x] F5. **性能基线与交互响应审�?* �?`unspecified-high`
      基于真实项目快照执行：打开项目、切�?stage、开始生成、停止生成。记录首屏可交互时间、切页响应时间、项目打开后是否出现明显假空态或冻结。若统一真相后引入严重响应退化，�?reject�?
---

## Commit Strategy

- **1**: `refactor(truth): centralize stage and gate authority`
- **2**: `refactor(generation): unify orchestrator and resume pipeline`
- **3**: `refactor(ui): remove renderer-side judging and unauthorized writes`
- **4**: `cleanup(legacy): retire stale rules and compatibility authority`
- **5**: `docs(contracts): align system authority and workflow rules`

---

## Success Criteria

### Verification Commands

```bash
npm run typecheck   # Expected: pass
npm run build       # Expected: pass
rg "plan\.ready|blockedBy\[0\]|legacyFormat|script_formal_fact_missing" src/renderer src/main src/shared
```

### Final Checklist

- [ ] 同一事实只有一个权威定�?- [ ] 同一 gate 只有一个权威裁�?- [ ] 同一恢复链只有一个权威状态源
- [ ] UI 不再决定核心业务真假
- [ ] legacy 不再影响主行�?- [ ] 生成内容与用户确认需求的承接链可被审计证�?