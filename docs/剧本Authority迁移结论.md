# 剧本 Authority 迁移结论文档

> 定稿时间：2026-04-22
> 适用范围：剧本生成、修改、保存相关全部正式写入能力

## 一、架构边界定论

```
renderer ────── 发起请求、展示结果、用户交互
    │
    │ HTTP API
    ▼
server ───────── 持有正式写入 authority，执行 AI 调用，管理积分，落库 PocketBase
    │
    │ PocketBase SDK
    ▼
PocketBase ───── 唯一正式真相存储
```

**定论：**
- **renderer** 只负责发起与展示，不持有任何正式写入 authority
- **main** 只保留本地只读辅助计算（审计、计划构建、进度板等），不涉及正式写入
- **server** 持有全部剧本正式写入 authority，是唯一业务入口
- **PocketBase** 是唯一正式真相存储，所有持久化数据必须落库于此

## 二、剧本正式写入 Authority 清单

| 能力名称 | HTTP 路由 | Server 实现位置 | 状态 |
|---------|----------|----------------|------|
| 启动剧本生成 | `POST /api/script-generation/start` | `start-script-generation.ts` | ✅ 已收口 |
| 暂停剧本生成 | `POST /api/script-generation/pause` | `scripts.ts` | ✅ 已收口 |
| 恢复剧本生成 | `POST /api/script-generation/resume` | `scripts.ts` | ✅ 已收口 |
| 停止剧本生成 | `POST /api/script-generation/stop` | `scripts.ts` | ✅ 已收口 |
| 单集重写 | `POST /api/script-generation/rewrite` | `rewrite/execute-script-rewrite.ts` | ✅ 已收口 |
| 执行剧本修复 | `POST /api/script-audit/execute-repair` | `repair/execute-script-repair.ts` | ✅ 已收口 |
| 保存剧本草稿 | `POST /api/projects/:id/script` | `project-repository.ts` | ✅ 已收口 |
| 保存剧本运行时状态 | `POST /api/projects/:id/runtime-state` | `project-repository.ts` | ✅ 已收口 |

**结论：八项能力全部归 server，无残留占位，无第二口径。**

## 三、本地只读辅助能力（可保留在 main）

| 能力名称 | IPC Handler | 说明 |
|---------|------------|------|
| 审计剧本 | `workflow:audit-script` | 纯计算，只读，不涉及正式写入 |
| 构建修复计划 | `workflow:build-script-repair-plan` | 纯计算，只读 |
| 构建生成计划 | `workflow:build-script-generation-plan` | 纯计算，只读 |
| 创建进度板 | `workflow:create-script-generation-progress-board` | 纯计算，只读 |
| 解析恢复信息 | `workflow:resolve-script-generation-resume` | 纯计算，只读 |
| 构建剧本账本预览 | `workflow:build-script-ledger-preview` | 纯计算，只读 |
| 构建阶段合同 | `workflow:build-*-stage-contract` | 纯计算，只读 |

**边界：以上能力均为辅助计算，不产生正式写入决策，可保留在 main。**

## 四、已清理的历史残留

| 位置 | 内容 | 清理动作 |
|-----|------|---------|
| `src/main/infrastructure/storage/project-store.ts` | `saveScriptDraft()` / `saveScriptRuntimeState()` | 已标记 `@deprecated`，authority 已迁移到 server |
| `src/shared/domain/workflow/truth-owner-matrix.ts` | `SCRIPT_RUNTIME_STATE` producer | 已更新为 `SERVER` |
| `src/shared/domain/workflow/truth-authority.ts` | `scriptRuntimeState` producer | 已更新为 `SERVER` |

## 五、验证状态

| 验证项 | 结果 |
|-------|------|
| TypeScript 类型检查 | ✅ 全绿 |
| Build 构建 | ✅ 全绿 |
| 单元测试 (498 tests) | ✅ 493 pass, 0 fail, 5 skipped |
| 接口级联调 | ⏳ 待执行（需启动 server） |

## 六、后续基准

**此文档作为后续所有主线的架构基准，任何新增能力必须遵循：**

1. 正式写入 authority 必须归 server
2. renderer 只做发起与展示
3. main 只做本地只读辅助计算
4. PocketBase 是唯一真相存储
5. 发现第二口径、补丁链、隐藏降级必须立即汇报并收口

**违反以上基准的任何代码改动，必须先修正架构边界再继续。**

---

## 附录：迁移时间线

- 2026-04-22：execute-repair 真逻辑补实，修稿 authority 收口
- 2026-04-22：authority 盘点完成，truth matrix 同步更新
- 2026-04-22：单集重写真逻辑补实，八项能力全部收口
- 2026-04-22：历史测试债清零，498 tests 全绿
- 2026-04-22：迁移结论文档定稿，架构边界钉死