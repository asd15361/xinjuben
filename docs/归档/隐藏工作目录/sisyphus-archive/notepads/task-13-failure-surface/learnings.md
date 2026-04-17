# Task 13 Evidence: 统一失败/中断/部分完成时的持久化与错误输出

## 问题描述

禁止"运行失败但 UI/notice 看起来像成功或已推进"

## 根因分析

### 问题 1: \_persistState 没有错误处理

**文件**: `src/shared/domain/workflow/script-generation-orchestrator.ts`
**位置**: `_persistState` 方法 (lines 666-700)

**原始代码问题**:

```typescript
private async _persistState(...): Promise<void> {
  // ...
  await this._options.atomicSaveGenerationState({...})  // 如果这里抛出，错误会向上传播
  if (this._options.persistState) {
    await this._options.persistState({...})  // 这里也可能抛出
  }
}
```

**后果**:

- 如果 `atomicSaveGenerationState` 抛出，错误会传播到 catch block
- catch block 尝试再次调用 `_persistState`
- 如果 `_persistState` 再次抛出，`return` 语句永远不会被执行
- orchestrator 返回一个未捕获的异常，而不是一个有效的 failure result
- 这导致 split-brain：UI 可能显示错误但状态没有被持久化

### 问题 2: 成功路径没有检查持久化失败

**位置**: Phase 5 (lines 526-529)

**原始代码问题**:

```typescript
await this._persistState(null, null)  // 没有检查返回值
return { success: true, ... }  // 即使持久化失败也返回成功
```

### 问题 3: 运行时处理器 catch 块没有持久化失败状态

**文件**: `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
**位置**: catch block (lines 250-279)

**原始代码问题**:

```typescript
catch (error) {
  const failedBoard = ...
  finalizeRuntimeTask({...})  // 只更新 runtime task
  return {
    success: false,
    failure: createFailureResolution({...}),
    // 没有调用 atomicSaveGenerationState 持久化失败状态
  }
}
```

**后果**:

- 失败状态只在内存中，没有持久化
- 如果用户刷新页面，失败状态丢失
- 违反 authority-first 原则

## 修复方案

### 修复 1: \_persistState 返回持久化结果

```typescript
private async _persistState(...): Promise<{ persistenceFailed: boolean; persistenceError?: string }> {
  try {
    await this._options.atomicSaveGenerationState({...})
  } catch (persistError) {
    return { persistenceFailed: true, persistenceError: errorMessage }
  }
  // ...
  return { persistenceFailed: false }
}
```

### 修复 2: 成功路径检查持久化失败

```typescript
const persistResult = await this._persistState(null, null)
if (persistResult.persistenceFailed) {
  return {
    success: false, // 不再声称成功
    persistenceError: persistResult.persistenceError
    // ...
  }
}
```

### 修复 3: catch 块持久化失败状态

```typescript
catch (error) {
  // 先持久化失败状态
  try {
    await atomicSaveGenerationState({
      projectId,
      scriptProgressBoard: markedFailedBoard,
      scriptFailureResolution: createFailureResolution({...}),
      // ...
    })
  } catch (persistEx) {
    persistenceError = persistEx.message
  }
  // ...
  return { ..., persistenceError }
}
```

### 修复 4: 添加 persistenceError 到 DTO

```typescript
export interface StartScriptGenerationResultDto {
  // ...
  persistenceError?: string // 新增
}
```

## 验证

1. **typecheck 通过**: `npm run typecheck` 无错误
2. **split-brain 模式已消除**:
   - 持久化失败时返回 `success: false`
   - 持久化失败时包含 `persistenceError` 字段
   - catch block 确保失败状态被持久化

## 相关文件

- `src/shared/domain/workflow/script-generation-orchestrator.ts` - orchestrator 错误处理
- `src/main/ipc/workflow/script-generation-runtime-handlers.ts` - IPC 处理器错误处理
- `src/shared/contracts/script-generation.ts` - DTO 类型定义

## 依赖

- Task 11: orchestrator unified control plane ✓
- Task 12: stop/pause/continue unified ✓
- Authority-first pattern (authority-constitution.ts)
