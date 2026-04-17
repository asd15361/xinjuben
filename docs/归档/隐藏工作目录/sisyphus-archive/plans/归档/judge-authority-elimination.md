# 裁判口根除与单一事实收权计划

## TL;DR

> **Quick Summary**：把“别卡住用户”的本地兜底逻辑从系统里连根拔掉，建立 **main / orchestrator 唯一解释权**。当权威链拿不到事实时，系统必须显式报错，而不是 renderer、本地 hook、页面组件或旧兼容层自己拍板。
>
> **Deliverables**：
>
> - 所有 stage / generation / resume / blocked reason 的本地 fallback 裁判口删除
> - Script generation live path 真正收口到唯一 orchestrator
> - 错误表面统一：失败就报错，不再静默推进或本地伪成功
> - 旧项目兼容链改成“迁移 / 显式报错 / 只读解释”，不再继续本地兜底
>
> **Estimated Effort**：Large
> **Parallel Execution**：YES - 4 waves
> **Critical Path**：authority contract 固化 → stage fallback 清除 → orchestrator 接管 live path → 错误表面统一 → 最终核验

---

## Context

### Original Request

用户明确要求彻底解决以下历史兜底模式：

- “项目不存在就先切过去”
- “IPC 失败就先本地显示”
- “拿不到返回值就先用 targetStage”
- “为了提示更顺滑，先本地更新一下”
- “为了兼容旧项目，先 fallback 一层”

用户不接受继续保留本地兜底。要求是：**错了就报错**，而不是让一个事实被 3-4 个地方重复解释。

### Interview Summary

**Key Discussions**：

- 当前问题不是单点 bug，而是历史上为了“别卡住用户”形成的分布式第二裁判口。
- renderer 里仍残留 stage fallback；main/runtime 侧则存在 orchestrator 文件存在但 live path 未真正接线的风险。
- 用户目标不是“减轻一点重复判断”，而是彻底回收 authority，宁可报错也不允许兜底拍板。

**Research Findings**：

- `ProjectGenerationBanner.tsx`、`OutlineStage.tsx` 等仍存在 IPC 失败后本地 `setStage(...)` 行为。
- `script-generation-runtime-handlers.ts` 当前 live path 证据显示仍是 handler → worker → `startScriptGeneration`，而不是明确走 `ScriptOrchestrator.execute()`。
- `audit-policy.ts`、`progression-policy.ts` 已大体完成 legacy 降权；当前主要矛盾是 authority 和 fallback，不是 legacy 主判定。

### Manual Gap Review

> 注：已尝试发起 Metis 复核，但受当前根会话 descendant 上限阻塞，改为人工补缺审阅。

**Identified Gaps（已纳入计划）**：

- 必须区分“显示同步”与“业务拍板”——renderer 可以显示 main 结果，但不能在 main 失败时自作主张。
- 必须锁死范围——本计划只处理 authority / fallback / error-surface / orchestrator 接线，不扩展新功能。
- 必须明确旧项目兼容策略——兼容只能是迁移或显式错误，不能借兼容继续保留第二裁判口。
- 必须补足 acceptance criteria——要求通过 grep / LSP / 运行链验证来证明“不再兜底”。

---

## Work Objectives

### Core Objective

把 stage、generation、resume、blocked reason 等核心业务事实的解释权收口到唯一权威链；删除 renderer / helper / IPC error fallback 里的本地裁判逻辑，保证“拿不到权威结果就报错”。

### Concrete Deliverables

- stage 跳转相关 renderer 路径不再在 IPC 失败时本地 `setStage`
- script generation 启动/停止/续跑/重写 live path 明确接入唯一 orchestrator
- 统一错误 DTO / UI notice / runtime task 错误语义
- 旧项目兼容链不再使用本地 fallback 模拟成功

### Definition of Done

- [x] 全仓 grep 不再出现 authority 相关 `catch { setStage(...) }` / `if (!result.project) setStage(...)` 类模式（允许纯 UI 非业务导航例外并注明）
- [x] `workflow:start-script-generation` / stop / resume / rewrite 真实运行链能追到唯一 orchestrator
- [x] 权威链失败时 UI 呈现显式错误，不推进 stage、不伪造 generation 成功
- [x] 旧项目兼容失败会阻断并给出明确错误，而不是 fallback 进入下游

### Must Have

- main / orchestrator 是唯一业务 truth producer
- renderer 仅消费 authority 结果和错误
- 所有 fallback 删除后仍能给出可理解错误表面

### Must NOT Have (Guardrails)

- 不新增功能，不顺手重做无关 UI
- 不保留“为了更顺滑”而做的乐观核心状态更新
- 不允许 handler、worker、renderer 各自维护独立业务真相
- 不允许“project 不存在 / result 缺失 / IPC 失败”时继续推进 stage 或 generation

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 全部验证由执行代理完成。

### Test Decision

- **Infrastructure exists**：YES
- **Automated tests**：Tests-after
- **Framework**：TypeScript typecheck + targeted app/runtime verification

### QA Policy

每个任务都必须验证两个方向：

1. **Happy path**：authority 正常返回时，UI/运行链正确消费该结果
2. **Failure path**：authority 不可用、项目缺失、返回不完整时，系统显式报错且**不再本地推进**

证据统一保存到：`.sisyphus/evidence/task-{N}-{scenario}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1（Authority Contract + Search Lockdown）
├── Task 1: 统一“无 authority 不推进”错误宪法
├── Task 2: 建立 fallback-pattern 搜索基线
├── Task 3: 盘点并标注 renderer stage fallback 热点
├── Task 4: 盘点并标注 generation live path 真实入口
└── Task 5: 统一 authority error DTO / notice contract

Wave 2（Renderer 裁判口清除，最大并行）
├── Task 6: 清除 Banner / Header / Sidebar 类导航 fallback
├── Task 7: 清除 Chat / Outline / Character 页面 fallback
├── Task 8: 清除 DetailedOutline / Script 页面残留 fallback
├── Task 9: 清除 hooks / action helpers 中本地拍板逻辑
└── Task 10: 去掉 generationStatus / stage 的乐观核心状态更新

Wave 3（Main / Runtime 收口）
├── Task 11: 让 start/resume/rewrite 真正接入 orchestrator
├── Task 12: 让 stop/pause/continue 统一走 orchestrator 控制面
├── Task 13: 统一 runtime 持久化与错误表面，禁止伪成功
└── Task 14: 旧项目兼容改成迁移/阻断/显式报错

Wave 4（收尾与防回潮）
├── Task 15: grep/AST 门禁化 authority anti-pattern
├── Task 16: 文档与约束同步（authority rule / error semantics）
└── Task 17: 补充针对 authority failure 的回归测试/脚本

Wave FINAL
├── F1: Authority residue audit
├── F2: Live-path orchestrator audit
├── F3: Failure-surface QA
└── F4: Scope fidelity + anti-fallback audit
```

### Dependency Matrix

- **1-5**：无前置，阻塞 6-14
- **6-10**：依赖 1,2,3,5，阻塞 15,17
- **11-14**：依赖 1,4,5，阻塞 15,17
- **15-17**：依赖 6-14，阻塞 FINAL
- **FINAL**：依赖全部任务

### Agent Dispatch Summary

- **Wave 1**：T1 `deep`，T2-T5 `quick/unspecified-high`
- **Wave 2**：T6-T10 `quick` + `unspecified-high`
- **Wave 3**：T11-T14 `deep` / `unspecified-high`
- **Wave 4**：T15 `quick`，T16 `writing`，T17 `unspecified-high`
- **FINAL**：F1 `oracle`，F2 `deep`，F3 `unspecified-high`，F4 `deep`

---

## TODOs

- [x] 1. 定义“无 authority 不推进”的硬规则与错误宪法

  **What to do**:
  - 明确哪些事实只能由 main / orchestrator 生产：stage、generation status、resume eligibility、blocked reason、runtime failure、board/ledger 解释结果
  - 明确当 authority 缺失、项目缺失、IPC 失败、返回不完整时，统一进入 error surface，而不是 fallback 推进
  - 固化禁止模式：`catch { setStage(...) }`、`if (!result.project) setStage(...)`、乐观核心状态更新、compat fallback 推进主链

  **Must NOT do**:
  - 不把 UI 导航 convenience 和业务 authority 混在一起
  - 不继续保留“先推进后再修正”的乐观主链

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要给 authority 边界下硬约束，避免局部修修补补
  - **Skills**: `coding-standards`
    - `coding-standards`: 用于统一错误语义与边界约束表达

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6-14
  - **Blocked By**: None

  **References**:
  - `src/shared/domain/workflow/stage-derivation.ts:120-169` - 现有单一 stage / blocked reason 派生中心
  - `src/shared/domain/workflow/generation-state.ts:1-88` - 已声明“derived state 不独立存储”的统一模型
  - `src/renderer/src/app/utils/generation-status.ts:3-19` - 正确的 authority-first 模式示例

  **Acceptance Criteria**:
  - [ ] authority-owned facts 清单写入计划实施说明
  - [ ] 明确禁止 fallback 的代码模式与错误出口

  **QA Scenarios**:

  ```text
  Scenario: 审核 authority contract 是否完整
    Tool: Bash (grep)
    Preconditions: 代码修改完成
    Steps:
      1. 搜索 stage / generation / resume / blocked reason 的写入路径
      2. 核对只有 main/orchestrator 路径保留业务写入
    Expected Result: renderer 不再直接主裁决核心事实
    Evidence: .sisyphus/evidence/task-1-authority-contract.txt

  Scenario: 审核 fallback 禁止规则是否落地
    Tool: Bash (grep)
    Preconditions: 规则已编码/文档化
    Steps:
      1. 搜索 `catch { setStage(` 与 `if (result.project) { setStage(` 类模式
      2. 核对业务路径不存在该类模式
    Expected Result: 禁止模式仅允许出现在例外白名单说明中
    Evidence: .sisyphus/evidence/task-1-fallback-ban.txt
  ```

- [x] 2. 建立 fallback-pattern 搜索基线

  **What to do**:
  - 枚举并冻结要清除的模式：项目缺失 fallback、IPC 失败 fallback、返回缺失 fallback、optimistic update、compat fallback
  - 建立 grep/ast-grep 搜索表达式，作为 Wave 2/4 的统一门禁输入

  **Must NOT do**:
  - 不只靠人工记忆找残留

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 15
  - **Blocked By**: None

  **References**:
  - `src/renderer/src/components/ProjectGenerationBanner.tsx:127-150` - fallback 反面样例
  - `src/renderer/src/features/outline/ui/OutlineStage.tsx:29-44` - fallback 反面样例

  **Acceptance Criteria**:
  - [ ] 形成可复用的 anti-pattern 搜索基线

  **QA Scenarios**:

  ```text
  Scenario: 搜索基线覆盖现有反面样例
    Tool: Bash (grep)
    Steps:
      1. 运行定义好的 pattern 搜索
      2. 确认至少命中已知反面样例文件
    Expected Result: 搜索表达式能稳定扫出已知问题点
    Evidence: .sisyphus/evidence/task-2-pattern-baseline.txt

  Scenario: 搜索基线可用于收尾门禁
    Tool: Bash (grep)
    Steps:
      1. 记录清理前后的命中数量
      2. 确认收尾可用同一组规则比较前后差异
    Expected Result: 有可执行的 before/after 对照
    Evidence: .sisyphus/evidence/task-2-before-after.txt
  ```

- [x] 3. 盘点并标注 renderer stage fallback 热点

  **What to do**:
  - 把 Banner、各 stage 页面、hooks、action helpers 的 stage fallback 列成实施清单
  - 区分“真实业务 authority”与“纯 UI 本地导航”例外

  **Must NOT do**:
  - 不把 runtime console 这类纯视图切换误判为业务 authority

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6-10
  - **Blocked By**: None

  **References**:
  - `src/renderer/src/components/ProjectGenerationBanner.tsx:127-150`
  - `src/renderer/src/features/chat/ui/ChatStage.tsx`
  - `src/renderer/src/features/outline/ui/OutlineStage.tsx:29-44`
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`
  - `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx`
  - `src/renderer/src/features/home/ui/useHomePageActions.ts`

  **Acceptance Criteria**:
  - [ ] 所有业务 stage fallback 热点都有唯一归属任务

  **QA Scenarios**:

  ```text
  Scenario: 热点覆盖核对
    Tool: Bash (grep)
    Steps:
      1. 搜索 renderer 中 `changeProjectStage` 与 `setStage` 共现处
      2. 对照实施清单确认无遗漏
    Expected Result: 所有共现热点均已纳入后续任务
    Evidence: .sisyphus/evidence/task-3-stage-hotspots.txt

  Scenario: 例外白名单核对
    Tool: Read
    Steps:
      1. 审阅被标记为“纯 UI 导航”的例外
      2. 确认它们不主导业务真相
    Expected Result: 例外可解释且不越权
    Evidence: .sisyphus/evidence/task-3-whitelist.txt
  ```

- [x] 4. 盘点并标注 generation live path 真实入口

  **What to do**:
  - 明确 start / resume / rewrite / stop / continue 的真实调用链
  - 定位所有未经过 orchestrator 的 live path

  **Must NOT do**:
  - 不把仅存在于注释或 dead code 的 orchestrator 示例当作已接线

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11-13
  - **Blocked By**: None

  **References**:
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts:37-176`
  - `src/main/application/script-generation/runtime/script-generation-worker-runner.ts`
  - `src/main/application/script-generation/runtime/script-generation-worker.ts`
  - `src/main/application/script-generation/start-script-generation.ts`
  - `src/shared/domain/workflow/script-generation-orchestrator.ts`

  **Acceptance Criteria**:
  - [ ] 所有 generation 控制入口都有唯一 live path 图
  - [ ] 明确列出 bypass orchestrator 的入口

  **QA Scenarios**:

  ```text
  Scenario: live path 可追溯
    Tool: Read + Grep
    Steps:
      1. 从 renderer action 开始逐级追踪到 main/runtime
      2. 记录每条控制路径是否进入 orchestrator
    Expected Result: start/resume/rewrite/stop/continue 均有可证据化调用链
    Evidence: .sisyphus/evidence/task-4-live-path-map.md

  Scenario: bypass 检出
    Tool: Grep
    Steps:
      1. 搜索 `new ScriptOrchestrator` 与 generation IPC handlers
      2. 对照实际 handler 路径
    Expected Result: 能明确判断 orchestrator 是否真正接入
    Evidence: .sisyphus/evidence/task-4-bypass-check.txt
  ```

- [x] 5. 统一 authority error DTO / notice contract

  **What to do**:
  - 统一“project 缺失 / authority unavailable / IPC failed / incomplete result / migration blocked”错误类型与展示语义
  - 确保 UI 展示错误，而不是把错误翻译成本地推进

  **Must NOT do**:
  - 不混用 console.warn + 静默 fallback 代替业务错误

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6-14
  - **Blocked By**: None

  **References**:
  - `src/renderer/src/components/ProjectGenerationBanner.tsx:127-150`
  - `src/renderer/src/app/utils/generation-status.ts:3-19`
  - `src/shared/contracts/workspace.ts`
  - `src/shared/contracts/workflow.ts`

  **Acceptance Criteria**:
  - [ ] 错误类型有统一 contract
  - [ ] UI 失败展示可区分“无法取得 authority”与“业务 gate 未通过”

  **QA Scenarios**:

  ```text
  Scenario: authority 错误能被显示
    Tool: Playwright / Browser
    Steps:
      1. 模拟 IPC 失败或 projectId 缺失
      2. 触发 stage / generation 行为
      3. 断言显示错误 notice，而不是页面推进
    Expected Result: 可见错误文案，无业务状态推进
    Evidence: .sisyphus/evidence/task-5-error-notice.png

  Scenario: gate 未通过与 authority 失败区分
    Tool: Playwright / Browser
    Steps:
      1. 分别制造 gate-blocked 与 IPC-failed 两种情况
      2. 对比 notice 文案和行为
    Expected Result: 两类错误语义可区分
    Evidence: .sisyphus/evidence/task-5-error-diff.png
  ```

- [x] 6. 清除 Banner / Header / Sidebar 类导航 fallback

  **What to do**:
  - 删除 `ProjectGenerationBanner` 等公共导航组件里的 stage fallback
  - authority 缺失时只显示错误，不本地切换

  **Must NOT do**:
  - 不保留 `catch { setStage(...) }`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15,17
  - **Blocked By**: 1,2,3,5

  **References**:
  - `src/renderer/src/components/ProjectGenerationBanner.tsx:127-150`
  - `src/renderer/src/app/shell/AppHeader.tsx`
  - `src/renderer/src/app/shell/AppSidebar.tsx` - 已修正样板

  **Acceptance Criteria**:
  - [ ] 公共导航组件不再本地推进业务 stage

  **QA Scenarios**:

  ```text
  Scenario: Banner 导航成功路径
    Tool: Playwright / Browser
    Steps:
      1. 在有效 project 环境下点击 Banner 主动作
      2. 断言 stage 变化来自 IPC 后结果
    Expected Result: 跳转成功，无本地 fallback 代码参与
    Evidence: .sisyphus/evidence/task-6-banner-success.png

  Scenario: Banner authority 失败路径
    Tool: Playwright / Browser
    Steps:
      1. 模拟 changeProjectStage IPC 抛错
      2. 点击 Banner 主动作
      3. 断言 stage 未变，错误可见
    Expected Result: 不再切过去，只报错
    Evidence: .sisyphus/evidence/task-6-banner-error.png
  ```

- [x] 7. 清除 Chat / Outline / Character 页面 fallback

  **What to do**:
  - 移除 `ChatStage.tsx`、`OutlineStage.tsx`、`CharacterStage.tsx` 中所有 project 缺失/IPC 失败/result 缺失后的本地 setStage

  **Must NOT do**:
  - 不把目标 stage 字符串作为错误时的本地真相

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15,17
  - **Blocked By**: 1,2,3,5

  **References**:
  - `src/renderer/src/features/chat/ui/ChatStage.tsx`
  - `src/renderer/src/features/outline/ui/OutlineStage.tsx:29-44`
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`

  **Acceptance Criteria**:
  - [ ] 三个页面失败时停在原位并报错

  **QA Scenarios**:

  ```text
  Scenario: Outline -> Character authority 成功
    Tool: Playwright / Browser
    Steps:
      1. 打开粗纲页并点击进入人物页
      2. 断言成功切换且状态由 authority 返回驱动
    Expected Result: 正常切换
    Evidence: .sisyphus/evidence/task-7-outline-success.png

  Scenario: Outline -> Character authority 失败
    Tool: Playwright / Browser
    Steps:
      1. 模拟 IPC 失败
      2. 点击进入人物页
      3. 断言仍停留粗纲页，显示错误
    Expected Result: 不再本地推进到人物页
    Evidence: .sisyphus/evidence/task-7-outline-error.png
  ```

- [x] 8. 清除 DetailedOutline / Script 页面残留 fallback

  **What to do**:
  - 清除详纲与剧本页内的 stage/generation fallback
  - 统一依赖 authority 返回和错误表面

  **Must NOT do**:
  - 不继续在局部页面保留“先跳到 script 再说”的兜底逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15,17
  - **Blocked By**: 1,2,3,5

  **References**:
  - `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx`
  - `src/renderer/src/features/script/ui/ScriptStage.tsx` - 已修正样板

  **Acceptance Criteria**:
  - [ ] 详纲/剧本页没有 authority 失败后的本地推进

  **QA Scenarios**:

  ```text
  Scenario: 详纲进入剧本成功
    Tool: Playwright / Browser
    Steps:
      1. 在 authority 正常时点击进入剧本
      2. 断言进入 script stage
    Expected Result: 正常切换
    Evidence: .sisyphus/evidence/task-8-detailed-success.png

  Scenario: 详纲进入剧本失败
    Tool: Playwright / Browser
    Steps:
      1. 模拟 authority 返回失败或空结果
      2. 点击进入剧本
      3. 断言页面不推进且展示错误
    Expected Result: 无本地 fallback 到 script
    Evidence: .sisyphus/evidence/task-8-detailed-error.png
  ```

- [x] 9. 清除 hooks / action helpers 中本地拍板逻辑

  **What to do**:
  - 清理 `useHomePageActions.ts` 及同类 helper 中“拿不到 authority 结果就本地 setStage/继续”的逻辑
  - 确保 helper 只负责编排请求与错误展示

  **Must NOT do**:
  - 不在 hook 里隐藏业务 fallback

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15,17
  - **Blocked By**: 1,2,3,5

  **References**:
  - `src/renderer/src/features/home/ui/useHomePageActions.ts`
  - `src/renderer/src/features/chat/ui/useChatStageActions.ts`
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`

  **Acceptance Criteria**:
  - [ ] helper/hook 不再暗藏 authority fallback

  **QA Scenarios**:

  ```text
  Scenario: Home action 成功路径
    Tool: Playwright / Browser
    Steps:
      1. 从首页触发进入下一阶段动作
      2. 断言跳转由 IPC 返回驱动
    Expected Result: 正常成功
    Evidence: .sisyphus/evidence/task-9-home-success.png

  Scenario: Home action 失败路径
    Tool: Playwright / Browser
    Steps:
      1. 模拟项目缺失/authority 失败
      2. 触发首页动作
      3. 断言仅报错不推进
    Expected Result: 无隐式 fallback
    Evidence: .sisyphus/evidence/task-9-home-error.png
  ```

- [x] 10. 去掉 generationStatus / stage 的乐观核心状态更新

  **What to do**:
  - 审查并移除所有“先本地更新核心状态，再等 authority 回来”的模式
  - 仅允许 authority-first，再同步展示层

  **Must NOT do**:
  - 不误伤纯 loading / spinner / disabled 之类非业务 UI 状态

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15,17
  - **Blocked By**: 1,2,3,5

  **References**:
  - `src/renderer/src/app/utils/generation-status.ts:3-19` - 正确 authority-first 样板
  - `src/renderer/src/app/store/useWorkflowStore.ts`
  - `src/renderer/src/store/useStageStore.ts`

  **Acceptance Criteria**:
  - [ ] 核心业务状态无乐观更新残留

  **QA Scenarios**:

  ```text
  Scenario: generationStatus authority 成功
    Tool: Playwright / Browser
    Steps:
      1. 启动生成动作
      2. 断言 UI 状态来自 authority 返回
    Expected Result: 正常显示运行状态
    Evidence: .sisyphus/evidence/task-10-generation-success.png

  Scenario: generationStatus authority 失败
    Tool: Playwright / Browser
    Steps:
      1. 模拟保存 generationStatus 失败
      2. 启动生成动作
      3. 断言未出现伪 running 状态
    Expected Result: 直接报错，不假装开始
    Evidence: .sisyphus/evidence/task-10-generation-error.png
  ```

- [x] 11. 让 start / resume / rewrite 真正接入 orchestrator

  **What to do**:
  - 改造 `workflow:start-script-generation` live path，使 start/resume/rewrite 不再直接绕过 orchestrator
  - 让 board 创建、执行、repair、persist、present 的责任回到单一 orchestrator

  **Must NOT do**:
  - 不保留 handler 直接拼装 runtime 真相的第二套逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 12,13,15,17
  - **Blocked By**: 1,4,5

  **References**:
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts:37-151`
  - `src/shared/domain/workflow/script-generation-orchestrator.ts`
  - `src/main/application/script-generation/start-script-generation.ts`
  - `src/main/application/script-generation/runtime/script-generation-worker-runner.ts`

  **Acceptance Criteria**:
  - [ ] start/resume/rewrite 的真实 live path 均可追溯到 orchestrator
  - [ ] handler 不再直接承担第二套执行编排

  **QA Scenarios**:

  ```text
  Scenario: fresh start 经过 orchestrator
    Tool: Bash (grep/read) + targeted runtime run
    Steps:
      1. 从 renderer 发起 fresh_start
      2. 跟踪调用链到 orchestrator
      3. 断言 runtime 日志/证据显示 orchestrator 接管
    Expected Result: live path 进入唯一 orchestrator
    Evidence: .sisyphus/evidence/task-11-fresh-start.txt

  Scenario: resume 经过 orchestrator
    Tool: Bash (grep/read) + targeted runtime run
    Steps:
      1. 构造可 resume 的项目状态
      2. 触发 resume
      3. 断言路径不再绕过 orchestrator
    Expected Result: resume 也经同一控制面
    Evidence: .sisyphus/evidence/task-11-resume.txt
  ```

- [x] 12. 让 stop / pause / continue 统一走 orchestrator 控制面

  **What to do**:
  - stop / pause / continue 不再各自直连 worker registry 或旁路 helper
  - 确保控制动作与执行动作共享一个 authority controller

  **Must NOT do**:
  - 不保留 handler 直停 worker 的单独“短路通道”作为主路径

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 15,17
  - **Blocked By**: 11

  **References**:
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts:153-173`
  - `src/shared/domain/workflow/script-generation-orchestrator.ts:702-724`

  **Acceptance Criteria**:
  - [ ] stop/pause/continue 控制面统一

  **QA Scenarios**:

  ```text
  Scenario: stop 通过统一控制面
    Tool: Bash / runtime run
    Steps:
      1. 启动生成任务
      2. 触发 stop
      3. 断言停止信号进入统一控制面，并返回显式结果
    Expected Result: 不再直连第二套控制逻辑
    Evidence: .sisyphus/evidence/task-12-stop.txt

  Scenario: continue/pause 错误路径
    Tool: Bash / runtime run
    Steps:
      1. 在不可 pause/continue 的状态触发操作
      2. 断言返回显式错误
    Expected Result: 不再静默吞掉非法控制操作
    Evidence: .sisyphus/evidence/task-12-control-error.txt
  ```

- [x] 13. 统一 runtime 持久化与错误表面，禁止伪成功

  **What to do**:
  - 统一失败/中断/部分完成时的持久化与错误输出
  - 禁止“运行失败但 UI/notice 看起来像成功或已推进”
  - 优先统一使用原子保存路径

  **Must NOT do**:
  - 不保留 save 成功一半、展示成功一半的 split-brain 状态

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 15,17
  - **Blocked By**: 11

  **References**:
  - `src/main/infrastructure/storage/project-store.ts:270-358`
  - `src/shared/domain/workflow/generation-state.ts:32-88`
  - `src/shared/domain/workflow/script-generation-orchestrator.ts:682-699`

  **Acceptance Criteria**:
  - [ ] 失败时不会出现伪成功展示
  - [ ] runtime 状态写入优先走原子链

  **QA Scenarios**:

  ```text
  Scenario: runtime 失败显式暴露
    Tool: Bash / runtime run
    Steps:
      1. 模拟 worker/authority failure
      2. 断言持久化 failure 与 UI notice 一致
    Expected Result: 失败被明确呈现，不伪成功
    Evidence: .sisyphus/evidence/task-13-failure-surface.txt

  Scenario: partial-success 被阻断
    Tool: Bash / runtime run
    Steps:
      1. 模拟部分持久化异常
      2. 断言不会继续展示已成功推进
    Expected Result: 无 split-brain 成功状态
    Evidence: .sisyphus/evidence/task-13-partial-block.txt
  ```

- [x] 14. 旧项目兼容改成迁移 / 阻断 / 显式报错

  **What to do**:
  - 对旧项目兼容链重新定级：能迁移就迁移，不能迁移就阻断并报错
  - 删除“为了兼容先 fallback 一层继续跑”的路径

  **Must NOT do**:
  - 不把 compat 当 authority 兜底

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 15,17
  - **Blocked By**: 1,5

  **References**:
  - `src/shared/domain/policy/audit/audit-policy.ts:49-74`
  - `src/shared/domain/policy/progression/progression-policy.ts:27-43`
  - `src/main/application/script-generation/repair/fallback-rule-repair.ts`

  **Acceptance Criteria**:
  - [ ] compat 失败只会迁移失败/阻断，不会继续拍板推进

  **QA Scenarios**:

  ```text
  Scenario: 可迁移旧项目
    Tool: Bash / runtime run
    Steps:
      1. 准备 legacy 项目样本
      2. 触发进入主链
      3. 断言成功迁移后再进入 authority 链
    Expected Result: 迁移成功后再运行
    Evidence: .sisyphus/evidence/task-14-migrate-success.txt

  Scenario: 不可迁移旧项目
    Tool: Bash / runtime run
    Steps:
      1. 准备故意破损 legacy 样本
      2. 触发进入主链
      3. 断言系统阻断并报错
    Expected Result: 不继续 fallback 进入下游
    Evidence: .sisyphus/evidence/task-14-migrate-error.txt
  ```

- [x] 15. grep / AST 门禁化 authority anti-pattern

  **What to do**:
  - 把 stage fallback / optimistic authority update / local authority interpretation 变成可自动扫描的门禁
  - 确保后续改动很难把第二裁判口再带回来

  **Must NOT do**:
  - 不只靠 code review 记忆防回潮

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 6-14

  **References**:
  - `Task 2` 搜索基线产物
  - `src/renderer/src/components/ProjectGenerationBanner.tsx` - 反面样例来源

  **Acceptance Criteria**:
  - [ ] anti-pattern 能被自动扫出

  **QA Scenarios**:

  ```text
  Scenario: 门禁能拦截已知反模式
    Tool: Bash (grep/ast-grep)
    Steps:
      1. 运行 authority anti-pattern 检查
      2. 确认已知问题代码会被命中
    Expected Result: 门禁有效
    Evidence: .sisyphus/evidence/task-15-gate-positive.txt

  Scenario: 清理后门禁归零
    Tool: Bash (grep/ast-grep)
    Steps:
      1. 在修复后运行同一门禁
      2. 核对业务路径不再命中
    Expected Result: 业务路径命中数为 0 或仅剩白名单例外
    Evidence: .sisyphus/evidence/task-15-gate-clean.txt
  ```

- [x] 16. 文档与约束同步（authority rule / error semantics）

  **What to do**:
  - 更新主权规则、错误语义、兼容策略说明
  - 明确写出：authority 失败 = 报错，不推进

  **Must NOT do**:
  - 不留下旧文档继续暗示 fallback 是允许的

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `coding-standards`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 6-14

  **References**:
  - `AGENTS.md`
  - `2.rules.md`
  - `docs/system-authority（系统定义权与主权规则）.md`

  **Acceptance Criteria**:
  - [ ] 文档不再为 fallback 留口子

  **QA Scenarios**:

  ```text
  Scenario: 文档口径一致性检查
    Tool: Read + Grep
    Steps:
      1. 搜索 authority / fallback / error 相关表述
      2. 核对与新规则一致
    Expected Result: 文档无旧口径残留
    Evidence: .sisyphus/evidence/task-16-doc-consistency.txt

  Scenario: 开发者可执行性检查
    Tool: Read
    Steps:
      1. 审阅更新后的规则文档
      2. 核对是否能直接指导后续开发避免回潮
    Expected Result: 规则清晰、可执行
    Evidence: .sisyphus/evidence/task-16-doc-clarity.txt
  ```

- [x] 17. 补充 authority failure 回归测试 / 脚本

  **What to do**:
  - 覆盖 project missing、IPC failed、incomplete result、migration blocked、runtime partial failure
  - 确保这些都表现为显式错误而非本地推进

  **Must NOT do**:
  - 不只测 happy path

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-loop`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 6-14

  **References**:
  - `src/renderer/src/app/utils/generation-status.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
  - `src/shared/domain/workflow/generation-state.ts`

  **Acceptance Criteria**:
  - [ ] 所有 authority failure 场景都有回归覆盖

  **QA Scenarios**:

  ```text
  Scenario: project missing
    Tool: Playwright / Browser
    Steps:
      1. 在无有效 projectId 情况触发业务跳转
      2. 断言显示错误且不推进
    Expected Result: 无本地切换
    Evidence: .sisyphus/evidence/task-17-project-missing.png

  Scenario: incomplete result
    Tool: Playwright / Browser
    Steps:
      1. 模拟 authority 返回缺失 project/result
      2. 触发动作
      3. 断言报错且不使用 targetStage
    Expected Result: 无 fallback 到 targetStage
    Evidence: .sisyphus/evidence/task-17-incomplete-result.png
  ```

---

## Final Verification Wave

- [x] F1. **Authority Residue Audit** — `oracle`
      全仓审查 authority 相关 anti-pattern：`catch { setStage(...) }`、`if (!result.project) setStage(...)`、乐观核心状态更新、local blocked/reason interpretation。输出：`Renderer authority residue [0/N] | VERDICT`

- [x] F2. **Live-Path Orchestrator Audit** — `deep`
      从 renderer action 到 IPC handler 到 runtime/worker 全链追踪 start/resume/rewrite/stop/continue，确认唯一 orchestrator 接管。输出：`Control paths [N/N via orchestrator] | VERDICT`

- [x] F3. **Failure-Surface QA** — `unspecified-high`
      逐条执行 authority failure 场景：project missing、IPC failed、incomplete result、migration blocked、partial failure。要求全部表现为显式错误且无业务推进。输出：`Failure scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity + Anti-Fallback Audit** — `deep`
      核对本次只解决 authority / fallback / orchestrator / error surface，不扩展无关功能；同时确认不再有“为了顺滑”留下的业务兜底。输出：`Scope [CLEAN] | Anti-fallback [CLEAN] | VERDICT`

---

## Commit Strategy

- **Wave 2**：`refactor(renderer): remove local authority stage fallbacks`
- **Wave 3**：`refactor(runtime): route script generation through orchestrator`
- **Wave 4**：`test(authority): add regression coverage for failure surfaces`

---

## Success Criteria

### Verification Commands

```bash
npm run typecheck
# Expected: exit 0

grep -R "catch.*setStage\|setStage(result.project.stage)\|if (result.project).*setStage" src/renderer
# Expected: no business-path matches or only approved whitelist lines

grep -R "new ScriptOrchestrator\|workflow:start-script-generation\|runScriptGenerationInWorker\|startScriptGeneration" src
# Expected: live path clearly converges on orchestrator-controlled chain
```

### Final Checklist

- [x] 失败时不再推进 stage / generation
- [x] 一个事实只剩一个 authority producer
- [x] orchestrator 真正成为 script generation live path 的单入口
- [x] compatibility 不再扮演业务兜底
- [x] authority anti-pattern 有自动门禁防回潮
