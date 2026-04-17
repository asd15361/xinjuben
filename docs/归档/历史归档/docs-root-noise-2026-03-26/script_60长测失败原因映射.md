# script_60 长测失败原因映射

更新时间：2026-03-21

---

## 最新状态补充（已用最新真实验收结果覆盖旧样本）

- 旧样本（仅作历史记录）：曾有一轮 `script_60` 在 **944.9s** 后以 **exit 1** 退出，且 stdout 没有打印最终结果。
- 当前以 A 最新核定的真实验收结果为准：
  - 总墙钟：**1071.5s**
  - 剧本生成耗时：**154.6s**
  - 形式质量：**已基本过线，5 集都是真实正式剧本**
  - `legacyFormat = null/false`
  - `mockEvidence = false`
  - `postflightIssues = 0`
  - 当前只剩 **1 个硬门槛：第 2 集集尾钩子偏弱**

> 当前唯一有效的主参考样本，是下面这轮 **1071.5s** 的已归因真实验收结果；944.9s 那轮和 904.3s 那轮都只保留为历史背景，不再参与当前门禁判断。

---

## 这份文档是干什么的

这不是泛问题清单，而是**当前真实长测为什么还不能宣布上线**的会审文档。

只回答 4 个问题：

1. 当前 `script_60` 真实长测卡在哪里
2. 哪些是**硬门**，哪些只是**软门/提示**
3. 哪些代码在真正裁判这件事
4. 现在离“可以上线”还差什么

---

## 当前结论

**还不能说“可以上线”。**

当前真实状态不是：

- 前端没修完
- mock 还没去掉
- 链路根本跑不通

而是：

> **真实 `script_60` 长测还没有稳定通过最终质量门。**

---

## 当前已确认的真实状态

- `script_60` 已经能真实生成 **5 集正式剧本**
- `mockEvidence = false`
- 最新一次真实验收结果里：
  - 总墙钟：**1071.5s**
  - 剧本生成耗时：**154.6s**
  - 形式质量：**已基本过线，5 集都是真实正式剧本**
  - `legacyFormat = null/false`
  - `mockEvidence = false`
  - `postflightIssues = 0`
  - 实质质量：**已逼近上线标准，但仍未最终通过**

### 当前剩余失败已收缩为

1. **第 2 集：集尾钩子偏弱**
2. **其余此前问题已过门**：
   - 不再有场次数误判
   - 不再有超长门问题
   - 不再有低字数门问题
   - 不再有 `legacyFormat` 退化
   - 不再有 mock 证据
   - `postflightIssues = 0`

---

## 失败原因映射表

| 失败现象             | 当前事实                      | 触发代码                                                                                      | 类型         | 是否阻塞当前上线         | 说明                                                                               |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- | ------------ | ------------------------ | ---------------------------------------------------------------------------------- |
| 第 2 集集尾钩子偏弱  | 当前只剩第 2 集仍存在钩子不足 | `src/shared/domain/script/screenplay-quality.ts:98`                                           | 硬质量门     | **是**                   | `hookWindow` 里如果没有 concrete hard hook，就会进入 `problems`，该集 `pass=false` |
| 场次数不在 2-3 场    | 此前曾是主失败项，当前已过门  | `src/shared/domain/script/screenplay-quality.ts:95`                                           | 已解决硬门   | **否（当前样本）**       | 说明 scene count 误判 / 收口控制已明显改善                                         |
| 字数超过 800         | 此前曾是主失败项，当前已过门  | `src/shared/domain/script/screenplay-quality.ts:97`                                           | 已解决硬门   | **否（当前样本）**       | 说明 overlong 收口已明显改善                                                       |
| 任一集失败后整批退出 | 主链仍然如此                  | `src/main/application/script-generation/runtime/run-script-generation-batch.ts:116-126`       | 架构级硬失败 | **是**                   | 任一集失败会 `throw ScriptBatchGenerationError(...)`，整批中断                     |
| 多通道路由未真正生效 | 当前仍是 deepseek-only 倾向   | `src/shared/domain/policy/runtime/runtime-policy.ts:77-89` + `src/main/ipc/ai-handlers.ts:13` | 架构级限制   | **是（系统性背景阻塞）** | 即使配置了 第二模型 lane，也仍有 deepseek-only 过滤                                  |

---

## 硬门 / 软门对照

## 一、硬门（不过就不能说上线）

### 1. 场次数与收口质量门

文件：`src/shared/domain/script/screenplay-quality.ts`

关键代码：

```ts
const minChars = scenes.length <= 2 ? 320 : 420

if (scenes.length < 2 || scenes.length > 3) problems.push('场次数不在2-3场')
if (charCount < minChars) problems.push(`字数低于${minChars}字合同`)
if (charCount > 800) problems.push('字数超过800字合同')
if (!hookWindow.some((line) => hasConcreteHardHook(line))) problems.push('集尾钩子偏弱')

pass: problems.length === 0
```

### 当前真实规则

- **场次数**：必须在 `2-3` 场
- **2 场集**：至少 `320` 字
- **3 场集**：至少 `420` 字
- **超过 800** 也算违规
- **集尾钩子**：必须落进 concrete hard hook

### 对上线判断的意义

这不是审美问题，也不是建议项。

> **这是代码里的硬质量合同。当前真正没稳住的重点已经进一步收缩成“最后一个钩子强度问题”。**

只要某集没过，这轮质量报告就不能算稳定通过。

---

### 2. 单集失败整批中断

文件：`src/main/application/script-generation/runtime/run-script-generation-batch.ts`

关键代码：

```ts
if (!scene) {
  ...
  throw new ScriptBatchGenerationError(...)
}
```

### 对上线判断的意义

> 任何一集生成失败，不是局部失败，而是整批退出。

这会直接放大长测的不稳定性。

---

### 3. 模型路由硬编码 deepseek

文件：

- `src/shared/domain/policy/runtime/runtime-policy.ts`
- `src/main/ipc/ai-handlers.ts`

关键代码：

```ts
const activeLanes = enabledLanes.filter((lane): lane is ModelRouteLane => lane === 'deepseek')
```

### 对上线判断的意义

> 多通道路由设计还在，但当前真正可用的路由灵活性没有完全打开。

这意味着长测在高风险场景下的调度空间仍受限。

---

## 二、软门（提示问题，不是当前唯一阻塞）

当前最新一轮真实验收里，A 已经把主失败点收缩为：

- **第 2 集集尾钩子偏弱**

之前的场次数不稳、overlong 收口不稳，以及更早那条 `f6_playability_postflight_weak`，都已经不再是这轮主参考失败项。

---

## repair 层现在怎么参与这件事

文件：`src/main/application/script-generation/runtime/repair-generated-scenes.ts`

### 当前对场次数 / 字数不过线的修复指令

```ts
if (problems.some((problem) => problem.startsWith('字数低于'))) {
  lines.push('在不加水的前提下补足关键对打和结果，让全局密度到 500-720 字。')
}
if (problems.includes('字数超过800字合同')) {
  lines.push('优先删掉解释句、重复动作、重复对白和余波句，把全集收回 500-720 字。')
}
if (problems.includes('场次数不在2-3场')) {
  lines.push('严格收回到 2-3 场，逐集细纲给几场就写几场。')
}
```

### 当前 repair focus

```ts
focus: ['字数收口', '对白密度', '场尾硬钩', '可拍性']
```

### 当前保护

修复后还会走：

- `chooseBetterRepairedScene(...)`
- `compactOverlongScreenplay(...)`

这意味着当前 repair 已经不是“盲修”，而是：

- 有回归保护
- 有 overlong 收口
- 有质量报告回看

---

## 当前真正裁判链

```text
真实生成
→ parse / batch runtime
→ quality batch 检查（字数、场数、对白、动作、钩子）
→ repair-generated-scenes 二次修补
→ postflight（含 f6_playability_postflight_weak）
→ 最终是否稳定 pass
```

### 当前卡住的位置

1. 集尾硬钩质量门
2. 长测稳定性还未被最终结果证明

---

## 最短结论

### 当前唯一真正的上线裁判

> **真实 `script_60` 长测能否在现有质量门下稳定 pass。**

### 当前最核心的失败来源

> **当前主失败已收缩为：只剩第 2 集集尾钩子偏弱。**

---

## 给会审时直接用的话

可以直接用这句：

> 现在不能宣布上线；当前阻塞已经收缩为真实 `script_60` 长测是否能把最后一个钩子强度问题稳定压过去。前端、mock、展示层第二口径、场次数和 overlong 都已经不是当前主矛盾。

