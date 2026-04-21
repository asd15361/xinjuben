# Code Review

**Spec unavailable; reviewed against code and diff only.**

## Findings

### P3: LoginModal 错误处理丢失 shouldLogin 字段

- **File**: `src/renderer/src/components/LoginModal.tsx:62-67`
- **Trigger**: 服务器返回 `{ shouldLogin: true, message: '...', error: 'email_exists' }` 时，客户端通过类型断言 `err as { shouldLogin?: boolean }` 提取字段
- **Impact**: 功能正常，但错误对象缺少类型定义，后续维护可能误删
- **Fix**: 在 api-client.ts 中定义 `RegistrationConflictError` 类型，或让 ApiError 类扩展 shouldLogin 字段

### P3: LoginModal 底部 set 辅助函数冗余

- **File**: `src/renderer/src/components/LoginModal.tsx:261-264`
- **Trigger**: 组件底部定义了独立的 `function set(state)` 函数，仅用于设置 error
- **Impact**: 代码冗余，可直接调用 `useAuthStore.setState({ error })` 或使用 store 的 set
- **Fix**: 删除辅助函数，直接用 `useAuthStore.setState({ error: '...' })`

---

## Clean Items Verified

| Item | Status |
|------|--------|
| server/src/index.ts CORS 配置 | OK - 正确添加 5174 端口 |
| project-repository.ts sort 移除 | OK - 修复了 updated 字段不存在的 400 错误 |
| api-client.ts apiConfirmStoryIntentFromChat | OK - 遵循现有模式 |
| api-client.ts ApiError 类 | OK - 正确处理 401/402 状态码 |

---

## Diagnosis

本次改动主要是大规模删除旧代码（server/src/shared/、src/main/application/ 等），关键改动仅 4 处。代码质量良好，发现的问题均为 P3 级别的次要改进点，不影响功能正确性。
