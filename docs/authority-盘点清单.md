# Authority 盘点清单

> 盘点时间：2026-04-22
> 盘点范围：renderer / main / server / PocketBase 四层

## 一、剧本正式写入 Authority

| 能力名称 | 当前 Owner | 是否正式 Authority | 是否已后端化 | 残留风险 | 后续动作 |
|---------|-----------|------------------|------------|---------|---------|
| 启动剧本生成 | server (`/api/script-generation/start`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 暂停剧本生成 | server (`/api/script-generation/pause`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 恢复剧本生成 | server (`/api/script-generation/resume`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 停止剧本生成 | server (`/api/script-generation/stop`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 单集重写 | server (`/api/script-generation/rewrite`) | ✅ 是 | ✅ 是 | 无 | **已收口** |
| 执行剧本修复 | server (`/api/script-audit/execute-repair`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 保存剧本草稿 | server (`/api/projects/:id/script`) | ✅ 是 | ✅ 是 | 无 | 无 |
| 保存剧本运行时状态 | server (`/api/projects/:id/runtime-state`) | ✅ 是 | ✅ 是 | 无 | 无 |

**结论：剧本正式写入 authority 已全部收口到 server，无残留占位。**

---

## 二、本地只读辅助能力（可保留在 main）

| 能力名称 | 当前 Owner | 是否正式 Authority | 说明 |
|---------|-----------|------------------|------|
| 审计剧本 | main (IPC `workflow:audit-script`) | ❌ 否 | 纯计算，只读 |
| 构建修复计划 | main (IPC `workflow:build-script-repair-plan`) | ❌ 否 | 纯计算，只读 |
| 构建生成计划 | main (IPC `workflow:build-script-generation-plan`) | ❌ 否 | 纯计算，只读 |
| 创建进度板 | main (IPC `workflow:create-script-generation-progress-board`) | ❌ 否 | 纯计算，只读 |
| 解析恢复信息 | main (IPC `workflow:resolve-script-generation-resume`) | ❌ 否 | 纯计算，只读 |
| 创建失败处理方案 | main (IPC `workflow:create-script-generation-failure-resolution`) | ❌ 否 | 纯计算，只读 |
| 构建剧本账本预览 | main (IPC `workflow:build-script-ledger-preview`) | ❌ 否 | 纯计算，只读 |
| 构建阶段合同 | main (IPC `workflow:build-*-stage-contract`) | ❌ 否 | 纯计算，只读 |

**结论：以上能力均为纯计算、只读辅助，不涉及正式写入，可保留在 main。**

---

## 三、历史残留逻辑（需清理）

| 位置 | 内容 | 风险 | 清理动作 |
|-----|------|-----|---------|
| `src/main/infrastructure/storage/project-store.ts` | `saveScriptDraft()` / `saveScriptRuntimeState()` | ⚠️ 高：与 server 写入并存，可能双写 | **标记为废弃**，添加注释说明已迁移到 server |
| `src/shared/domain/workflow/truth-owner-matrix.ts` | 定义 `SCRIPT_RUNTIME_STATE` producer 为 `MAIN` | ⚠️ 中：文档与实际不符 | **更新为 `SERVER`** |

---

## 四、双轨入口风险（需确认）

| 调用方 | IPC 调用 | HTTP 调用 | 状态 |
|-------|---------|----------|------|
| `useScriptAudit.ts` | `auditScript`, `buildScriptRepairPlan` | `apiExecuteScriptRepair` | 半迁移，审计仍 IPC，执行 HTTP |
| `useScriptGenerationRuntime.ts` | `createScriptGenerationProgressBoard`, `resolveScriptGenerationResume` 等 | 无 | 未迁移，但纯计算，无风险 |
| `useStageContractSummary.ts` | `buildOutlineStageContract` 等 | 无 | 未迁移，但纯计算，无风险 |
| `useProjectStagePersistence.ts` | 无 | `apiSaveScriptDraft` | ✅ 已迁移 |
| `useWorkspaceProjects.ts` | 无 | `apiSaveScriptDraft`, `apiSaveScriptRuntimeState` | ✅ 已迁移 |

---

## 五、迁移现状总结

### 已后端化（正式写入 authority 在 server）
- 剧本生成控制（start/pause/resume/stop/rewrite）
- 剧本修复执行
- 剧本草稿保存
- 剧本运行时状态保存

### 保留本地（纯计算、只读辅助）
- 剧本审计
- 修复计划构建
- 生成计划构建
- 进度板管理
- 恢复解析
- 失败处理方案构建
- 账本预览
- 阶段合同构建

### 残留风险（需清理）
- `project-store.ts` 中 `saveScriptDraft` / `saveScriptRuntimeState` 需标记废弃
- `truth-owner-matrix.ts` 中 `SCRIPT_RUNTIME_STATE` producer 需更新为 `SERVER`

---

## 六、收口结论

- 剧本正式写入 authority 八项能力全部归 server，无残留占位
- main 端保留的八项纯计算辅助能力不涉及正式写入，可保留
- 残留清理已完成：project-store.ts 废弃标记、truth-owner-matrix.ts 同步更新
- 后续可选：接口级联调、历史测试债务
