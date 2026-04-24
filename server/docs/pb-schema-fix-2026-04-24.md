# PocketBase Schema 字段限制修复记录

## 日期
2026-04-24

## 问题描述
粗纲生成链路在 AI 生成成功后，`saveOutlineDraft` 阶段持续返回 400 错误。
经隔离测试，根因为 `outlineDraftJson` 字段存在 5000 字符的隐藏限制（PB text 字段默认行为），
而实际生成的 outline JSON 约 6830 字符，超出限制导致 `validation_max_text_constraint` 错误。

PB schema API 返回 `max: 0`（理论上无限制），但实际数据库层默认应用 5000 限制。
此为 PocketBase 已知行为：text 字段创建时若 max 留空或设为 0，可能仍受默认限制约束。

## 修复范围

以下 collection 的 JSON 存储 text 字段，max 从 0（实际默认 5000）改为 100000：

### 1. xinjuben_project_outlines
| 字段 | 原 max | 新 max | 说明 |
|------|--------|--------|------|
| outlineDraftJson | 0 (实际 5000) | 100000 | **真实需要大容量**：粗纲 JSON 通常 6000-15000 字符 |

### 2. xinjuben_project_characters
| 字段 | 原 max | 新 max | 说明 |
|------|--------|--------|------|
| characterDraftsJson | 0 (实际 5000) | 100000 | **真实需要大容量**：人物列表 JSON 通常 5000-20000 字符 |
| activeCharacterBlocksJson | 0 (实际 5000) | 100000 | **真实需要大容量**：人物块配置 JSON |

### 3. xinjuben_project_detailed_outlines
| 字段 | 原 max | 新 max | 说明 |
|------|--------|--------|------|
| detailedOutlineBlocksJson | 0 (实际 5000) | 100000 | **真实需要大容量**：细纲块 JSON 通常 10000-50000 字符 |
| detailedOutlineSegmentsJson | 0 (实际 5000) | 100000 | **真实需要大容量**：细纲段落 JSON |

### 4. xinjuben_projects
| 字段 | 原 max | 新 max | 说明 |
|------|--------|--------|------|
| generationStatusJson | 0 (实际 5000) | 100000 | 状态 JSON，通常较小，改为大容量兜底 |
| storyIntentJson | 0 (实际 5000) | 100000 | 故事意图 JSON，通常 2000-5000 字符，兜底 |
| entityStoreJson | 0 (实际 5000) | 100000 | **真实需要大容量**：实体库 JSON 可达 10000-50000 字符 |
| visibleResultJson | 0 (实际 5000) | 100000 | 可见结果 JSON，通常较小，兜底 |
| formalReleaseJson | 0 (实际 5000) | 100000 | 正式放行 JSON，通常较小，兜底 |

### 5. xinjuben_project_scripts（无需修改，已是大容量）
| 字段 | 当前 max | 说明 |
|------|----------|------|
| scriptDraftJson | 100000 | 已在之前修复 |
| scriptProgressBoardJson | 100000 | 已在之前修复 |
| scriptFailureResolutionJson | 100000 | 已在之前修复 |
| scriptRuntimeFailureHistoryJson | 100000 | 已在之前修复 |
| scriptStateLedgerJson | 100000 | 已在之前修复 |

## 验证
- curl PATCH 测试：15500 字符 JSON payload 已可通过
- 所有相关 collection 已批量修改

## 后续 TODO
- [ ] 将以上 schema 改动写入正式 migration 脚本（PocketBase Go migration 或 JS migration）
- [ ] 确保本地开发环境、测试环境、生产环境的 schema 一致
- [ ] 评估是否应将大 JSON 字段从 `text` 类型改为 `json` 类型（PB json 类型有 maxSize 限制，但行为更明确）
