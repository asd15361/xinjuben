# 正式链依赖清单（2026-03-31）

## 正式生产入口

### script-generation 核心入口

| 文件                                 | 角色                | 直接依赖                                                                                                               |
| ------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `start-script-generation.ts`         | 顶层 orchestrator   | `run-script-generation-batch`                                                                                          |
| `run-script-generation-batch.ts`     | **当前生产入口**    | `create-script-generation-prompt`, `generateTextWithRuntimeRouter`, `parseGeneratedScene`, `selectBatchEpisodesForRun` |
| `create-script-generation-prompt.ts` | **当前生产 prompt** | `build-*-blocks`, `build-script-ledger`                                                                                |
| `parse-generated-scene.ts`           | **当前生产 parser** | `extractStructuredSceneFromScreenplay`                                                                                 |
| `finalize-script-postflight.ts`      | 后处理              | `build-script-ledger`, `inspect-screenplay-quality`                                                                    |

### ai 核心入口

| 文件                    | 角色          | 直接依赖                                   |
| ----------------------- | ------------- | ------------------------------------------ |
| `generate-text.ts`      | AI 路由入口   | `resolveLaneRuntime`, `invokeDeepSeek`     |
| `ai-provider-invoke.ts` | DeepSeek 调用 | `createAbortSignal`, `normalizeAbortError` |

### storage 核心入口

| 文件               | 角色         | 直接依赖             |
| ------------------ | ------------ | -------------------- |
| `project-store.ts` | 主存储入口   | `read/write-shard`   |
| `read-index.ts`    | 项目索引读取 | `write-shard` (静态) |

---

## 原型/实验链（不在生产中）

| 文件                                              | 角色        | 状态                   |
| ------------------------------------------------- | ----------- | ---------------------- |
| `create-scene-generation-prompt.ts` (scene-level) | 原型 prompt | prototype-only         |
| `assemble-episode-scenes.ts`                      | 原型组装    | prototype-only         |
| `test-scene-p*.mjs`                               | 原型验证    | prototype verification |

---

## 依赖身份分类

### 正式运行依赖

- `run-script-generation-batch.ts` → `create-script-generation-prompt.ts`
- `run-script-generation-batch.ts` → `parse-generated-scene.ts`
- `create-script-generation-prompt.ts` → `build-*-blocks.ts`
- `generate-text.ts` → `ai-provider-invoke.ts`

### 测试依赖

- `*.test.ts` 文件仅用于测试

### 临时脚本依赖

- `tools/e2e/test-scene-p*.mjs` - 原型验证
- 根目录调试脚本

### 历史设计文档引用

- `docs/逐场生成设计.md` - 历史设计文档

---

## 隐性依赖（已修复）

| 文件                               | 问题                        | 状态           |
| ---------------------------------- | --------------------------- | -------------- |
| `read-index.ts`                    | 静态+动态双引用 write-shard | 已修复（上轮） |
| `project-generation-status-hub.ts` | 动态 import project-store   | 已修复（上轮） |
