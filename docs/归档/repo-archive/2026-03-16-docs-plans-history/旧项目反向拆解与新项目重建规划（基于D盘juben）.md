# 旧项目反向拆解与新项目重建规划（基于 D:\project\juben）

## 一、这份文档是干嘛的

这份文档不是为了继续修旧项目。

它的用途是：

- 深入理解旧项目 `D:\project\juben`
- 把旧项目里已经被验证过的产品能力提炼出来
- 把旧项目的结构性失败点单独拎出来，避免在新项目里重演
- 指导新仓库 `D:\xinjuben` 重做，而不是照搬旧代码

一句话：

**旧项目是业务样本库，不是代码母体。**

## 二、先说结论

可以，而且非常值得把旧项目当参考对象深入学习。

原因不是“旧项目代码写得好”，而是：

1. 它已经长出了真实产品能力。
2. 它已经暴露了真实结构问题。
3. 现在新项目还很早，最适合吸收旧项目的业务资产，避开旧项目的结构债。

所以这次重做最正确的方式不是：

- 把旧项目 1:1 搬过来

而是：

- 继承旧项目的产品主线、模块语义、核心抓手
- 放弃旧项目的页面总控、前端 God Object、服务堆积式扩张

## 三、我对旧项目的整体判断

旧项目本质上已经不是一个简单的“AI 生成器”了，它其实已经长成一个复杂产品：

- AI 对话采集
- 粗纲生成
- 人物小传
- 详细大纲
- 剧本生成
- 审计与修订
- 市场情报
- 学习系统
- 项目记忆 / 恢复 / 续跑
- 导出与流程控制

从目录和文档看，旧项目已经非常接近一套“剧本生产工作台”。

### 旧项目的真实产品主线

从 [技术概要文档.md](/D:/project/juben/docs/参考资料/技术概要文档.md) 和代码结构看，旧项目主线是：

1. 用户需求采集
2. 粗纲搭建
3. 人物与关系构建
4. 详细大纲推进
5. 剧本生成
6. 审计、修订、导出

后期又叠加了：

7. 市场情报注入
8. 学习与技能系统
9. 进度恢复与断点续跑

这说明旧项目最有价值的，不是某个具体实现，而是：

- 你已经验证过“产品到底需要哪些能力”
- 你已经知道“哪些能力最后会挤在一起”

## 四、旧项目里最值得继承的东西

以下内容建议在新项目中保留“业务语义”，但重写实现。

## 4.1 四段式创作主流程

旧项目虽然早期叫法和现在略有差异，但实质上已经证明：

- 粗纲
- 人物小传
- 详细大纲
- 剧本

这四段是成立的，而且后面几乎所有复杂度都围绕这四段产生。

这和新项目现在要走的“工序边界刚性”是高度一致的。

### 新项目建议

直接以这四个工序作为核心 feature 边界：

- `outline`
- `character`
- `detailed-outline`
- `script`

## 4.2 Agent / Skill / Aligner 三段式质量体系

旧项目的 [src/generation/agent/README.md](/D:/project/juben/src/generation/agent/README.md) 很有价值。

它说明你其实已经摸索出一套正确思路：

- `Master Agent` 负责流程与硬约束
- `Skill Library` 负责题材与风格能力
- `Aligner Matrix` 负责生成后的质量检查

这套结构本身是值得保留的。

### 新项目建议

不要把它们继续做成“提示词堆 + service 堆”，而是改成：

- `core policy`
- `stage capability`
- `quality evaluator`

也就是：

- 把流程约束沉到核心层或应用层
- 把 skill 作为赋能层的可组合能力
- 把 aligner 变成检测器，而不是事后补丁器

## 4.3 市场情报进入运行时建议层

旧项目的 [2026-03-09-market-intel-runtime-design.md](/D:/project/juben/docs/plans/2026-03-09-market-intel-runtime-design.md) 非常值得保留。

最重要的不是“榜单采集”本身，而是它已经明确了：

- 情报中心可自动同步
- 市场规律只能进入运行时建议层
- 市场规律不能直接污染长期规则
- 不同工序只吃属于自己的规律

这和你现在新项目提出的原则完全一致。

### 新项目建议

旧项目的市场情报设计可以直接升级为新项目赋能层的正式规范。

## 4.4 状态分型意识

旧项目后期已经意识到“状态污染”是根问题。

比如：

- [2026-03-09-state-dictionary.md](/D:/project/juben/docs/plans/2026-03-09-state-dictionary.md)
- [2026-03-10-root-cause-dual-boundary-rebuild-plan.md](/D:/project/juben/docs/plans/2026-03-10-root-cause-dual-boundary-rebuild-plan.md)

这些文档其实已经在说同一件事：

- 真正的业务真相
- 运行时状态
- UI 状态
- 检查点状态

必须拆开。

### 新项目建议

这次不要再等到后期才分型，直接从第一版开始就拆成：

- truth
- checkpoint
- runtime
- ui
- derived

## 4.5 记忆 / 恢复 / 续跑这条线

旧项目里这些能力已经真实存在：

- checkpoint
- recovery
- progress
- resume
- dirty episode

这些说明未来新项目一定也会长出“中断恢复”和“阶段续写”的需求。

### 新项目建议

不要一开始就做复杂，但架构上要预留：

- `draft-cache`
- `checkpoint`
- `resume pointer`
- `task session`

## 五、旧项目最危险的失败点

这些是这次新项目必须主动绕开的。

## 5.1 `AIChatPage.tsx` 变成前端总控中心

旧项目最清晰的失败点就是：

- [AIChatPage.tsx](/D:/project/juben/src/renderer/src/pages/AIChatPage.tsx) 达到了 66 万字节
- 文档里明确记录过它一度达到 1.5 万行以上
- 它把状态、流程、handler、计算、修复、展示全部压在一起

这不是“文件太大”这么简单，而是：

- UI 编排
- 业务流程
- 错误修复
- 运行时状态
- 下游调用

全部混在一个页面里。

### 新项目强规则

新项目里绝对不能出现第二个 `AIChatPage.tsx`。

`App.tsx` 和页面层只能做：

- 组合
- 路由
- feature 装配
- UI 壳层

不能做真正业务总控。

## 5.2 renderer service 爆炸式增长

旧项目 `src/renderer/src/services` 已经说明一个典型结构问题：

- service 名字很多
- 每个名字都像一个独立边界
- 但绝大多数仍然在 renderer 层

这意味着：

- 基础设施
- 业务编排
- 质量策略
- 恢复逻辑
- 市场逻辑

都没真正收口到后端或共享层。

### 新项目强规则

以下内容不能继续主要驻留在 renderer：

- 后端 SDK
- 恢复与 checkpoint 编排
- 市场规律生产
- 核心规则存储
- 运行时任务会话

这些要进 `main` 或 `shared`。

## 5.3 弱阶段契约导致“软失败继续污染下游”

旧项目后期多份文档都在重复说一个问题：

- 粗纲失败得不够明确
- 人物小传 fallback 也会被当成成功
- 下游继续吃这些“看起来像成功”的结果

这比“直接报错”更危险。

### 新项目强规则

每个工序都必须定义：

- required input
- success contract
- failure contract
- repairable issues
- blocking issues

也就是说：

- 不是“有内容就算成功”
- 而是“满足正式契约才允许进入下一工序”

## 5.4 真相、检查点、派生状态混写

旧项目已经出现：

- persisted truth
- persisted checkpoint
- runtime
- derived

被混写的情况。

结果就是：

- 同一次测试不一定吃到同一份输入
- 恢复流程会偷偷改变真相
- 页面看到的状态不等于系统真正状态

### 新项目强规则

新项目里：

- 读路径不能偷偷回写
- 恢复逻辑不能自动污染持久化真相
- 派生状态不要长期持久化

## 5.5 页面内复制函数、重复实现、临时真源

旧项目后来甚至需要单独写 [single-source-of-truth.md](/D:/project/juben/docs/当前工作区/single-source-of-truth.md) 来强行冻结工具函数真源。

这说明当时已经出现了：

- 同一函数多地拷贝
- 页面内旧版本不删
- 新旧逻辑并存

### 新项目强规则

新项目要做到：

- 共享逻辑只有一个真源
- feature 内逻辑只在 feature 下存在
- 页面内不允许再出现“复制一份先跑”的临时实现

## 六、旧项目的能力地图

下面是从旧项目提炼出的能力树。

## 6.1 可以直接继承为新项目主能力的

- 工序式创作流
- 项目制工作台
- 市场情报中心
- 质量检测与建议系统
- 导出能力
- 学习样本吸收机制
- 任务续跑与恢复

## 6.2 可以继承“业务意图”，但不能照搬实现的

- DeepSeek/第二模型 路由
- generation service 大管道
- 角色修复链
- 大纲修复链
- fallback 体系
- 页面级 orchestration

## 6.3 应该直接放弃的

- 以单页面为中心的总控架构
- renderer 里堆出后端编排层
- 用补丁链维护阶段质量
- 以大文件拆分为主目标，而不是先定义边界

## 七、新项目该如何参考旧项目

正确参考方式应该是“三继承、三放弃”。

## 7.1 三个继承

### 继承一：产品主线

继承旧项目已经验证过的真实业务阶段。

### 继承二：能力语义

继承旧项目中这些抽象语义：

- outline contract
- character contract
- stage gate
- aligner
- market insight runtime layer
- project hydration
- resume checkpoint

### 继承三：失败经验

把旧项目里暴露过的失败点，直接变成新项目的硬边界。

## 7.2 三个放弃

### 放弃一：页面总控

新项目不再允许单页面总控整个产品主链。

### 放弃二：renderer 重业务编排

新项目不再让 renderer 成为事实上的应用后端。

### 放弃三：补丁式修复路线

新项目不靠“多一层 repair service”来对冲前面契约缺失。

## 八、新项目的重建建议

基于旧项目经验，新项目建议拆成 6 个主域。

## 8.1 `foundation`

职责：

- 项目
- 用户
- 权限
- 日志
- 本地缓存
- checkpoint
- error model

工程位置：

- `src/main/infrastructure`
- `src/shared/contracts`

## 8.2 `core-rules`

职责：

- 正式事实定义
- 正式事实升格
- 戏剧推进链
- 工序边界策略
- 质量评分规则

工程位置：

- `src/shared/domain`

## 8.3 `workflow`

职责：

- outline
- character
- detailed-outline
- script

工程位置：

- `src/main/application/*`
- `src/renderer/src/features/*`

## 8.4 `enablement`

职责：

- 榜单采集
- 规律提炼
- 置信度评估
- 工序建议生成
- 待审核池

工程位置：

- `src/main/infrastructure/market`
- `src/main/application/suggestion`

## 8.5 `quality`

职责：

- stage validator
- aligner
- audit
- revision suggestion

工程位置：

- `src/shared/domain/quality`
- `src/main/application/quality`

## 8.6 `workspace-ui`

职责：

- 工序页面
- 建议侧栏
- 质量看板
- 可视化

工程位置：

- `src/renderer/src/pages`
- `src/renderer/src/widgets`
- `src/renderer/src/features/*/ui`

## 九、旧项目到新项目的映射关系

| 旧项目能力 | 旧项目位置 | 新项目建议归属 |
|---|---|---|
| AI 对话采集 | `AIChatPage.tsx` + `deepSeekAgentService.ts` | `renderer/features/intake` + `main/application/intake` |
| 粗纲生成 | `roughOutline*` services + page handlers | `features/outline` + `application/outline` |
| 人物小传 | `characterProfile*` services + handlers | `features/character` + `application/character` |
| 详细大纲 | `detailedOutline*` services + page flows | `features/detailed-outline` + `application/detailed-outline` |
| 剧本生成 | `script*` services + `generation/pipeline` | `features/script` + `application/script` |
| Agent / Skill / Aligner | `src/generation/agent/*` | `shared/domain/quality` + `application/quality` + `enablement` |
| 市场情报 | `market*` services + design docs | `infrastructure/market` + `application/suggestion` |
| 项目恢复 | `useProject` + `projectService` + progress docs | `foundation/checkpoint` + `workspace hydration` |

## 十、分阶段重建顺序

## 第 1 阶段：先做骨架，不做大功能

目标：

- 建立不会长歪的工程边界

任务：

1. 修当前编译问题
2. 建 `shared/contracts`
3. 建 `shared/domain`
4. 建 `main/ipc`
5. 建 `preload/api`
6. 建四个工序 feature 壳

## 第 2 阶段：把旧项目最值钱的“核心抓手”接回来

目标：

- 正式事实
- 戏剧推进链
- 工序边界

先落成纯规则层。

## 第 3 阶段：把旧项目的生成与赋能能力按工序接回

目标：

- 不是恢复“老 service 名字”
- 而是恢复真正的业务能力

任务：

- outline generation
- character generation
- detailed outline generation
- script generation
- runtime suggestion

## 第 4 阶段：接回质量层和市场层

目标：

- aligner / quality / market insight

但必须通过正式 contract 接入，不能再像旧项目那样补丁式横插。

## 十一、这次参考旧项目时的工作原则

1. 看旧项目时，优先提炼“产品能力”和“失败根因”，不是复制代码。
2. 旧项目里名字对的东西可以继承，位置错的东西不要继承。
3. 旧项目里逻辑值钱的地方，要先提成 contract 或 policy，再决定放哪层。
4. 旧项目里 renderer 的很多 service，实际应该搬到 `main` 或 `shared`。
5. 旧项目里任何为了补救大文件而产生的中间层，都不能直接视为新项目标准答案。

## 十二、最终结论

`D:\project\juben` 非常值得深入研究，而且应该继续研究。

它对新项目最大的价值不是“旧代码可复用”，而是：

- 它已经把你的真实产品边界暴露出来了
- 它已经把未来最容易失控的地方提前演示给我们看了
- 它已经给了我们一套可以重建的业务地图

所以新项目不是从零开始。

更准确地说：

**新项目是在旧项目的业务经验之上，重新建立一套更稳的工程骨架。**

## 十三、下一步建议

下一步最合理的动作不是继续读更多旧代码，而是开始做“旧项目能力映射清单”的第一轮落地：

1. 先在新项目建立 4 个工序 feature
2. 再把旧项目里最重要的 3 条核心规则线迁过来：
   - 正式事实
   - 戏剧推进链
   - 工序边界
3. 然后再决定旧项目里的生成链、质量链、市场链各自怎么接回来

这会比“先把旧项目所有 service 看完再动手”更稳。

