# AI剧本创作赋能引擎重构落地方案（第一版）

## 一、这份方案解决什么问题

这份方案不是再讲一遍抽象架构，而是把当前项目从“刚搭出来的 Electron 原型”升级成：

- 真正可维护
- 真正可扩展
- 不容易出现“一个地方错，全系统跟着错”
- 能支撑后续四道工序、榜单赋能、质量检测、可视化持续增长

这份方案完全基于当前项目现状来设计，不是假设另起炉灶。

## 二、对当前项目的判断

当前项目有两个很大的优点：

1. 还在早期，改造成本低。
2. 顶层结构已经有 `main / preload / renderer` 雏形，不需要推倒重来。

当前项目也有几个明确问题：

1. `renderer` 直接承载了部分服务层职责，边界不稳。
2. `preload` 还没有变成真正的受控 API 边界。
3. “粗纲 / 人物 / 详细大纲 / 剧本”还是视觉导航，不是实际 feature 边界。
4. “正式事实 / 戏剧推进链 / 市场规律 / 用户创作数据”还没有真正做工程隔离。
5. 当前代码连 `typecheck` 都没过，说明工程闭环还没站稳。

所以现在最适合做的事不是继续堆功能，而是先把骨架改对。

## 三、项目的最终定位

这不是普通“剧本生成工具”。

这是：

**AI 驱动的剧本创作赋能引擎**

它的职责不是替创作者写答案，而是：

- 帮创作者建立更强的创作逻辑
- 帮创作者围绕“正式事实升格权”搭结构骨架
- 帮创作者围绕“戏剧推进链正式化”增强内容推进力
- 帮创作者吸收市场规律，但不被市场规律反向绑死

因此系统必须长期守住四条底线：

1. 创作权归用户
2. 工序边界刚性
3. 赋能方式柔性
4. 核心规则与动态规律彻底隔离

## 四、落地后的整体架构

业务上，继续沿用四层金字塔：

1. 基础层
2. 核心层
3. 赋能层
4. 交互层

工程上，把它翻译成下面四个真实代码边界：

```text
src/
  shared/      -> 核心层的纯规则 + 跨层 contract
  main/        -> 基础层 + 赋能层运行时承载
  preload/     -> 受控桥接层
  renderer/    -> 交互层
```

### 4.1 对应关系

- 基础层：主要落在 `src/main`
- 核心层：主要落在 `src/shared/domain`
- 赋能层：主要落在 `src/main/application` 和 `src/main/infrastructure/market`
- 交互层：主要落在 `src/renderer`

这意味着：

- `renderer` 不再直接碰 PocketBase 或规则库
- `main` 负责日志、权限、缓存、规则版本、异常兜底、榜单运行时处理
- `preload` 是唯一允许 renderer 访问桌面能力的入口
- `shared` 放系统长期稳定的“正式真相”

## 五、目标目录结构

```text
src/
  shared/
    contracts/
      app-error.ts
      auth.ts
      workflow.ts
      outline.ts
      character.ts
      detailed-outline.ts
      script.ts
      suggestion.ts
      quality.ts
    domain/
      formal-fact/
        definition-engine.ts
        elevation-engine.ts
        types.ts
      drama-progression/
        progression-engine.ts
        types.ts
      stage-boundary/
        policy.ts
      quality/
        score-policy.ts
      common/
        result.ts
        errors.ts

  main/
    app/
      bootstrap.ts
      create-window.ts
      register-ipc.ts
    ipc/
      auth-handlers.ts
      workspace-handlers.ts
      outline-handlers.ts
      character-handlers.ts
      detailed-outline-handlers.ts
      script-handlers.ts
      suggestion-handlers.ts
      quality-handlers.ts
    application/
      auth/
      workspace/
      outline/
      character/
      detailed-outline/
      script/
      suggestion/
      quality/
    infrastructure/
      backend/
        pocketbase/
          client.ts
          repositories/
      market/
        collectors/
        analyzers/
        confidence/
      storage/
        draft-cache.ts
        rule-store.ts
        settings-store.ts
      logging/
        operation-logger.ts
      security/
        permission-guard.ts
      resilience/
        handler-guard.ts
        degrade-policy.ts

  preload/
    api/
      auth.ts
      workspace.ts
      outline.ts
      character.ts
      detailed-outline.ts
      script.ts
      suggestion.ts
      quality.ts
      system.ts
    index.ts
    index.d.ts

  renderer/
    src/
      app/
        App.tsx
        bootstrap/
        providers/
        store/
          useSessionStore.ts
          useShellStore.ts
          useWorkflowStore.ts
      pages/
        LoginPage.tsx
        WorkspacePage.tsx
      widgets/
        app-shell/
          Sidebar.tsx
          Topbar.tsx
          StageSwitcher.tsx
      features/
        outline/
          api.ts
          hooks/
          model/
          ui/
        character/
          api.ts
          hooks/
          model/
          ui/
        detailed-outline/
          api.ts
          hooks/
          model/
          ui/
        script/
          api.ts
          hooks/
          model/
          ui/
        suggestion/
          api.ts
          hooks/
          ui/
        quality/
          api.ts
          hooks/
          ui/
      shared/
        ui/
        lib/
        assets/
```

## 六、每一层到底做什么

## 6.1 基础层

基础层是地基，目标是让系统稳、可追踪、能隔离风险。

### 基础层包含 5 个关键模块

1. 数据存储模块
2. 接口网关模块
3. 权限管控模块
4. 异常兜底模块
5. 操作日志模块

### 6.1.1 数据存储模块

必须做三类数据隔离：

- 静态规则数据
- 市场规律数据
- 用户创作数据

#### 静态规则数据

包含：

- 正式事实定义规则
- 正式事实升格规则
- 戏剧推进链规则
- 工序边界规则

特点：

- 只读为主
- 有版本号
- 不能被运行时动态数据直接污染

#### 市场规律数据

包含：

- 榜单原始采集
- 规律提炼结果
- 置信度判断结果
- 待审核沉淀池

特点：

- 按平台、时间窗分区
- 支持回溯
- 不能直接写成核心规则

#### 用户创作数据

包含：

- 项目
- 四道工序草稿
- 正式事实设计
- 戏剧推进链设计
- 用户忽略过的建议
- 质量评分结果快照

特点：

- 按用户、项目隔离
- 支持本地缓存
- 支持阶段版本

### 6.1.2 接口网关模块

所有跨模块调用都要经过统一入口。

工程上表现为：

- `ipc` handler 是主入口
- 入参出参走统一 contract
- 在入口做权限校验、日志记录、异常包装

建议统一格式：

- 请求：`Input DTO`
- 返回：`Result DTO | AppError`

### 6.1.3 权限管控模块

权限要分两种：

- 角色权限
- 工序权限

#### 角色权限

- 管理员：可维护静态规则、发布规则版本
- 创作者：只能操作自己的创作项目
- 审核员：只能审核规律沉淀，不碰创作内容

#### 工序权限

用户只能改当前工序允许修改的部分。

工程上不要把这件事散落在页面里，而是做成统一策略：

- `canAccessStage`
- `canEditStage`
- `canPublishRuleVersion`
- `canApproveSuggestionRule`

### 6.1.4 异常兜底模块

降级要分层，不能一报错就整页死掉。

建议策略：

- 核心层异常：保留基础校验，禁用失效规则分支
- 赋能层异常：暂停市场建议，仅保留核心逻辑赋能
- 交互层异常：降级为基础编辑界面

### 6.1.5 操作日志模块

必须记录：

- 用户做了什么
- 调了哪个模块
- 返回了什么结果
- 用的是哪版规则
- 哪层发生了异常

日志是后面定位“哪里第一次把错误写成正式事实”的关键证据。

## 6.2 核心层

核心层是这个产品的灵魂，只做“正式逻辑”，不碰 UI，不碰榜单原始数据，不碰渲染层状态。

### 核心层拆成 4 个模块

1. 正式事实定义引擎
2. 正式事实升格引擎
3. 戏剧推进链引擎
4. 工序边界策略

### 6.2.1 正式事实定义引擎

职责：

- 判断一个“核心正式事实”是否成立
- 给出柔性提示，不强制改写

最低判断维度：

- 是否影响主线
- 是否绑定主题
- 是否贯穿多工序

### 6.2.2 正式事实升格引擎

职责：

- 判断某个升格节点是否成立
- 判断升格是否真正完成了“结构线推进”

最低判断维度：

- 是否由冲突升级触发
- 是否推动人物弧光
- 是否指向主题落地

### 6.2.3 戏剧推进链引擎

职责：

- 校验“冲突 -> 动作 -> 情感 -> 升格”闭环
- 判断动作是否有效
- 判断情感是否真实
- 判断是否推动正式事实升格

### 6.2.4 工序边界策略

职责：

- 明确每个阶段允许输入、允许引用、允许展示什么
- 防止跨工序乱流

这个模块很重要，因为“工序边界刚性”不能靠组件自己记住，要靠统一策略层。

## 6.3 赋能层

赋能层不是“自动写剧本层”，而是“把市场规律和系统能力转成柔性建议层”。

### 赋能层拆成 3 个模块

1. 榜单规律分层处理模块
2. 分工序赋能模块
3. 创作质量检测模块

### 6.3.1 榜单规律分层处理模块

内部再拆四段：

1. 榜单采集
2. 规律提炼
3. 置信度评估
4. 受控写回

### 写回策略必须守住

- 低置信度：只展示
- 中置信度：运行时建议附加
- 高置信度：进入待审核池
- 人工确认后：才进入长期规则库

这里不能图快直接自动写长期规则，否则后面系统会被动态样本污染。

### 6.3.2 分工序赋能模块

按工序注入建议：

- 粗纲：骨架规律
- 人物：人物发动机规律
- 详细大纲：反转链路、节奏、钩子
- 剧本：表达和动作细节

关键要求：

- 只做附加建议
- 不覆盖用户输入
- 不跨工序乱灌

### 6.3.3 创作质量检测模块

检测维度建议固定为四个：

- 逻辑
- 市场
- 情感
- IP 潜力

输出形式：

- 评分
- 解释
- 柔性优化建议

不做硬阻断，不做强制通过。

## 6.4 交互层

交互层只处理：

- 输入
- 展示
- 反馈
- 引导

它不应该定义核心规则，也不应该自己拼装市场规律。

### 交互层拆成 3 类界面能力

1. 工序创作界面
2. 建议展示模块
3. 创作数据可视化模块

### 工序创作界面

四道工序必须成为真正的 feature，不再只是四个 tab。

### 建议展示模块

统一采用非侵入式展示：

- 侧边栏
- 折叠卡
- 悬浮建议

必须标注：

- 建议类型
- 来源
- 置信度
- 忽略操作

### 创作数据可视化模块

优先展示三种图：

- 正式事实升格轨迹
- 戏剧推进链闭环图
- 质量评分雷达图

## 七、真正的调用链怎么设计

系统调用统一走这条线：

```text
Renderer Component
  -> Feature Hook
  -> Renderer API Adapter
  -> preload window.api
  -> IPC Handler
  -> Main Application Use Case
  -> Repository / Rule Store / Market Engine / Cache
  -> 返回 Result 或 AppError
```

关键限制：

- `renderer` 不直接 import PocketBase client
- `renderer` 不直接 import Electron
- `main` 不 import renderer store
- `shared/domain` 不依赖 React 和 Electron

## 八、状态管理怎么拆

现在最适合这个项目的 Zustand 分法不是按页面分，而是按责任分。

### 8.1 `useSessionStore`

负责：

- 当前用户
- 角色
- 登录状态
- 当前项目身份信息

### 8.2 `useWorkflowStore`

负责：

- 当前工序
- 当前项目
- 每个工序的保存状态
- dirty 状态
- 当前规则版本号

### 8.3 `useShellStore`

负责：

- 全局错误提示
- 降级模式
- 侧边栏状态
- 浮层状态
- 全局 loading

### 8.4 feature 内部状态

每个工序自己的草稿和临时表单状态，尽量留在 feature 内部：

- outline draft
- character draft
- detailed outline draft
- script draft

不要把所有东西堆成一个超级 store。

## 九、分阶段落地顺序

## 第一阶段：先搭地基和骨架

目标：

- 让项目先成为可编译、可验证、可继续长大的骨架

这阶段只做：

1. 修复当前编译错误
2. 真实挂载四道工序的页面结构
3. 建 `shared/contracts`
4. 建 `shared/domain`
5. 建最小 `window.api`
6. 把 PocketBase 从 renderer 挪到 main
7. 建统一 `AppError`

### 第一阶段验收标准

- `typecheck` 通过
- `build` 通过
- 四道工序能切换
- outline 的核心校验链已打通
- renderer 不再直连 PocketBase

## 第二阶段：落核心抓手

目标：

- 把“正式事实 + 戏剧推进链”做成真正的系统能力

这阶段做：

1. 正式事实定义引擎
2. 正式事实升格引擎
3. 戏剧推进链引擎
4. 工序边界策略
5. 基础质量评分模型

### 第二阶段验收标准

- 能对粗纲和详细大纲做核心逻辑校验
- 建议是柔性的，不强制覆盖输入
- 工序边界开始真正生效

## 第三阶段：落赋能层

目标：

- 把榜单规律变成受控的工序赋能

这阶段做：

1. 榜单采集
2. 规律提炼
3. 置信度判断
4. 运行时建议生成
5. 待审核池

### 第三阶段验收标准

- 建议能按工序精准展示
- 不会把市场规律写成核心规则
- 高置信规律进入审核，而不是直接写死

## 第四阶段：落交互增强

目标：

- 让创作者真正好用

这阶段做：

1. 建议展示系统
2. 可视化系统
3. 忽略建议 / 收起建议
4. 质量看板

### 第四阶段验收标准

- 页面操作流畅
- 建议不打扰创作主线
- 可视化能辅助自查

## 十、第一轮真正要改哪些文件

### 先新增

- `src/shared/contracts/*`
- `src/shared/domain/*`
- `src/main/ipc/*`
- `src/preload/api/*`
- `src/renderer/src/features/*`
- `src/renderer/src/app/store/useSessionStore.ts`
- `src/renderer/src/app/store/useShellStore.ts`
- `src/renderer/src/app/store/useWorkflowStore.ts`

### 再重构

- `src/main/index.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/App.tsx`
- 现有 `services` 和 `store`

### 最后迁移或删除旧结构

- renderer 直连后端的 service
- 过度耦合的旧 store
- 仅作占位、不承担真实职责的组件结构

## 十一、你新文档体系的评价

这次新文档整体是好的，而且方向很稳。

### 我最认可的点

1. `2.rules.md` 把“交付闭环、验证、根因修复、单文件上限”讲得很清楚，适合当硬约束。
2. `3.agents.md` 把“保底不封顶、优化不限制、提示词优先”定成了长期哲学，这跟你产品定位高度一致。
3. `engineering-workflow` 把“先证明根因，再动手”写清了，后面做重构很有用。
4. `intel-sop` 把“外部资料不能直接污染系统”说透了，这正好对应你赋能层和核心层的隔离原则。
5. `operator-preferences` 很适合协作，能帮助后续每轮任务都保持一致表达方式。

### 还差的一个关键点

目前这套文档对“产品架构怎么映射到代码边界”还不够具体。

所以这份方案的作用，就是把你已经定下来的产品原则，翻译成：

- 文件结构
- 调用链
- 模块职责
- 状态拆分
- 实施顺序

## 十二、最终结论

这个项目现在非常适合改，而且应该现在改。

原因不是“现在代码少”，而是：

- 产品原则已经清楚了
- 文档体系已经有了
- 顶层工程结构已经起好了
- 历史包袱还不重

现在改，是把项目从“原型”升级成“能持续长大的产品骨架”。

如果继续沿着当前原型直接堆功能，后面再改的成本会高很多。

## 十三、下一步直接怎么干

下一轮直接进入第一阶段落地：

1. 修当前编译错误
2. 建 `shared/contracts`
3. 建 `shared/domain`
4. 建 preload API
5. 把 PocketBase 从 renderer 挪到 main
6. 把四道工序改成真实 feature

这 6 步做完，项目就会从“看起来有架构”，变成“真正开始有架构”。
