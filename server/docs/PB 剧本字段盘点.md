# PocketBase 剧本相关字段盘点

## 现状：写入 PB 的 JSON 字段

### `projects` 表（项目元数据）

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `generationStatusJson` | json | 剧本生成状态（进度、当前集数等） | ❌ 应退出 | 本地存储，PB 只留状态摘要 |
| `storyIntentJson` | json | 故事意图包（核心创意、类型、基调） | ⚠️ 可保留 | 这是元数据，通常不超过 5KB |
| `entityStoreJson` | json | 实体存储（人物/势力/地点/物品） | ⚠️ 可保留 | 这是元数据，通常不超过 50KB |
| `visibleResultJson` | json | 可见结果状态（UI 展示用） | ❌ 应退出 | 这是 UI 状态，不应存 PB |
| `formalReleaseJson` | json | 正式放行状态（质量门评估） | ❌ 应退出 | 这是流程状态，不应存 PB |

### `project_chats` 表

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `messagesJson` | json | 聊天消息历史 | ❌ 应退出 | 可能非常大，应本地存储 |

### `project_outlines` 表

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `outlineDraftJson` | json | 大纲草稿 | ⚠️ 边界情况 | 大纲通常 <100KB，可保留或本地 |

### `project_characters` 表

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `characterDraftsJson` | json | 人物草稿列表 | ⚠️ 边界情况 | 人物列表通常 <50KB，可保留 |
| `activeCharacterBlocksJson` | json | 激活的人物块 | ⚠️ 边界情况 | 通常较小，可保留 |

### `project_detailed_outlines` 表

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `detailedOutlineBlocksJson` | json | 详细大纲块 | ⚠️ 边界情况 | 可能较大，建议本地 |
| `detailedOutlineSegmentsJson` | json | 详细大纲片段 | ⚠️ 边界情况 | 可能较大，建议本地 |

### `project_scripts` 表（**高风险**）

| 字段 | 类型 | 用途 | 是否应退出 PB | 建议 |
|------|------|------|--------------|------|
| `scriptDraftJson` | json | **剧本草稿正文** | ✅ **必须退出** | 这是核心内容数据，单集 5KB+，全集 500KB+ |
| `scriptProgressBoardJson` | json | 剧本生成进度板 | ❌ 应退出 | 这是运行时状态 |
| `scriptFailureResolutionJson` | json | 失败解决方案 | ❌ 应退出 | 这是运行时状态 |
| `scriptRuntimeFailureHistoryJson` | json | 运行时失败历史 | ❌ 应退出 | 这是调试日志 |
| `scriptStateLedgerJson` | json | 剧本状态分类账 | ❌ 应退出 | 这是运行时状态 |

---

## 必须退出 PB 的字段清单（高优先级）

### 第一梯队：剧本正文和大 JSON（立即退出）

1. **`project_scripts.scriptDraftJson`** - 剧本草稿正文
   - 大小：单集 5-15KB，全集 100-500KB+
   - 用途：正式剧本内容
   - 迁移：本地文件/SQLite 存储，按 `userId/projectId/episodeNo` 组织

2. **`project_scripts.scriptProgressBoardJson`** - 生成进度板
   - 大小：5-20KB
   - 用途：批次生成进度追踪
   - 迁移：本地运行时状态，关闭可不保存

3. **`project_scripts.scriptRuntimeFailureHistoryJson`** - 失败历史
   - 大小：1-50KB（累积）
   - 用途：调试/诊断
   - 迁移：本地日志文件

4. **`project_scripts.scriptStateLedgerJson`** - 状态分类账
   - 大小：5-10KB
   - 用途：生成状态机追踪
   - 迁移：本地运行时状态

### 第二梯队：流程状态（建议退出）

5. **`projects.visibleResultJson`** - 可见结果状态
6. **`projects.formalReleaseJson`** - 正式放行状态
7. **`project_chats.messagesJson`** - 聊天历史

### 第三梯队：边界情况（可讨论）

8. **`projects.generationStatusJson`** - 生成状态（小，但属于运行时）
9. **`project_detailed_outlines.*`** - 详细大纲（可能较大）

---

## 可保留在 PB 的字段（元数据/索引）

| 字段 | 原因 |
|------|------|
| `projects.storyIntentJson` | 核心元数据，通常 <5KB，用于项目列表展示 |
| `projects.entityStoreJson` | 人物/势力索引，通常 <50KB，用于跨项目引用 |
| `project_outlines.outlineDraftJson` | 大纲是结构化元数据，通常 <100KB |
| `project_characters.*` | 人物卡片是索引数据，通常 <50KB |

**判断标准：**
- **元数据/索引** → 可保留 PB（用于跨设备同步、项目列表展示）
- **正文/运行时状态** → 必须本地（用户创作内容、临时状态、调试日志）

---

## PB 应保留的轻量 metadata

```typescript
interface ProjectMetadata {
  id: string
  userId: string
  name: string           // 项目名称
  workflowType: string   // 'ai_write' | 'manual'
  stage: string          // 'chat' | 'outline' | 'characters' | 'detailed_outline' | 'script'
  genre: string          // 类型
  updatedAt: string      // 更新时间
  // 以下可选
  statusSummary?: string // "已完成 3/10 集"
  lastScriptEpisode?: number // 最新集数
}
```

**不应再存：**
- 完整剧本正文（`scriptDraftJson`）
- 完整聊天历史（`messagesJson`）
- 运行时状态板（`scriptProgressBoardJson`）
- 失败历史日志（`scriptRuntimeFailureHistoryJson`）

---

## 迁移策略

1. **立即执行**：`scriptDraftJson` 迁出 PB → 本地
2. **短期执行**：其他 `project_scripts.*` 字段迁出
3. **中期执行**：`visibleResultJson`/`formalReleaseJson` 简化或迁出
4. **长期保留**：`storyIntentJson`/`entityStoreJson` 作为元数据索引

**兼容方案：**
- 已扩容的 PB 字段（max=100000）作为迁移期兼容
- 新数据默认写本地，PB 只写 metadata
- 老数据可逐步迁移或不迁移（用户选择）
