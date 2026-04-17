# 粗纲分块生成分析

## 分析时间

2026-03-20

---

## 一、当前流程分析

### 1.1 `generateOutlineBundle()` 全季一次生成

**位置**: `src/main/application/workspace/generate-outline-and-characters-support.ts:216-235`

```typescript
export async function generateOutlineBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
}): Promise<OutlineBundlePayload | null>
```

**行为**:

- 调用 `buildOutlineGenerationPrompt(generationBriefText)` 生成全季提示词
- 一次 AI 调用返回整季大纲（所有 episodes + blocks）
- 无 block 范围参数

### 1.2 `buildOutlineGenerationPrompt()` 全季提示词

**位置**: `src/main/application/workspace/generation-stage-prompts.ts:5-46`

**当前 prompt 结构**:

```
你是短剧编剧助手。
这一工序只负责粗纲：先给整季总方向，再把整季拆成按集可推进的主线骨架。
...
输出严格 JSON：
{
  "storyIntent": {...},
  "outline": {
    "title": string,
    "episodes": [{"episodeNo": number, "summary": string}],
    "blocks": [{"blockNo": number, "startEpisode": number, "endEpisode": number, "summary": string}],
    ...
  }
}
写法重点：
0. 整季先给一句总方向
1. 每集只保留一个最主要的推进动作
2. 每 10 集要形成一个规划块
3. 每集都要带出当前最直接的压强
4. 每集结尾都要留下下一集继续点开的理由
5. 正式角色直接写进分集
```

**问题**: 无每集字数限制

### 1.3 `generateOutlineAndCharactersFromChat()` 主流程

**位置**: `src/main/application/workspace/generate-outline-and-characters.ts:27-220`

**调用顺序**:

```
1. summarizeChatForGeneration() → generationBriefText
2. extractEpisodeCountFromGenerationBrief() → targetEpisodeCount
3. generateOutlineBundle() ← 全季一次调用
4. normalizeOutlineStoryIntent() + fallback 处理
5. buildOutlineBlocks(summaryEpisodes, planningUnitEpisodes) ← 本地构建 blocks
6. generateCharacterBundle() ← 全季一次调用
7. buildCharacterBlocks()
```

### 1.4 `planningUnitEpisodes` = 10

**来源**: `src/main/application/workspace/generate-outline-and-characters.ts:83`

```typescript
planningUnitEpisodes: 10
```

**默认值定义**: `src/shared/domain/workflow/planning-blocks.ts:13`

```typescript
const DEFAULT_OUTLINE_BLOCK_EPISODES = 10
```

### 1.5 `OutlineBlockDto` 结构

**位置**: `src/shared/contracts/workflow.ts:26-33`

```typescript
interface OutlineBlockDto {
  blockNo: number
  label?: string
  startEpisode: number
  endEpisode: number
  summary: string
  episodes: OutlineEpisodeDto[]
}
```

---

## 二、分块设计方案

### 2.1 新函数签名

```typescript
// 改现有函数为分块版本
async function generateOutlineBlockBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
  blockRange: { startEpisode: number; endEpisode: number }
  previousBlockSummary?: string // 前一块的摘要，用于连续性
}): Promise<{
  episodes: Array<{ episodeNo: number; summary: string }>
  blockSummary: string // 本块总方向
}>
```

### 2.2 修改 `buildOutlineGenerationPrompt` 参数

**原签名**:

```typescript
export function buildOutlineGenerationPrompt(generationBriefText: string): string
```

**新签名**:

```typescript
export function buildOutlineGenerationPrompt(input: {
  generationBriefText: string
  blockRange?: { startEpisode: number; endEpisode: number }
  previousBlockSummary?: string
}): string
```

### 2.3 Prompt 改动点

在"写法重点"部分新增:

```
6. 每集摘要不超过100字（超过则截断）
```

在 blockRange 存在时，prompt 需包含:

- 明确告知当前生成的是第 N-M 集
- 提供上一块的摘要（如有）用于连续性

### 2.4 主流程改造

```typescript
// 原流程
outlineBundle = await generateOutlineBundle({ generationBriefText, runtimeConfig })

// 新流程
const targetEpisodeCount = ...
const blockSize = 10
const totalBlocks = Math.ceil(targetEpisodeCount / blockSize)
const allEpisodes = []
const allBlockSummaries = []

for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
  const startEpisode = blockIndex * blockSize + 1
  const endEpisode = Math.min(startEpisode + blockSize - 1, targetEpisodeCount)

  const blockResult = await generateOutlineBlockBundle({
    generationBriefText,
    runtimeConfig,
    blockRange: { startEpisode, endEpisode },
    previousBlockSummary: allBlockSummaries[blockIndex - 1]
  })

  allEpisodes.push(...blockResult.episodes)
  allBlockSummaries.push(blockResult.blockSummary)
}
```

### 2.5 顺序依赖

块必须顺序生成（block 1 → block 2 → ...），因为:

- 后续块需要前一块的摘要来保证连续性
- 这是一次 AI 调用，块之间无法并行

---

## 三、关键发现

### 3.1 当前 fallback 机制

如果 `generateOutlineBundle()` 失败，会 fallback 到:

- `deriveFallbackEpisodes()`: 本地生成默认 episodes
- `buildOutlineBlocks()`: 本地构建 blocks

分块版本同样需要 fallback 机制。

### 3.2 `planningUnitEpisodes` 硬编码

目前 `planningUnitEpisodes: 10` 是硬编码在 `generateOutlineAndCharactersFromChat` 中的。如果要支持可配置，需要从配置或 storyIntent 中读取。

### 3.3 人物包依赖大纲块

`generateCharacterBundle()` 需要 `outlineBlocks` 来确定每个角色活跃的块。分块生成时，需要等所有块生成完毕后再调用人物生成（当前流程已如此）。

---

## 四、待确认事项

1. **block 之间的连续性**: 前一块摘要需要包含多少信息？全季总方向还是上一块的结尾钩子？
2. **失败重试**: 某个块生成失败时，是重试该块还是整个流程重来？
3. **字数限制执行**: ≤100 chars 是 AI 承诺还是需要后处理截断？

---

## 五、实现记录 (2026-03-20)

### 5.1 实现的变更

#### 1. `generation-stage-prompts.ts` 新增 `buildBlockOutlinePrompt`

```typescript
export function buildBlockOutlinePrompt(input: {
  generationBriefText: string
  blockRange: { start: number; end: number }
  previousBlockSummary: string | null
}): string
```

**变更点**:

- 新增 prompt 生成函数，支持分块生成
- 接受 `blockRange` 指定当前块的集数范围
- 接受 `previousBlockSummary` 作为前一块上下文
- 在"写法重点"中添加了 `6. 每集摘要不超过100字`
- 当存在前一块摘要时，提供连续性上下文

#### 2. `generate-outline-and-characters-support.ts` 新增 `generateBlockOutlineBundle`

```typescript
export interface BlockOutlinePayload {
  episodes: Array<{
    episodeNo?: number
    summary?: string
  }>
}

export async function generateBlockOutlineBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
  blockRange: { start: number; end: number }
  previousBlockSummary: string | null
}): Promise<BlockOutlinePayload | null>
```

#### 3. `generate-outline-and-characters.ts` 修改 `generateOutlineAndCharactersFromChat`

**变更点**:

- 将原来的单次 `generateOutlineBundle` 调用改为循环调用 `generateBlockOutlineBundle`
- 分块大小: 5 集/块 (`BLOCK_SIZE = 5`)
- 每块生成后累积 episodes 和 previousBlockSummary
- 构建兼容性的 outlineBundle 供后续代码使用

**新流程**:

```
1. summarizeChatForGeneration() → generationBriefText
2. extractEpisodeCountFromGenerationBrief() → targetEpisodeCount
3. 循环 generateBlockOutlineBundle() → 累积 allGeneratedEpisodes
4. build outlineBundle from allGeneratedEpisodes
5. normalizeOutlineStoryIntent() + fallback 处理
6. buildOutlineBlocks(summaryEpisodes, planningUnitEpisodes)
7. generateCharacterBundle()
8. buildCharacterBlocks()
```

### 5.2 保留的原有函数

- `generateOutlineBundle` - 未修改，保留原功能
- `buildOutlineGenerationPrompt` - 未修改，保留原功能

### 5.3 验证

- `npm run build` 通过
- 类型检查通过

### 5.4 待优化项

1. 考虑添加失败重试机制（当前块失败时继续 fallback）
2. 考虑添加字数截断后处理（目前依赖 AI 遵守 100 字限制）
