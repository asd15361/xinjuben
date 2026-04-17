# E2E 假绿/吞错新问题发现（2026-03-22 第二轮）

> 本文档记录 E2E 测试脚本中新发现的假绿/吞错模式。
> 聚焦于：observer semantics、timeout conflation、catch-all masking、project targeting assumptions。
> 这些问题不在 active-task（当前任务卡）.md 的 31 条已有问题清单里，
> 也不在 recovery-chain-new-issues-2026-03-22.md 的 5 条 NEW-REC 问题里。

---

## 新问题清单

### NEW-E2E-1：多个脚本用 bare `catch {}` 吞掉所有错误，无日志无重抛

**文件**：

- `tools/e2e/script-batch-observer.mjs:86`
- `tools/e2e/root_cause_guards.mjs:44`
- `tools/e2e/root_cause_guards.mjs:60`

**证据**：

```javascript
// script-batch-observer.mjs:82-89
try {
  await button.waitFor({ state: 'visible', timeout: 2_000 })
  buttonVisible = true
  buttonEnabled = await button.isEnabled().catch(() => false)
} catch {
  buttonVisible = false
  buttonEnabled = false
}
```

```javascript
// root_cause_guards.mjs:44
function grepInFile(filePath, pattern) {
  try {
    const content = read(filePath)
    const matches = [...content.matchAll(new RegExp(pattern, 'g'))]
    return matches.length > 0 ? matches.map((m) => m[0]) : null
  } catch {
    return null
  }
}

// root_cause_guards.mjs:60
} catch {}
```

**根因**：

- Observer 里的错误被静默吞掉，调用方只能看到 `buttonVisible = false` 或 `buttonEnabled = false`
- 这让本该 Fail 的 observer 变成了"按钮不存在"的假信号

**影响**：

- Observer 报告 PASS 但实际是 Error 导致的默认状态
- `root_cause_guards.mjs` 的 grep 结果会漏掉文件读取错误

**为什么是新的**：已在档问题没有指出"observer 内部 bare catch 吞错"这一具体 observer semantics 缺陷。

---

### NEW-E2E-2：多个脚本用 `.catch(() => null)` 和 `.catch(() => false)` 掩盖错误

**文件**（18 个文件，89 处 `waitForTimeout` + 无数 `.catch`）：

```javascript
// 典型模式
lastProject = await readProjectSnapshot(projectFile).catch(() => null)
const btnVisible = await continueBtn.isVisible().catch(() => false)
const enabled = await continueBtn.isEnabled().catch(() => false)
```

**根因**：

- 所有 Promise rejection 被转成默认返回值（null/false）
- 调用方无法区分"真的没找到"和"出错了"

**影响**：

- 网络抖动、文件锁、JSON parse 失败都被掩盖
- 后续 predicate 判断基于错误假设继续跑

**为什么是新的**：已在档问题提到过"catch-all masking"但没有具体指出 `.catch(() => null)` 这种隐式吞错模式。

---

### NEW-E2E-3：`generationStatus` 类型混淆——脚本当字符串，真实合同是对象

**文件**：

- `tools/e2e/electron_real_100ep_full_check.mjs:276`
- `tools/e2e/electron_real_100ep_baton_check.mjs:215`

**证据**：

```javascript
// electron_real_100ep_baton_check.mjs:214-215
const generationStatus = batchProject?.generationStatus
const isGenerating = generationStatus === 'generating' || generationStatus === 'pending'
```

```javascript
// electron_real_100ep_full_check.mjs:275-276
const generationStatus = batchProject?.generationStatus
const isGenerating = generationStatus === 'generating' || generationStatus === 'pending'
```

**根因**：

- 脚本 Treating `generationStatus` as string literal
- 但当前合同里 `generationStatus` 是对象 DTO：`{ task, stage, title, detail }`
- 对象永远不等于字符串 `'generating'`

**影响**：

- `isGenerating` 永远是 `false`
- 批次完成判断退化成"只要 scene 数增加就认为完成"
- 真正卡死时脚本不会报 timeout，继续空等

**为什么是新的**：已在档 Issue 29 提到了 `generationStatus` 旧字符串判断，但只说了 baton check，没指出 full_check 也同样有问题。

---

### NEW-E2E-4：脚本直接改 `projects.json` 制造测试状态——observer effect

**文件**：

- `tools/e2e/electron_seeded_real_regression.mjs:91-98`
- `tools/e2e/phase4-isolated-script-check.mjs:218-238`

**证据**：

```javascript
// electron_seeded_real_regression.mjs:91-98
target.scriptDraft = (target.scriptDraft || []).slice(0, targetScriptSlice)
target.generationStatus = null
target.scriptProgressBoard = null
target.scriptResumeResolution = null
target.scriptFailureResolution = null
target.scriptRuntimeFailureHistory = []
target.scriptStateLedger = null
target.updatedAt = new Date().toISOString()
await fs.writeFile(fallbackProjectFile, JSON.stringify(store, null, 2), 'utf8')
```

```javascript
// phase4-isolated-script-check.mjs:218-238
const projectData = {
  projects: {
    [projectId]: {
      ...sampleProject,
      id: projectId,
      name: projectName,
      stage: 'outline',
      updatedAt: new Date().toISOString(),
      chatMessages: [],
      generationStatus: null,
      scriptDraft: [],
      scriptProgressBoard: null,
      scriptStateLedger: null
    }
  }
}
await fs.writeFile(projectFile, JSON.stringify(projectData, null, 2), 'utf8')
```

**根因**：

- 测试通过直接写 store 创造了"干净起点"
- 但这个起点在真实 UI 里永远不存在

**影响**：

- 脚本验证的是"自己构建的状态"，不是"真实用户路径"
- 恢复链测试实际在测试"如果我手动把 store 改成 X，UI 是否能继续"——这不是用户体验

**为什么是新的**：已在档 Issue 21 提到了"脚本直接改 projects.json"，但没指出这是 observer effect（测试创造了它要验证的状态）。

---

### NEW-E2E-5：脚本依赖历史 `userdata-*` 目录而非稳定 fixture

**文件**：

- `tools/e2e/electron_failure_resume.mjs:37` — 默认 `userdata-script-status-recheck-current`
- `tools/e2e/electron_targeted_script_test.mjs:114` — 默认 `userdata-real-verify-mmyw1o5h`
- `tools/e2e/electron_script_status_recheck.mjs:24` — 硬编码 `userdata-real-script-60-full-export-mmu8l84j`
- `tools/e2e/phase4-isolated-script-check.mjs:6,25` — 硬编码 `userdata-real-chain-mmwqsedk`

**根因**：

- 这些目录本身来自其他脚本的输出
- `electron_script_status_recheck.mjs` 本身会改写 `projects.json`
- 结果：`electron_failure_resume.mjs` 默认吃的是"被二次加工过的状态"

**影响**：

- 如果上游脚本行为变了，下游脚本的"稳定 seed"实际也在变
- 没人知道这个 seed 的真实血缘

**为什么是新的**：已在档 Issue 28 提到了"历史 userdata 依赖"，但没指出具体这些二次污染路径。

---

### NEW-E2E-6：Baton 分析的 heuristic 在 observer 眼里是确定性的，实际是概率性的

**文件**：

- `tools/e2e/electron_real_100ep_baton_check.mjs:62-163`
- `tools/e2e\baton-distribution-loop.mjs:40-90`

**证据**：

```javascript
// electron_real_100ep_baton_check.mjs:125
const explanation腔Detected = /注：|说明：|解释|因为.*所以|总结|也就是说|换言之/.test(outputText)

// electron_real_100ep_baton_check.mjs:109
const isBloated = openHookCount > 15 || characterWithObsCount > 10 || momentumTextLen > 1200

// baton-distribution-loop.mjs:69
const batonWeightStable = ledgerPerScene < 3000
```

**根因**：

- 这些阈值（15、10、1200、3000）都是人为设定的 heuristic
- 但脚本把它们当确定性判断用
- 概率性指标被当必然指标报

**影响**：

- "baton 稳定"可能只是阈值碰巧没过
- "explanation 腔"可能只是碰巧没触发
- 连续多次"通过"可能只是运气好

**为什么是新的**：已在档问题没有指出"baton heuristic 被当确定性判断用"这一 observer semantics 误用。

---

### NEW-E2E-7：`waitForProject` 超时后抛出带状态信息的 error，但后续仍用这个 error 做判断

**文件**：

- `tools/e2e/electron_real_100ep_baton_check.mjs:27-44`

**证据**：

```javascript
async function waitForProject(projectFile, predicate, timeoutMs, label) {
  const startedAt = Date.now()
  let lastProject = null
  while (Date.now() - startedAt < timeoutMs) {
    lastProject = await readProjectSnapshot(projectFile).catch(() => null)
    if (lastProject && (await predicate(lastProject))) return lastProject
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }
  throw new Error(
    `${label}_timeout:${timeoutMs}:${JSON.stringify({
      stage: lastProject?.stage || null,
      generationStatus: lastProject?.generationStatus || null,
      scriptDraft: lastProject?.scriptDraft?.length || 0,
      detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0,
      outlineCount: lastProject?.outlineDraft?.summaryEpisodes?.length || 0
    })}`
  )
}
```

**根因**：

- 超时时 `lastProject` 可能是 `null`（因为 `.catch(() => null)` 吞掉了错误）
- 错误信息里的状态其实是"最后一次读取的值"，不代表"超时时真实状态"
- 但调用方可能把这个错误信息当 truth 用

**影响**：

- 超时判断的证据本身可能是不准确的（null 状态被包装成有意义的 error）
- 调试时会看到"奇怪的状态组合"，但实际那个状态可能从未同时存在

**为什么是新的**：已在档问题没有具体指出 `waitForProject` 的超时 error 包装问题。

---

### NEW-E2E-8：多个脚本的 UI 按钮检测使用模糊正则，多个按钮可能同时匹配

**文件**：

- `tools/e2e/ui-signals.mjs:1-6`

**证据**：

```javascript
export const SCRIPT_STAGE_BUTTON_PATTERN =
  /一键执笔生成|现在开始写剧本|启动真实生成 Gate|继续生成|生成剧本/
export const SCRIPT_STAGE_TAB_PATTERN = /剧本草稿/
export const OUTLINE_TAB_PATTERN = /粗略大纲/
export const DETAILED_OUTLINE_CONFIRM_PATTERN = /确认：生成详细大纲|去详细大纲页查看状态/
export const DETAILED_OUTLINE_GENERATE_PATTERN = /生成这一版详细大纲|AI 帮我补这一版/
```

**根因**：

- `SCRIPT_STAGE_BUTTON_PATTERN` 匹配 5 种不同按钮文本
- 如果页面同时存在"继续生成"和"生成剧本"两个按钮，`getByRole('button').filter({ hasText: PATTERN })` 会返回第一个
- 但哪个是第一个取决于 DOM 顺序，不取决于业务优先级

**影响**：

- 脚本可能点了错误的按钮
- 不同环境下 DOM 顺序可能不同
- 同一脚本在不同时间点可能行为不一致

**为什么是新的**：已在档 Issue 27 提到了"乱码选择器"，但没指出"模糊正则导致多匹配"这一问题。

---

### NEW-E2E-9：批量观察器 poll 间隔硬编码，无法适配不同硬件

**文件**：

- `tools/e2e/script-batch-observer.mjs:149`
- `tools/e2e/electron_real_100ep_baton_check.mjs:33`
- 多个脚本使用 `setTimeout(resolve, 1200)`

**证据**：

```javascript
// script-batch-observer.mjs:167
await input.page.waitForTimeout(input.pollMs || 1_200)

// electron_real_100ep_baton_check.mjs:33
await new Promise((resolve) => setTimeout(resolve, 1200))
```

**根因**：

- 1.2 秒 poll 间隔在快机器上浪费等待时间，在慢机器上可能漏掉状态变化
- 没有自适应机制

**影响**：

- 快机器上：不必要的慢
- 慢机器上：可能错过"generationStatus 刚变成 idle"的瞬间，导致误判

**为什么是新的**：已在档问题没有指出"poll 间隔硬编码"这一性能/正确性权衡问题。

---

### NEW-E2E-10：`script-batch-observer.mjs` 的 `resolveScriptBatchOutcome` 逻辑存在竞态条件

**文件**：

- `tools/e2e/script-batch-observer.mjs:100-141`

**证据**：

```javascript
export function resolveScriptBatchOutcome(input) {
  const summary = summarizeScriptProject(input.project)
  const batchStatus = summary.board?.status || null

  if (summary.failure) {
    return { status: 'failed', reason: 'failure_resolution', summary }
  }

  if (batchStatus === 'failed' || batchStatus === 'paused') {
    return { status: 'failed', reason: 'batch_status_failed', summary }
  }

  if (summary.scriptCount > input.beforeCount && batchStatus === 'completed') {
    return { status: 'completed', reason: 'batch_completed', summary }
  }

  if (summary.scriptCount > input.beforeCount && !summary.generationStatus) {
    return { status: 'completed', reason: 'count_advanced_and_idle', summary }
  }

  return { status: 'waiting', reason: 'batch_running_or_waiting', summary }
}
```

**根因**：

- `batchStatus === 'completed'` 时才认为完成，但 `generationStatus` 已经是对象了，不再是 `null`
- 条件 `!summary.generationStatus` 对对象永远为 `false`
- 所以"count 增加了但 batchStatus 没变 completed"的情况会被判成 `'waiting'`

**影响**：

- 批次明明已经产出新 scene，但因为某些原因 `batchContext.status` 没变成 `completed`
- 脚本会继续空等，直到 timeout

**为什么是新的**：已在档问题没有具体指出 `resolveScriptBatchOutcome` 的 completion 判断逻辑会因为 `generationStatus` 类型变化而失效。

---

## 与已在档问题的关系

| 新问题     | 最相关的已在档问题                        | 区别                                                                  |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------- |
| NEW-E2E-1  | Issue 14（bare catch 吞错）               | 指出 observer 内部的 bare catch，不只是 IPC 层                        |
| NEW-E2E-2  | Issue 14（catch-all masking）             | 指出 `.catch(() => null)` 这种隐式吞错模式，更隐蔽                    |
| NEW-E2E-3  | Issue 29（generationStatus 旧字符串判断） | 指出 full_check 和 baton_check 都有这个问题，不只是 baton_check       |
| NEW-E2E-4  | Issue 21（脚本改 projects.json）          | 指出这是 observer effect，测试创造了它要验证的状态                    |
| NEW-E2E-5  | Issue 28（历史 userdata 依赖）            | 指出二次污染路径，具体哪些脚本依赖哪些输出目录                        |
| NEW-E2E-6  | Issue 无直接相关                          | 指出 baton heuristic 被当确定性判断用——真正的 observer semantics 误用 |
| NEW-E2E-7  | Issue 无直接相关                          | 指出 `waitForProject` 超时 error 包装的证据可能不准确                 |
| NEW-E2E-8  | Issue 27（乱码选择器）                    | 指出模糊正则多匹配问题，不只是乱码                                    |
| NEW-E2E-9  | Issue 无直接相关                          | 指出 poll 间隔硬编码导致快慢机器表现不一致                            |
| NEW-E2E-10 | Issue 29（generationStatus 类型混淆）     | 指出 completion 判断逻辑因类型混淆而存在竞态条件                      |

---

## 优先级建议

- **P0**：
  - NEW-E2E-3（generationStatus 类型混淆导致 isGenerating永远false）
  - NEW-E2E-10（completion 判断逻辑因类型混淆而失效）
  - 两者结合会导致：批次永远不会正确判断完成，会一直空等到 timeout
- **P1**：
  - NEW-E2E-1（observer bare catch 吞错）
  - NEW-E2E-2（隐式 .catch 掩盖错误）
  - NEW-E2E-4（observer effect）
- **P2**：
  - NEW-E2E-5（二次污染 seed）
  - NEW-E2E-6（heuristic 当确定性用）
  - NEW-E2E-7（超时 error 证据不准确）
  - NEW-E2E-8（模糊正则多匹配）
  - NEW-E2E-9（poll 间隔不适配）

---

## 验证建议

1. **NEW-E2E-3/E2E-10 验证**：在 `electron_real_100ep_full_check.mjs` 或 `baton_check.mjs` 的 batch wait loop 里加 console.log，打印 `generationStatus` 的实际值和 `isGenerating` 的结果，确认永远为 `false`

2. **NEW-E2E-1/E2E-2 验证**：在 observer 的 catch 块里加 `console.error` 并统计，看有多少错误被吞

3. **NEW-E2E-4 验证**：对比脚本直接写的 store 状态和真实 UI 操作后的 store 状态，确认两者不等价

4. **NEW-E2E-6 验证**：拿同一批剧本跑 baton 分析两次，看阈值边界值是否产生不同结论

5. **NEW-E2E-8 验证**：在有多个匹配按钮的页面运行脚本，看点了哪个按钮，是否符合预期
