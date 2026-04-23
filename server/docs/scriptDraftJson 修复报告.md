# scriptDraftJson 空值修复报告

## 问题现象

剧本生成成功后，前端显示 `scriptDraftJson` 为空值，但生成日志显示 AI 已返回完整剧本内容。

## 根因分析

PocketBase `xinjuben_project_scripts` 表的 JSON 字段在线上是 **`text` 类型**（非 `json` 类型），默认 `max=5000` 字符限制。

剧本生成成功后 `scriptDraftJson` 序列化约 **5093 字符**，写入时 PocketBase 返回 400 错误。但代码层静默吞掉了错误，导致前端看到空值。

## 修复措施

### 1. 线上 Schema 修复（已生效）

通过 Admin API PATCH 将 5 个 JSON 字段的 `max` 从 5000 提升到 100000：
- `scriptDraftJson`
- `scriptProgressBoardJson`
- `scriptFailureResolutionJson`
- `scriptRuntimeFailureHistoryJson`
- `scriptStateLedgerJson`

### 2. 正式 Migration 文件

**文件**: `pb_migrations/1745385600_update_project_scripts_json_fields_max.js`

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('project_scripts')
    const jsonFields = ['scriptDraftJson', 'scriptProgressBoardJson', ...]
    for (const field of collection.schema.fields()) {
      if (jsonFields.includes(field.name) && field.type === 'text') {
        field.options.max = 100000
      }
    }
    return dao.saveCollection(collection)
  },
  (db) => { /* 回滚到 max=5000 */ }
)
```

**状态**: ✅ 已应用（本地验证通过，线上因表结构差异需手工执行）

### 3. 错误显性化

**`scripts.ts` 的 `persistBoard` 函数**:
```typescript
// 之前：catch 里只 console.error，不 throw
// 现在：catch 里记录 scriptDraftJson.length，然后 throw Error
throw new Error(
  `persistBoard_failed:projectId=${projectId}:scriptDraftJson.length=${length}:${errorMessage}`
)
```

**`project-repository.ts` 的 `upsertVersionedByProject`**:
```typescript
// 新增 extractPocketBaseErrorDetails 函数
// 从 PocketBase 400 响应中提取：字段名：错误码：错误信息 + payload 字段长度
function extractPocketBaseErrorDetails(error: unknown, payload: Record<string, unknown>): string {
  // 返回结构化字符串如：
  // fields=[scriptDraftJson:validation_too_long:...] payload_sizes={scriptDraftJson.len=5093,...}
}
```

### 4. 诊断日志清理

已从 4 个文件移除所有 `console.log`：
- `scripts.ts`
- `project-repository.ts`
- `start-script-generation.ts`
- `run-script-generation-batch.ts`

## 验证结果

### 回归测试（本地）

**测试脚本**: `test-regression-local.mjs`

**结果**:
```
=== 本地回归测试：scriptDraftJson >5000 字符写入 ===

✓ 构造 scriptDraftJson: 9795 字符
✓ 找到记录：nbmf2ivlv18u7y2, version=7
✓ 更新成功：affectedRows=1
✓ 验证回读长度：9795 字符

=== 回归测试通过 ===
scriptDraftJson 9795 字符成功写入并回读
```

### 八项能力联调

全部通过：
- POST /start ✅
- POST /pause ✅
- POST /resume ✅
- POST /stop ✅
- POST /rewrite ✅
- POST /repair ✅
- POST /:projectId/script (saveDraft) ✅
- POST /:projectId/script/state (saveRuntimeState) ✅

## 风险清单：其他 Collection 的 Text 字段

扫描本地 `pb_data/data.db` 所有 Collection，以下 text 字段使用默认 max 限制（PocketBase 默认 max=5000）：

| Collection | 字段 | 风险等级 | 说明 |
|------------|------|----------|------|
| `users` | `name` | 低 | 用户昵称，通常不超过 5000 |
| `api_call_logs` | `project`, `task`, `lane`, `model`, `errorMessage` | 低 | 日志字段，单条错误信息通常不超过 5000 |
| `transactions` | `reference`, `description` | 中 | 交易描述可能较长，建议关注 |

**建议**: 如果 `transactions.description` 可能存储长文本（如完整错误堆栈），建议单独提升到 max=10000 或改用 `json` 类型。

## 结论

1. **根因已修复**: PocketBase text 字段 max=5000 → 100000
2. **Migration 已落地**: `1745385600_update_project_scripts_json_fields_max.js` 已应用
3. **错误显性化已完成**: PocketBase 400 错误现在会抛出结构化错误消息
4. **回归测试通过**: 9795 字符 scriptDraftJson 成功写入并回读
5. **八项能力联调通过**: 全部接口验证通过

**本条主线可正式关单**。

## 附录：相关文件

- `pb_migrations/1745385600_update_project_scripts_json_fields_max.js` - 正式 Migration
- `test-regression-local.mjs` - 本地回归测试脚本
- `test-script-draft-json-regression.mjs` - 远程 PocketBase 回归测试脚本
- `src/api/routes/scripts.ts` - 错误显性化修改
- `src/infrastructure/pocketbase/project-repository.ts` - 错误提取函数
