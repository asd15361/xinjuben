# 恢复链新问题发现（2026-03-22）

> 本文档记录本次深度调研中新发现的、与恢复链相关的真实问题。
> 这些问题不在 `active-task（当前任务卡）.md` 的 31 条已有问题清单里，
> 也不在 `计划总表.md` 的已知问题总表里。

---

## 新问题清单

### NEW-REC-1：`stageContractFingerprint` 验证机制从未真正生效

**文件**：`src/renderer/src/app/hooks/useScriptGenerationRuntime.ts:24`

**证据**：

```typescript
function shouldReusePersistedBoard(
  board: ScriptGenerationProgressBoardDto | null | undefined,
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null // 总是 null
): board is ScriptGenerationProgressBoardDto {
  if (!board) return false
  return (
    board.batchContext.stageContractFingerprint === stageContractFingerprint && // null === null = true
    board.batchContext.batchSize === expectedBatchSize &&
    board.episodeStatuses.length === plan.targetEpisodes
  )
}
```

**调用点**：`useScriptGenerationRuntime.ts:60-65`

```typescript
if (shouldReusePersistedBoard(
  snapshot?.scriptProgressBoard,
  input.plan,
  input.stageContractFingerprint  // 来自 hook 参数，始终是 null
))
```

**根因**：虽然 `buildScriptGenerationContract()` 计算了 `stageContractFingerprint`，但这个值从未被传递到 `useScriptGenerationRuntime`：

- `useScriptGenerationPlan.ts` 计算了 `stageContractFingerprint` 但从未传递给 IPC
- IPC handler `workflow:create-script-generation-progress-board` 接收 `stageContractFingerprint: string | null` 但主进程从不传
- 结果：`shouldReusePersistedBoard` 里的指纹比较永远是 `null === null`，即 `true`

**影响**：当用户修改了详细大纲 blocks 后，只要 batchSize 和 episodeStatuses 数量相同，`shouldReusePersistedBoard` 仍会复用旧 board（带着旧的 episodeStatuses），导致 resume 起点错误。

**为什么是新的**：已在档问题 31 条和 active-task 都没有指出"指纹验证机制从未真正工作"这一结构性缺陷。

---

### NEW-REC-2：`replaceDetailedOutlineBlocks` 更新 store 但不持久化，导致 project store 与 store 永久分叉

**文件**：`src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts:71-72`

**证据**：

```typescript
if (useWorkflowStore.getState().projectId === requestProjectId) {
  replaceDetailedOutlineBlocks(result.detailedOutlineBlocks) // 只更新 store
}
// 没有调用 saveDetailedOutlineSegments() !
```

**对比**：`workspace-generation-handlers.ts:117-122` 在块完成时会调用：

```typescript
onBlockCompleted: async (payload) => {
  await saveDetailedOutlineSegments({
    // 这个回调存在但...
    projectId: input.projectId,
    detailedOutlineSegments: payload.detailedOutlineSegments,
    detailedOutlineBlocks: payload.detailedOutlineBlocks
  })
}
```

**根因**：`handleGenerateDetailedOutline` 直接调用 `replaceDetailedOutlineBlocks` 而不通过 `saveDetailedOutlineBlocks` / `saveDetailedOutlineSegments` 写回 project store。

**影响**：

1. Store 里 blocks 是新的，project store 里是旧的
2. 如果用户关闭应用再打开，旧 blocks 被恢复
3. 如果用户点"重新生成详纲"，`generateDetailedOutlineFromContext` 读 `project.detailedOutlineBlocks`（旧的），导致新生成的块被旧块覆盖或跳过

**为什么是新的**：已在档问题没有指出"生成详纲后 store 和 project store 不同步"这一具体路径。

---

### NEW-REC-3：`generateDetailedOutlineFromContext` 读取 `project.detailedOutlineBlocks` 而非当前 store 状态

**文件**：`src/main/application/workspace/generate-detailed-outline.ts:116`

**证据**：

```typescript
const detailedOutline = await generateDetailedOutlineFromContext({
  outline: input.outline,
  characters: input.characters,
  storyIntent: input.storyIntent || project.storyIntent || null,
  runtimeConfig,
  existingDetailedOutlineBlocks: project.detailedOutlineBlocks || [],  // 来自 project store，不是 store
  onBlockCompleted: async (payload) => { ... }
})
```

**对比**：`handleGenerateDetailedOutline` 调用 `buildScriptGenerationPlan` 时传的是：

```typescript
detailedOutlineBlocks: latestDetailedOutlineBlocks // 来自 useStageStore，是新的
```

**影响**：

- `buildScriptGenerationPlan` 用新 blocks 构建 plan（正确）
- `generateDetailedOutlineFromContext` 用旧 blocks 作为 existing（错误）
- 如果用户修改了 blocks 然后点"重新生成"，生成器可能跳过本应重新生成的块

**为什么是新的**：已在档问题虽然指出了 segments/blocks 的各种混用问题，但没有指出"生成详纲时 existingDetailedOutlineBlocks 来源是 project store 而非 renderer store"这一具体数据流分叉。

---

### NEW-REC-4：Resume 起点存在双重来源，可能产生矛盾

**文件**：`src/main/application/script-generation/progress-board.ts:72-113`

**证据**：`resolveResumeFromBoard` 根据 `board.episodeStatuses` 找 resume 起点：

```typescript
const failedEpisode = board.episodeStatuses.find((item) => item.status === 'failed')
if (failedEpisode) {
  return {
    canResume: true,
    resumeEpisode: failedEpisode.episodeNo,  // 来源1：board.episodeStatuses
    ...
  }
}
```

**对比**：`src/main/application/script-generation/build-execution-plan.ts:123-124`

```typescript
const resumeStartEpisode = mode === 'resume' && existingSceneCount > 0 ? existingSceneCount + 1 : 1 // 来源2：existingSceneCount
```

**影响**：

- `board.episodeStatuses` 反映的是"上一次生成运行时记录的状态快照"
- `existingSceneCount` 来自 `context.script.length`，是当前 store 里剧本的实际长度
- 如果两者不一致（如部分生成后手动删了剧本，或 board 没有正确更新），`resumeEpisode` 可能指向错误集数

**为什么是新的**：已在档问题 31 条和 active-task 都指出过 failure history 和 resume 的各种问题，但没有指出"resume 起点的两个来源可能矛盾"这一具体风险。

---

### NEW-REC-5：`saveOutlineAndCharacters` 虽然调用了 `invalidateScriptRuntimeState` 但 failure history 的清理存在不一致

**文件**：`src/main/infrastructure/storage/project-store.ts:204-223`

**证据**：

```typescript
export async function saveOutlineAndCharacters(input: {...}): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const invalidated = invalidateScriptRuntimeState(existing)  // 这个函数确实清空了 scriptRuntimeFailureHistory
    return {
      ...invalidated,
      ...
    }
  })
}
```

**但**：`invalidateScriptRuntimeState` 在 `project-runtime-invalidation.ts:13` 确实清空 `scriptRuntimeFailureHistory: []`

**实际场景**：当通过 IPC 调用 `saveOutlineDraft` 或 `saveCharacterDrafts` 时（不是 `saveOutlineAndCharacters`）：

```typescript
// project-store.ts:125-137
export async function saveOutlineDraft(input: SaveOutlineDraftInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const invalidated = invalidateScriptRuntimeState(existing)  // 也会清空
    return { ... }
  })
}
```

所以单独保存 outline 或 characters 时 failure history 也会被清空。但 `enterProject` 时 restoration 是从 project snapshot 读的，理论上应该是一致的。

**仍存在风险**：如果 `saveScriptRuntimeFailureHistory` 和 `saveScriptRuntimeState` 写入时机存在 race condition，或者 UI 层有 `setScriptRuntimeFailureHistory` 没有同步到 project store，可能出现内存 state 和持久化 state 不一致。

**为什么是新的**：已在档问题 32 提到了 failure history 跨世代串线，但没有具体指出"单独 save outline/characters 时也会清空 failure history"这一具体行为，以及可能的一致性风险。

---

## 与已在档问题的关系

| 新问题    | 最相关的已在档问题                                                                | 区别                                                                                                        |
| --------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| NEW-REC-1 | Issue 23（policy engine status 没人用）、Issue 13（恢复 hook 存在但没接）         | 指出的是"指纹验证机制从未工作"这一底层架构缺陷，不只是"有没有接入"                                          |
| NEW-REC-2 | Issue 18（renderer 打开项目时继续灌 segments）、Issue 12（segments 还没真正退边） | 指出的是"生成后 store 和 project store 分叉"这一具体同步缺失                                                |
| NEW-REC-3 | Issue 3（generateDetailedOutlineCore 复用 existing blocks）                       | 指出的是"数据来源是 project store 而非 renderer store"这一具体数据流问题                                    |
| NEW-REC-4 | Issue 2（resume 语义冲突）、Issue 13（恢复 hook 存在但没接）                      | 指出的是"resume 起点双重来源可能矛盾"这一具体逻辑风险                                                       |
| NEW-REC-5 | Issue 32（failure history 跨世代串线）                                            | 指出的是"单独 save 时 failure history 也会被清空，但 enterProject restoration 可能不一致"这一具体一致性风险 |

---

## 本轮新增问题（H 轮增量，仅"net-new"条目）

> 以下问题均不在 active-task 31 条和计划总表已知问题范围内，属于本轮三条独立代理调研新发现的所有权漏电、账本预览与持久化分叉、权限边界泄漏。

### NEW-REC-6：`useScriptLedgerPreview` 优先返回持久化账本而非实时重算，导致 ledger 预览可能严重过期

**文件**：`src/renderer/src/app/hooks/useScriptLedgerPreview.ts:22-27`

**证据**：

```typescript
// Line 22-27
if (projectId) {
  const snapshot = await window.api.workspace.getProject(projectId).catch(() => null)
  if (snapshot?.scriptStateLedger) {
    if (active) setState(snapshot.scriptStateLedger) // ← 直接返回旧持久化账本
    return // ← 提前退出，buildScriptLedgerPreview 永远不会走到
  }
}

const next = await window.api.workflow.buildScriptLedgerPreview({
  // ← 只有在没有持久化账本时才走这里
  storyIntent,
  outline,
  characters,
  script
})
```

**根因**：`useScriptLedgerPreview` 的设计逻辑是"优先消费持久化 `scriptStateLedger`"，只有当持久化账本为空时才现场重算。但持久化账本只在剧本生成成功时写入，用户手动改剧本、或上游粗纲/人物变化时，持久化账本不会自动更新。结果：UI 显示的 ledger 预览可能是上一次生成时的旧状态，而不是当前 runtime 真实状态。

**影响**：

- 用户手动编辑剧本后，ledger 预览不更新（最新钩子、未闭合钩子、postflight 问题数全部停留在上一次生成时的值）
- 上游粗纲/人物变化后，ledger 预览不反映新状态
- `ScriptStage.tsx:180-186` 和 `:220-225` 展示的 ledger 信息可能是过期数据

**为什么是新的**：已在档问题 Issue 30（`scriptStateLedger` 落盘但 renderer 没正式消费）和 Issue 11（`useScriptLedgerPreview` 是孤岛预览链）都指出了 ledger 没有被正确消费，但没有指出"即使消费了，返回的也是过期持久化账本而非实时重算"这一具体数据流缺陷。

---

### NEW-REC-7：`shouldReusePersistedBoard` 检查 batch size 和 episode count 但不检查 `batchContext.status`，可能导致复用处于 paused/failed 状态的 board

**文件**：`src/renderer/src/app/hooks/useScriptGenerationRuntime.ts:15-28`

**证据**：

```typescript
// Line 15-28
function shouldReusePersistedBoard(
  board: ScriptGenerationProgressBoardDto | null | undefined,
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null
): board is ScriptGenerationProgressBoardDto {
  if (!board) return false
  const expectedBatchSize = Math.min(plan.runtimeProfile.recommendedBatchSize, plan.targetEpisodes)
  return (
    board.batchContext.stageContractFingerprint === stageContractFingerprint &&
    board.batchContext.batchSize === expectedBatchSize && // ← 检查了 size
    board.episodeStatuses.length === plan.targetEpisodes // ← 检查了 episode count
    // ← 没有检查 board.batchContext.status！
  )
}
```

**对比**：`batchContext.status` 的检查只存在于首页判断（`useHomePageActions.ts:59`），但在 `useScriptGenerationRuntime` 的 board 复用判断里被完全忽略。

**影响**：

- 如果上一次 batch 处于 `paused` 或 `failed` 状态，但 fingerprint / size / episode count 都匹配，`shouldReusePersistedBoard` 仍会返回 `true`
- 后续 `resolveScriptGenerationResume` 会基于这个 paused board 继续算 resume 起点，导致恢复起点错误

**为什么是新的**：NEW-REC-4 指出过"resume 起点存在双重来源"，但没有指出"board 复用判断本身缺少 status 校验"这一具体风险。

---

### NEW-REC-8：`generationStatus` 的 `saveGenerationStatus` 调用是 fire-and-forget，失败时 UI 继续显示"生成中"但状态未落盘

**文件**：`src/renderer/src/app/utils/generation-status.ts:10`

**证据**：

```typescript
// generation-status.ts:3-15
export async function startGenerationRun(input: {
  projectId: string
  status: ProjectGenerationStatusDto
  clearGenerationNotice: () => void
  setGenerationStatus: (status: ProjectGenerationStatusDto | null) => void
}): Promise<void> {
  input.clearGenerationNotice()
  input.setGenerationStatus(input.status) // ← 立即更新内存
  await window.api.workspace.saveGenerationStatus({
    // ← 异步写盘
    projectId: input.projectId,
    generationStatus: input.status
  })
}
```

调用方（`useScriptStageActions.ts:137` 等）使用 `void startGenerationRun(...)` 触发，错误被静默吞掉：

```typescript
// useScriptStageActions.ts:137
void startGenerationRun({ projectId: requestProjectId, status: nextGenerationStatus, ... })
```

**影响**：

- 如果 `saveGenerationStatus` 抛出异常（磁盘满、权限问题等），UI 已经显示"正在生成剧本"，但项目重启后 `generationStatus` 为 `null`（因为没落盘），用户看不到任何生成痕迹
- 同样问题存在于 `finishGenerationRun`（`generation-status.ts:22`）中：`saveGenerationStatus(null)` 也是 fire-and-forget

**为什么是新的**：已在档问题 Issue 6（"本地先成功、持久化后补"）指出了剧本生成的双真相风险，但没有具体指出 `generationStatus` 自己的 fire-and-forget 问题。

---

### NEW-REC-9：`saveScriptRuntimeState` 和 `saveScriptRuntimeFailureHistory` 是两个独立 IPC 调用，存在 race condition，可能导致 board/failureHistory 不一致

**文件**：`src/renderer/src/features/script/ui/useScriptStageActions.ts:175-189`

**证据**：

```typescript
// useScriptStageActions.ts:175-189（失败路径）
await window.api.workspace.saveScriptRuntimeState({
  // ← 调用 1：写 board/resume/failure
  projectId: requestProjectId,
  scriptProgressBoard: result.board,
  scriptResumeResolution: nextResume,
  scriptFailureResolution: result.failure,
  scriptStateLedger: result.ledger // ← 失败时为 null
})
await window.api.workspace.saveScriptRuntimeFailureHistory({
  // ← 调用 2：写 failure history
  projectId: requestProjectId,
  scriptRuntimeFailureHistory: nextHistory
})
```

**影响**：

- 如果调用 1 成功但调用 2 失败（网络抖动、磁盘问题），board/resume/failure 已更新，但 failure history 仍是旧的
- 下次 resume 时，`resolveScriptGenerationResume` 基于新 board 但旧 failure history，可能给出错误的风险判断

**为什么是新的**：已在档问题 Issue 31（`saveScriptRuntimeState` 对 `scriptStateLedger` 使用 `?? existing` 保留旧值）和 Issue 7（写状态覆盖原始异常）都没有指出"两个独立写盘调用之间的 race condition"这一具体风险。

---

### NEW-REC-10：Ledger 只在成功时写盘，失败时 `result.ledger` 为 `null`，导致失败批次的历史 context 永久丢失

**文件**：`src/renderer/src/features/script/ui/useScriptStageActions.ts:180`

**证据**：

```typescript
// useScriptStageActions.ts:175-181
await window.api.workspace.saveScriptRuntimeState({
  projectId: requestProjectId,
  scriptProgressBoard: result.board,
  scriptResumeResolution: nextResume,
  scriptFailureResolution: result.failure,
  scriptStateLedger: result.ledger // ← 失败路径 result.ledger 是 null
})
```

`startScriptGeneration.ts` 在各失败路径都显式返回 `ledger: null`（lines 78, 119, 152, 183）。

**影响**：

- 批次中途失败时，board 的 `batch_paused` 状态被记录了，但 ledger（记录了失败前发生了哪些 hook、知识边界、人物状态）被丢弃
- 用户 resume 时缺少失败前的上下文，repair 或重新生成可能不是最优续接

**为什么是新的**：NEW-REC-4 指出过 resume 起点的双重来源，但没有指出"失败时的 ledger context 丢失"这一具体信息损失路径。

---

### NEW-REC-11：`useScriptGenerationRuntime` 的 useEffect 依赖项不包含 `project snapshot`，导致 board 在 `projectId` 不变的情况下不会重新同步

**文件**：`src/renderer/src/app/hooks/useScriptGenerationRuntime.ts:41-103`

**证据**：

```typescript
// useScriptGenerationRuntime.ts:103
}, [input.plan, input.stageContractFingerprint, input.projectId])
//                               ↑ 没有包含项目 snapshot 本身
```

而 board/resume/failurePreview 全部来自 `window.api.workspace.getProject(input.projectId)`（lines 58-66）的读取结果。

**影响**：

- 如果 `scriptRuntimeFailureHistory` 在其他地方更新了（例如通过另一个 tab 或通过脚本），但用户没有切换 project/plan，board 不会重新读取
- 理论上 board 应该跟着 `scriptRuntimeFailureHistory` 一起变化，但实际上 board 永远是"上一次 mount 时读到的快照"

**为什么是新的**：已在档问题 Issue 16（board/resume/failure 有持久化但 renderer 没有正式消费口）指出了"有能力没展示"，但没有指出"即使展示了，hook 也不会在 runtime 状态变化时重新读取"这一具体响应性问题。

---

### NEW-REC-12：IPC handlers 完全信任 renderer 传入的 `projectId`，主进程没有任何权限验证

**文件**：`src/main/ipc/workspace-project-handlers.ts:48-89`

**证据**：

```typescript
// workspace-project-handlers.ts:48-89（全部 handlers）
ipcMain.handle(
  'workspace:save-story-intent',
  async (_event, input) => saveStoryIntent(input) // ← input.projectId 直接透传，没有任何验证
)
ipcMain.handle(
  'workspace:save-character-drafts',
  async (_event, input) => saveCharacterDrafts(input) // ← 同样问题
)
// ... saveOutlineDraft / saveDetailedOutlineSegments / saveScriptDraft / saveScriptRuntimeState / saveScriptRuntimeFailureHistory 全部一样
```

`project-store-updater.ts:4-17` 的 `updateProject` 只检查项目是否存在：

```typescript
const existing = store.projects[projectId]
if (!existing) return null // ← 只检查存在，不检查调用方是否有权限修改
```

**影响**：

- 任何能发送 IPC 消息的 renderer 代码都能读写任何项目的任何字段
- 如果 renderer 逻辑存在漏洞，攻击者可以跨项目写数据
- 主进程和 renderer 之间没有任何 session context 或项目所有权验证

**为什么是新的**：已在档问题没有任何一条指出"IPC 层对 `projectId` 没有权限验证"这一安全/架构层面的根因问题。（已有个别问题描述了 UI 层的检查，但主进程层的验证缺失没有被单独指出。）

---

### NEW-REC-13：Preload API 暴露了无作用域的写操作，任何项目 ID 都可以被传入

**文件**：`src/preload/api/workspace.ts:37-81`

**证据**：

```typescript
// preload/api/workspace.ts:37-38
getProject(projectId: string): Promise<ProjectSnapshotDto | null> {
  return ipcRenderer.invoke('workspace:get-project', projectId)  // ← 可以读任何项目
},
deleteProject(input: DeleteProjectInputDto): Promise<DeleteProjectResultDto> {
  return ipcRenderer.invoke('workspace:delete-project', input)    // ← 可以删任何项目
},
saveStoryIntent(input: SaveStoryIntentInputDto): Promise<ProjectSnapshotDto | null> {
  return ipcRenderer.invoke('workspace:save-story-intent', input)  // ← 可以写任何项目
},
// ... 所有 save* 方法都一样
```

**影响**：

- preload 层没有限制"只能操作当前加载的项目"
- renderer 里的代码如果出现逻辑错误或被 XSS 利用，可能跨项目操作数据
- 与 NEW-REC-12 合起来，形成"主进程信任一切从 preload 来的数据"的完整漏洞链

**为什么是新的**：已在档问题没有一条从 preload API 设计角度指出"暴露了无作用域写操作"这一具体架构缺陷。

---

### NEW-REC-14：Renderer 对 `projectId` 有防御性检查，但主进程完全不检查，导致 renderer/main 之间的 ownership 验证存在单向信任陷阱

**文件对比**：

**Renderer 侧**（`useScriptStageActions.ts:162-164`）：

```typescript
if (useWorkflowStore.getState().projectId === requestProjectId) {
  replaceScript(result.generatedScript) // ← 有检查
}
```

**主进程侧**（`workspace-generation-handlers.ts:64,80-86`）：

```typescript
const project = await waitForProject(input.projectId) // ← 只检查存在，不检查所有权
// ...
const nextProject = await persistGeneratedWorkspace({
  projectId: input.projectId, // ← 直接信任 renderer 传入的 projectId
  storyIntent: generated.storyIntent
  // ...
})
```

**影响**：

- Renderer 层有 `projectId === requestProjectId` 的防御检查，但这个检查可以被绕过（直接调用 preload API）
- 主进程完全不验证，生成结果会被写到 renderer 指定的任意项目
- 如果用户切换了项目但旧请求还在跑，结果会写到错误的项目

**为什么是新的**：已在档问题 Issue 6（"本地先成功、持久化后补"）部分涉及，但没有明确指出"renderer/main 之间的 projectId 所有权验证存在单向信任"这一具体架构漏洞。

---

### NEW-REC-15：生成流程完全依赖 renderer 传入的 `projectId`，没有将 projectId 绑定到 session 或请求上下文中，导致生成结果可以被写到任意项目

**文件**：`src/main/ipc/workspace-generation-handlers.ts:55-86`

**证据**：

```typescript
ipcMain.handle('workspace:generate-outline-and-characters', async (_event, input) => {
  const project = await waitForProject(input.projectId) // ← 依赖 renderer 提供
  // ...
  const nextProject = await persistGeneratedWorkspace({
    projectId: input.projectId, // ← 继续依赖 renderer 提供
    storyIntent: generated.storyIntent,
    outlineDraft: generated.outlineDraft
    // ...
  })
})
```

**影响**：

- 生成流程中 `projectId` 没有绑定到 session 级别
- 如果 IPC 请求被劫持或 renderer 逻辑出错，生成结果可能写到错误的项目
- 无法在主进程层追查"这个生成请求是谁发起的、对应哪个项目"

**为什么是新的**：已在档问题没有任何一条从"session binding"角度描述 projectId 的处理风险。

---

## 本轮新增问题与已有问题的关系

| 本轮新增   | 最相关的已有问题                                              | 区别                                                                                              |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| NEW-REC-6  | Issue 30（持久化账本没被消费）、Issue 11（ledger 孤岛预览链） | 指出的是"即使消费了，返回的也是过期持久化账本而非实时重算"这一具体数据流缺陷                      |
| NEW-REC-7  | NEW-REC-4（resume 起点双重来源）                              | 指出的是"shouldReusePersistedBoard 缺少 batch.status 检查"这一具体复用逻辑漏洞                    |
| NEW-REC-8  | Issue 6（本地先成功、持久化后补）                             | 指出的是"generationStatus 的 save 是 fire-and-forget"这一具体异步可靠性问题                       |
| NEW-REC-9  | Issue 31（saveScriptRuntimeState race condition）             | 指出的是"saveScriptRuntimeState 和 saveScriptRuntimeFailureHistory 之间存在 race"这一具体写盘风险 |
| NEW-REC-10 | NEW-REC-4（resume 起点双重来源）                              | 指出的是"失败时 ledger context 永久丢失"这一具体信息损失路径                                      |
| NEW-REC-11 | Issue 16（board 有持久化但 renderer 没正式消费）              | 指出的是"hook 不会在 runtime 状态变化时重新读取 board"这一具体响应性问题                          |
| NEW-REC-12 | 无                                                            | 指出的是"IPC handlers 对 projectId 没有权限验证"这一安全/架构根因                                 |
| NEW-REC-13 | 无                                                            | 指出的是"preload API 暴露无作用域写操作"这一具体架构设计缺陷                                      |
| NEW-REC-14 | Issue 6（本地先成功、持久化后补）                             | 指出的是"renderer/main 之间 projectId 所有权验证存在单向信任陷阱"这一具体架构漏洞                 |
| NEW-REC-15 | 无                                                            | 指出的是"生成流程的 projectId 没有 session binding"这一具体请求上下文缺陷                         |

---

## 验证建议

1. **NEW-REC-6 验证**：在 `useScriptLedgerPreview.ts:24` 之后加 console.log，观察是走了持久化返回还是重算返回；手动编辑剧本后检查 ledger 预览是否更新

2. **NEW-REC-7 验证**：在 board 处于 `paused` 状态时检查 `shouldReusePersistedBoard` 返回值，验证 status 是否被纳入判断

3. **NEW-REC-8 验证**：模拟 `saveGenerationStatus` 抛出异常（mock IPC 失败），检查 UI 是否仍然显示"生成中"

4. **NEW-REC-9 验证**：在 `saveScriptRuntimeState` 成功后、在 `saveScriptRuntimeFailureHistory` 调用前制造延迟，观察 board 和 failureHistory 是否出现不一致

5. **NEW-REC-10 验证**：在 batch 中途制造失败，检查 `result.ledger` 是否为 null，以及下次 resume 时是否丢失了失败前的 ledger context

6. **NEW-REC-11 验证**：在另一个地方（如 IPC 直接调用）更新 `scriptRuntimeFailureHistory`，观察 board 是否重新同步

7. **NEW-REC-12/13/14/15 验证**：检查 IPC handlers 是否验证 `projectId` 属于当前 session；检查 preload 是否限制了只能操作当前项目

---

## 优先级建议

- **P0-Critical**：
  - NEW-REC-12（IPC 无权限验证）+ NEW-REC-13（preload 无作用域写）+ NEW-REC-14（renderer/main 信任陷阱）形成完整漏洞链，任意一个都可以被利用跨项目写数据
  - NEW-REC-8（generationStatus fire-and-forget）可能导致"生成中"状态丢数据

- **P1-High**：
  - NEW-REC-7（shouldReusePersistedBoard 缺少 status 检查）可能导致 resume 起点错误
  - NEW-REC-9（saveScriptRuntimeState 和 failureHistory race）可能导致 board 和 failureHistory 不一致
  - NEW-REC-10（失败时 ledger 丢失）可能导致 resume context 不完整

- **P2-Medium**：
  - NEW-REC-6（ledger preview 返回过期持久化状态）影响 UI 展示准确性
  - NEW-REC-11（board 不会随 project snapshot 重新同步）影响 runtime 状态响应性
  - NEW-REC-15（projectId 没有 session binding）是被动风险，当前 renderer 有检查但架构上不可信

---

## 验证建议

1. **NEW-REC-1 验证**：在 `shouldReusePersistedBoard` 入口加 console.log，观察 fingerprint 比较是否真的永远是 `null === null`

2. **NEW-REC-2 验证**：修改 blocks 后检查 `window.api.workspace.getProject(projectId)` 返回的 `detailedOutlineBlocks` 是否和 store 一致

3. **NEW-REC-3 验证**：在 `generateDetailedOutlineFromContext` 入口加 log，看 `existingDetailedOutlineBlocks` 的长度和内容，是否和 store 里不一致

4. **NEW-REC-4 验证**：手动删掉几集剧本后检查 `resumeEpisode` 和 `resumeStartEpisode` 是否还对应正确的集数

5. **NEW-REC-5 验证**：在 UI 连续操作 outline 保存后，检查 `scriptRuntimeFailureHistory` 是否被意外清空

---

## 优先级建议

- **P0**：NEW-REC-1（指纹验证失效）和 NEW-REC-2（store/project store 分叉）都是结构性缺陷，可能导致恢复链完全失效
- **P1**：NEW-REC-3（existing blocks 来源错误）会导致重新生成时跳过本应重算的块
- **P2**：NEW-REC-4（resume 起点矛盾）和 NEW-REC-5（failure history 一致性）需要特定条件才触发

---

## 2026-03-22 第三轮增量（resume/failure lifecycle 新发现）

### NEW-REC-16：Board 在 `startScriptGeneration` 时总是被丢弃，持久化的 episodeStatuses 永远丢失

**文件**：`src/main/ipc/workflow/script-generation-runtime-handlers.ts:16`

**证据**：

```typescript
ipcMain.handle('workflow:start-script-generation', async (_event, input: StartScriptGenerationInputDto) => {
  const board = createInitialProgressBoard(input.plan, null)  // ← 总是创建全新 board
  const startedBoard = markBatchStatus(board, 'running', '真实生成已被 gate 放行并启动。')
  try {
    return await startScriptGeneration(input, runtimeProviderConfig, startedBoard, {...})
  }
})
```

**对比** `useScriptGenerationRuntime.ts:60-66`：

```typescript
if (shouldReusePersistedBoard(snapshot?.scriptProgressBoard, input.plan, ...)) {
  nextBoard = snapshot.scriptProgressBoard  // ← UI 层正确复用了持久化 board
}
```

**根因**：即使 `shouldReusePersistedBoard` 在 UI 层正确识别并复用了持久化 board，当用户实际点击"开始生成"时，IPC handler 会直接丢弃它，创建一个全新的 board。

**影响**：上一次运行记录的 episodeStatuses（哪集失败、哪集完成等）全部丢失。`resumeEpisode` 永远不会被使用，因为 `startScriptGeneration` 创建的新 board 所有 episode 都从 plan.episodePlans 的默认 status 开始。

**为什么是新的**：NEW-REC-1 指出指纹验证不工作；这是另一面——即使指纹工作了，board 在实际生成起点还是被丢弃。

---

### NEW-REC-17：`resolveResumeFromBoard` 不验证 episode 是否在 plan 中处于 ready 状态

**文件**：`src/main/application/script-generation/progress-board.ts:85-93`

**证据**：

```typescript
const failedEpisode = board.episodeStatuses.find((item) => item.status === 'failed')
if (failedEpisode) {
  return {
    canResume: true,
    resumeEpisode: failedEpisode.episodeNo,  // ← 只看 board status，不验证 plan
    ...
  }
}
```

**缺失的检查**：该函数从不验证 `failedEpisode.episodeNo` 在 `plan.episodePlans` 中是否 `status === 'ready'`。可能推荐从 `blocked` 或 `pending` 的 episode 恢复。

**影响**：如果 board 显示 episode 5 是 'failed'，但 plan 显示 episode 5 是 'blocked'，系统会尝试从已阻塞的 episode 恢复并再次失败。

---

### NEW-REC-18：单个 blocked episode 导致全部 resume 失败，忽略其他 batch episodes

**文件**：`src/main/application/script-generation/progress-board.ts:75-83`

**证据**：

```typescript
const blockedEpisode = board.episodeStatuses.find((item) => item.status === 'blocked')
if (blockedEpisode) {
  return {
    canResume: false, // ← 所有 resume 被阻止
    resumeEpisode: null,
    nextBatchStatus: 'failed',
    reason: `第 ${blockedEpisode.episodeNo} 集当前仍被前置条件阻塞...`
  }
}
```

**问题**：只要有任何一个 episode 是 'blocked'，就返回 `canResume: false`，即使同一 batch 中其他 episodes 是 'failed' 或 'pending' 可以恢复。

**影响**：用户不能恢复如果 episode 3 被阻塞，即使 episode 2 失败可以重试。

---

### NEW-REC-19：手动编辑剧本不会使持久化 board 失效

**文件**：`src/renderer/src/app/hooks/useScriptGenerationRuntime.ts:15-28`

**证据**：`shouldReusePersistedBoard` 只检查 batchSize 和 episode count，不检查 board 反映的脚本内容是否与当前实际内容一致。

**场景**：用户生成了 5 集后手动删了 3 集，board 仍显示 5 集状态。检查通过但实际内容已变化。

**影响**：board 被复用但 episodeStatuses 已过时。resume 决策基于错误信息。

---

### NEW-REC-20：`createInitialProgressBoard` 总是从 plan 重新生成 episodeStatuses

**文件**：`src/main/application/script-generation/progress-board.ts:43`

**证据**：`episodeStatuses` 总是 `plan.episodePlans.map(...)` 重新生成，没有机制保留之前的 board 状态。

**这是 NEW-REC-16 的架构根因**：没有机制保留之前的 episodeStatuses。

---

### NEW-REC-21：`resolveResumeFromBoard` 不考虑跨-batch 的 episodes

**文件**：`src/main/application/script-generation/progress-board.ts:72-113`

**问题**：函数只检查当前 batch 的 episodes。如果 batch 1 有 blocked episode 但 batch 2 有 failed episode，函数说"不能恢复"而不考虑 batch 2。

**影响**：多-batch 生成工作流无法正确跨 batch 边界恢复。

---

### NEW-REC-22：Failure history 和 runtime state 分开保存，无原子性

**文件**：`src/renderer/src/features/script/ui/useScriptStageActions.ts:175-189`

**证据**：两个独立 IPC 调用（`saveScriptRuntimeState` 和 `saveScriptRuntimeStateFailureHistory`）。如果第二次失败，failure history 在内存中被重置但磁盘上仍是旧的。

**影响**：下次 resume 时基于新 board 但旧 failure history，可能给出错误的恢复判断。

---

## 2026-03-22 第三轮增量（observer completion semantics 新发现）

### OBS-1：没有 ready episodes 时发出 `batch_failed`——语义不匹配

**文件**：`src/main/application/script-generation/start-script-generation.ts:101-108`

**证据**：

```typescript
if (!repairedBatch.qualityReport.pass) {
  board = advanceScriptGenerationState(board, {
    type: 'batch_failed',
    reason: `首批剧本生成完成，但真实质量验收未过：${detail}`
  })
```

**根因**：当 `readyEpisodes` 为空时，`generatedScenes` 是 `[]`，导致 `inspectScreenplayQualityBatch([])` 返回 `pass: false`。

**影响**：如果所有 episodes 都是 `blocked` 或 `pending`，系统报告生成失败而不是识别 batch 已完成。

---

### OBS-2：`onBlockCompleted` 错误传播并停止剩余 blocks

**文件**：`src/main/application/workspace/generate-detailed-outline.ts:400-406`

**证据**：`await input.onBlockCompleted(...)` 如果 callback 抛出错误，for...of 循环终止，剩余 blocks 不再处理。

**影响**：单次持久化失败导致整个详细大纲生成中止。

---

### OBS-3：`runScriptGenerationBatch` 内部从不发出 `batch_completed`——完全依赖调用者

**文件**：`src/main/application/script-generation/runtime/run-script-generation-batch.ts:168-171`

**证据**：函数只返回 `{ board, generatedScenes }`，从不设置 `batch_completed` status。`batch_completed` 只在 `start-script-generation.ts` 的所有下游处理成功后设置。

**影响**：如果 `startScriptGeneration` 在收到 batch 结果后、`batch_completed` 设置前崩溃，batch 保持在 `'running'` 状态。

---

### OBS-4：冗余持久化——最终的 `saveDetailedOutlineSegments` 重复 `onBlockCompleted` 的工作

**文件**：`src/main/ipc/workspace-generation-handlers.ts:126-130`

**问题**：每个 block 的 `onBlockCompleted` 已经持久化了相同的数据。最终的 save 是冗余的，但如果 `onBlockCompleted` 失败，最终 save 永远不会被调用。

**影响**：每次成功生成都有冗余磁盘 I/O，且失败时没有 fallback 持久化。

---

### OBS-5：`onBlockCompleted` callback 没有清理机制——资源泄漏潜在风险

**文件**：`src/main/application/workspace/generate-detailed-outline.ts:331-335`

**问题**：callback 是普通函数引用，没有 unsubscribe/cleanup 机制。如果 callback 持有资源（timers、listeners 等），不会显式清理。

---

### OBS-6：`batch_paused` 可能没有考虑 partial batch 完成

**文件**：`src/main/application/script-generation/runtime/run-script-generation-batch.ts:146-157`

**问题**：当 episode 2 失败时，返回包含 scenes 1 和 3，但恢复逻辑可能从 episode 2 重新开始而不考虑 episode 1 已完成。

**影响**：恢复可能重新生成已完成的 episodes 或产生重复 scenes。

---

## 2026-03-22 第三轮增量（persisted-vs-memory desync 新发现）

### DESYNC-6：`handleAutoRepair` 只持久化到内存，不持久化到磁盘

**文件**：`src/renderer/src/features/script/ui/useScriptStageActions.ts:266-279`

**证据**：

```typescript
async function handleAutoRepair(): Promise<void> {
  const result = await window.api.workflow.executeScriptRepair({...})
  upsertScript(result.repairedScript)  // ← 只更新内存 store
  // 没有调用 saveScriptDraft() !
}
```

**影响**：自动 repair 后，修复的剧本只存在于 renderer 内存中。如果用户在另一次生成/save 之前关闭应用，修复的剧本丢失。

---

### DESYNC-7：`handleStartGeneration` 从陈旧闭包捕获 `script`

**文件**：`src/renderer/src/features/script/ui/useScriptStageActions.ts:59,163-171`

**证据**：`const script = useStageStore((state) => state.script)` 在 callback 创建时捕获，而不是在生成完成时。

**问题**：如果在 callback 创建后、生成完成前 store 中的 `script` 改变了，内存追加和磁盘 save 都使用陈旧值，丢失期间的 scenes。

---

### DESYNC-8：`saveOutlineDraft`/`saveCharacterDrafts` 使用 `??` fallback 阻止有意 null

**文件**：`src/main/infrastructure/storage/project-store.ts:215`

**证据**：`storyIntent: input.storyIntent ?? existing.storyIntent`

**问题**：如果调用者有意传递 `null` 来清除 `storyIntent`，`??` 操作符会保留现有值而不是覆盖。

---

### DESYNC-9：`CharacterStage` 计算 `activeCharacterBlocks` 时没有 memoization guard

**文件**：`src/renderer/src/features/character/ui/CharacterStage.tsx:79-85`

**问题**：`activeCharacterBlocks` 在每次 render 时通过 IIFE 重新计算，然后 effect 更新 store。但 save 是 300ms debounced。如果用户在编辑后立即导航离开，编辑可能来不及 save。

---

### DESYNC-10：`waitForProject` 静默重试隐藏错误

**文件**：`src/main/ipc/workspace-generation-handlers.ts:18-26`

**证据**：重试 50 次（5 秒）然后静默返回 null，没有错误指示。调用者然后用 `project: null` 继续。

---

### DESYNC-11：`setDetailedOutlineSectionSummary` 同步更新 store 但 auto-save 是 debounced 300ms

**文件**：`src/renderer/src/store/useStageStore.ts:297-344`

**问题**：用户编辑触发立即 store 更新但磁盘持久化延迟 300ms。快速连续编辑只在最后触发一次 save。如果用户在编辑后 300ms 内导航离开，该编辑丢失。

---

### DESYNC-12：`enterProject` 执行完整 hydration 但不检查未保存的本地更改

**文件**：`src/renderer/src/features/home/ui/useHomePageActions.ts:161-178`

**问题**：如果用户有编辑（在内存 store 中）但尚未 save（300ms debounce 未触发），然后打开另一个项目，`hydrateProjectDrafts` 会用 project store 数据覆盖所有本地更改。未保存的编辑静默丢失。

---

### DESYNC-13：`handleAdd` 有 store-to-save 竞态条件

**文件**：`src/renderer/src/features/script/ui/ScriptStage.tsx:99-104`

**问题**：save 是 awaited 但 `replaceScript` 不是——如果 save 抛出，状态不一致。

---

### DESYNC-14：`useWorkspaceProjects` hooks 在外部更改后不同步 `activeProject`

**文件**：`src/renderer/src/app/hooks/useWorkspaceProjects.ts`

**问题**：`activeProject` 只在本地用户 save 时更新。如果同一项目被其他地方修改，`activeProject` 保留过时数据。

---

## 第三轮新增与已有问题的关系

| 本轮新增   | 最相关的已有问题                    | 区别                                                                        |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------- |
| NEW-REC-16 | NEW-REC-1（指纹验证失效）           | 指出 board 在 startScriptGeneration 被丢弃                                  |
| NEW-REC-17 | NEW-REC-4（resume 起点矛盾）        | 指出 resolveResumeFromBoard 不验证 episode 是否在 plan 中 ready             |
| NEW-REC-18 | NEW-REC-4（resume 起点矛盾）        | 指出单个 blocked episode 阻止所有 resume                                    |
| NEW-REC-19 | Issue 9（手动修改没有统一失效策略） | 指出 shouldReusePersistedBoard 不能检测脚本内容变化                         |
| NEW-REC-20 | NEW-REC-16                          | 指出 createInitialProgressBoard 的架构设计导致 episodeStatuses 永远不能保留 |
| NEW-REC-21 | NEW-REC-4（resume 起点矛盾）        | 指出 resolveResumeFromBoard 不考虑跨 batch 的 episodes                      |
| NEW-REC-22 | NEW-REC-9（race condition）         | 指出 failure history 和 runtime state 分开保存，无原子性保证                |
| OBS-1      | NEW-REC-18                          | 指出没有 ready episodes 时错误发出 batch_failed 而不是 batch_completed      |
| OBS-2      | NEW-REC-2                           | 指出 onBlockCompleted 错误会停止详细大纲生成                                |
| OBS-3      | NEW-REC-3                           | 指出 runScriptGenerationBatch 内部从不发出 batch_completed                  |
| OBS-4      | OBS-2                               | 指出详细大纲生成中 onBlockCompleted 和最终 save 的冗余持久化问题            |
| OBS-5      | —                                   | 指出 onBlockCompleted callback 没有清理机制                                 |
| OBS-6      | NEW-REC-18                          | 指出 batch_paused 时没有考虑 partial batch 完成                             |
| DESYNC-6   | —                                   | 指出 handleAutoRepair 只写内存不写磁盘                                      |
| DESYNC-7   | Issue 9                             | 指出 handleStartGeneration 使用陈旧闭包 script                              |
| DESYNC-8   | —                                   | 指出 ?? existing fallback 阻止有意 null                                     |
| DESYNC-9   | —                                   | 指出 CharacterStage activeCharacterBlocks 没有 memoization guard            |
| DESYNC-10  | —                                   | 指出 waitForProject 静默重试 50 次隐藏错误                                  |
| DESYNC-11  | DESYNC-12                           | 指出 setDetailedOutlineSectionSummary 同步更新但 debounced save             |
| DESYNC-12  | Issue 9                             | 指出 enterProject hydration 覆盖未保存的本地更改                            |
| DESYNC-13  | —                                   | 指出 handleAdd 的 save-then-replace 竞态条件                                |
| DESYNC-14  | —                                   | 指出 useWorkspaceProjects 在外部修改后不更新 activeProject                  |

---

## 第三轮验证建议

1. **NEW-REC-16**：在 `script-generation-runtime-handlers.ts:16` 加 log，观察 board 是否被使用还是被丢弃
2. **NEW-REC-17**：在 `resolveResumeFromBoard` 检查 `failedEpisode.episodeNo` 在 plan 中是否是 'ready'
3. **NEW-REC-18**：让一个 episode 成为 blocked 状态，检查 `canResume` 是否变成 false
4. **NEW-REC-19**：编辑剧本删掉几集，检查 board 的 episodeStatuses 是否与实际一致
5. **NEW-REC-20**：追踪 `createInitialProgressBoard`，确认 episodeStatuses 总是从 plan 重新生成
6. **NEW-REC-21**：制造 batch 1 有 blocked、batch 2 有 failed 的情况
7. **NEW-REC-22**：模拟 `saveScriptRuntimeState` 成功但 `saveScriptRuntimeStateFailureHistory` 失败
8. **OBS-1**：触发所有 episodes blocked，观察 batch 状态
9. **OBS-2**：让 `saveDetailedOutlineSegments` 在特定 block 抛出
10. **OBS-3**：在 `batch_completed` 设置前制造错误
11. **OBS-4**：监控磁盘 I/O
12. **OBS-6**：在 3-集 batch 中让 episode 2 失败
13. **DESYNC-6**：调用 handleAutoRepair 后检查 `scriptDraft` 是否更新
14. **DESYNC-7**：在生成期间手动添加 scene，检查是否有 scene 丢失
15. **DESYNC-8**：尝试有意将 storyIntent 设置为 null
16. **DESYNC-9**：快速编辑 characters 后立即导航离开
17. **DESYNC-10**：模拟 `getProject` 总是返回 null
18. **DESYNC-11**：快速连续编辑多个 section summary
19. **DESYNC-12**：在有未保存编辑时 enterProject
20. **DESYNC-13**：模拟 `saveScriptDraft` 失败
21. **DESYNC-14**：在另一个 tab 修改同一项目

---

## 第三轮优先级建议

### Resume/Failure Lifecycle

- **P0**：NEW-REC-16（board 被丢弃）+ NEW-REC-20（createInitialProgressBoard 架构）——resume 链完全失效的根因
- **P1**：NEW-REC-17（不验证 episode readiness）+ NEW-REC-18（blocked 阻止全部）+ NEW-REC-21（不考虑跨 batch）
- **P2**：NEW-REC-19（手动编辑不同步）+ NEW-REC-22（无原子性）

### Observer Completion Semantics

- **P0**：OBS-2（onBlockCompleted 错误停止生成）——详细大纲生成的致命缺陷
- **P1**：OBS-1（空 batch 报失败）+ OBS-3（batch_completed 从不内部发出）+ OBS-6（partial batch 不考虑）
- **P2**：OBS-4（冗余持久化）+ OBS-5（无清理机制）

### Persisted-vs-Memory Desync

- **P0**：DESYNC-6（handleAutoRepair 不持久化）+ DESYNC-12（enterProject 覆盖未保存）+ DESYNC-13（竞态）
- **P1**：DESYNC-7（陈旧闭包）+ DESYNC-11（debounced save 丢失）+ DESYNC-10（静默重试）
- **P2**：DESYNC-8（?? 阻止 null）+ DESYNC-9（无 memoization）+ DESYNC-14（外部修改不同步）
