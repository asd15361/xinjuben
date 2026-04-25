# AI自我学习

## 我对项目的固定理解

- 这是 AI 剧本创作软件，重点不是“能不能吐字”，而是“创作真相有没有沿工序稳定下传”。
- 真问题通常不是某个点报错，而是上游越界、双口径、旧旁路回流。
- 这个项目最怕的不是偶尔失败，而是旧入口、旧规则、旧文档继续掌权。
- 这个项目下一阶段要成为学习型创作系统：写作逻辑 = 稳定内核 A + 市场打法包 B + 项目设定 C。
- 市场变化不能靠反复重写 Prompt；优秀剧本样本要先提炼成可审核、可版本化的 MarketPlaybook。

## 现在已经验证有效的做法

- 先收入口，再修细节；入口不唯一时，后面所有优化都会被旧链反弹。
- 前端 HTTP 调用统一收进 `api-client`，比散落在组件里稳得多。
- PocketBase JSON 字段直接传对象，不要 double-stringify。
- **PocketBase text 字段默认有 5000 字符限制**——新建 JSON 字段必须显式设 max=100000 或更大。
- 认证、计费、限流放路由中间件层，业务服务别兼职。
- **大内容（剧本正文、草稿）优先本地持久化，PB 只存轻量 metadata**——不要把大 JSON 塞进 PB text/json 字段，既超限又拖慢查询。
- 回答架构问题前先看 `graphify-out/GRAPH_REPORT.md`，能少走很多弯路。
- 七问候选必须持久化：生成、选择、追加、锁定是四个不同状态，不能靠前端内存假装保存。
- 大上下文的正确用法是喂结构化状态快照和打法包，不是一次生成整部剧。
- 用户可见命名要说“剧本骨架”，不要再说“粗略大纲”。

## P4/P5 新发现

- **内容质量检测的启发式方法比关键词匹配靠谱**：`computeInformationDensityScore` 用检查点（冲突载体、道具、潜台词、动作情绪节拍）比堆正则灵活；道具检查匹配宽泛（「钥匙/账册/信物/印章/兵符/令牌/剑/刀/枪」），避免只认死词。
- **男频/女频维度差异明显，用 `audienceLane` 分支检测很干净**：男频关心底牌、打脸、反派层级递进，女频关心情绪代入、权力借用、女主成长，混在一起检测逻辑会乱。
- **修稿链的三阶段设计（检测→信号→提示词）有效**：信号结构 (`ContentRepairSignal`) 作为中介，让检测逻辑和提示词解耦，修稿提示词可以独立迭代。
- **修稿后回退逻辑不能只看总分**：P5 加了 marketQualityScore 下降 5 分以内才接受，避免为了提总体分而牺牲垂类质量。
- **不修稿时不输出修稿说明很重要**：实测如果不在 prompt 里明确禁止"以下是修稿说明"这类开头，AI 会在正文前加一大段解释。

## P4/P5 snapshot 连续性新发现

- **快照驱动的连续性检测比纯文本匹配更稳定**：`inspectStoryContinuityAgainstSnapshot` 用结构化快照（主角状态、道具、钩子、反派状态、硬约束）作为检测基准，而不是从剧本中再解析一遍，避免双口径。
- **中文 bigram 匹配解决分词问题**：`extractSearchTokens` 用 2-gram 重叠检测处理中文关键词匹配，比单字或整词匹配更鲁棒（例如"神秘人跟踪"和"跟踪自己"能部分匹配）。
- **snapshot 三重用途**：同一份 `StoryStateSnapshotDto` 同时用于生成 prompt、质量检测、重写约束，保持语义一致性。
- **连续性分数独立加权**：`storyContinuityScore` 在 overallScore 中只占 0.05，因为连续性检测是辅助门，不是主评分维度；但它在修稿链中作为独立信号触发。
- **5 类连续性检测的 severity 设计**：道具连续性（prop_continuity）和钩子接续（hook_continuation）是 high，因为穿帮会直接影响观众体验；主角状态和反派递进是 medium，因为允许创作弹性。

## P6 新发现

- **回归测试脚本必须先用 `buildScriptGenerationExecutionPlan` 检查 `plan.ready`**——事实标签不在分段 content 中会导致 `script_formal_fact_segment_missing` 阻塞，必须把事实标签嵌入分段 content 字符串。
- **P6 UI 面板的数据流**：`API 响应.ledger` → `useWorkflowStore.scriptStateLedger` → `ScriptQualityReportPanel props`，不新增 store，复用 workflow store。
- **男频/女频评分差异明显**：男频市场匹配度 27（弱）vs 女频 54（中等），说明男频都市爽点检测维度可能需要调整。
- **开局冲击两赛道都极低（11/14）**——可能检测算法过严，也可能生成内容确实缺乏冲击性开场。
- **评分系统的色标（75/60 分界）需要校准**：女频格式 88 完美，男频 73 良好，但 73 也 <75 触黄线。

## P3-P7 MarketPlaybook 新发现

- **项目级打法包锁定防止市场版本漂移**：`resolveMarketPlaybookSelection` 在项目创建时自动锁定当前最新 active 打法包，后续生成不受新版本影响，保证同一项目内打法一致性。
- **启发式关键词提取比硬编码规则更实用**：`createMarketPlaybookDraftFromSamples` 用 6 个词典（开局施压、反派压迫、爽点兑现、钩子、主角行动、关系张力）+ minHits 阈值，从样本中自动提取 patterns，比人工逐条编写效率高。
- **Playbook 生命周期三态（draft→active→archived）+ 版本冲突检测**：activation 前校验 name/audienceLane/subgenre/sourceMonth/version/patterns/promptRules/qualitySignals 完整性，同时检测同 lane+subgenre+month+version 是否已存在 active 版本，避免重复激活。
- **Markdown 导出只暴露元信息不暴露完整 patterns**：`buildPlaybookSectionMarkdown` 输出 playbook id/version/sourceMonth/mode/lockedAt，不导出 patterns 和 promptRules，避免导出文件过大。
- **`marketPlaybookSelectionJson` 全链路传递**：PocketBase → mapper → project DTO → Electron store → shard sync → index entry，每层需显式添加字段映射，不能靠自动传递。
- **`[market_playbook_locked]` 日志格式**：`playbookId=X version=Y sourceMonth=Z reason=W`，便于后续排查打法包选择问题。

## P8 MarketPlaybook Prompt 集成新发现

- **B 层注入必须有边界声明**：prompt block 开头明确写"不能覆盖稳定创作内核、用户设定和已锁定七问"，防止 AI 把打法包当硬规则覆盖用户意图。
- **阶段特定输出比全量输出更有效**：七问阶段只提取 opening_pressure/payoff/villain_pressure/hook，剧本骨架阶段只提取 payoff/protagonist_action/villain_pressure，正式剧本阶段提取全部 6 类。全量塞入会让 prompt 膨胀且干扰当前阶段重点。
- **截断限制（6 patterns / 5 antiPatterns / 5 promptRules）是必要的**：内置打法包可能有 10+ patterns，全塞入 prompt 会挤占 A 层和 C 层的 token 空间，且 AI 注意力会被稀释。
- **resolveProjectMarketPlaybook 不走数据库**：纯从 selection 数据 + 内置注册表解析，避免每次生成都查 PB，也避免数据库不可用时阻塞生成。
- **server 测试文件用 `.ts` 后缀 import，但生产文件不能用**：`tsconfig.typecheck.json` 有 `allowImportingTsExtensions`，但 `tsconfig.json`（build 用）没有。`seven-questions-agent.ts` 被测试直接 import，需要用相对路径 + `.ts` 后缀才能让 Node 原生测试 runner 解析。

## P9 MarketPlaybook 质量观测新发现

- **纯观测信号必须隔离在修稿链之外**：`playbookAlignmentScore` 只回答"有没有体现当前打法包"，不回答"剧本好不好"。如果让它进入修稿链，打法包就变成了第二个裁判口，违反"不允许第二裁判口"原则。
- **关键词子串匹配够用**：`inspectPlaybookAlignment` 用 `text.includes(keyword)` 做子串匹配，不搞正则、不搞分词。`extractMatchKeywords` 按中文标点拆分 qualitySignal，提取引号短语，去重后逐个检测。简单、可预测、不容易误判。
- **6 条 pattern 上限是必要的**：和 prompt 注入一样，检测也不能无限扩展。6 条足够覆盖一个打法包的核心信号，超过 6 条会稀释检测焦点。
- **边界测试比功能测试更重要**：P9 的核心测试不是"能不能算分"，而是"低分时会不会触发修稿"。4 条边界测试（playbookAlignmentScore=0/100/undefined + 其他分数低）证明修稿链完全不受影响。
- **批量均分的实现模式一致**：`averagePlaybookAlignmentScore` 的计算方式和 `averageMarketQualityScore` 一模一样——过滤 undefined、reduce 求和、除以计数。新字段接入批量报告时保持一致的模式，不容易出错。

## P10 MarketPlaybook 低成本闭环新发现

- **学习型软件先测闭环，不急着跑真实 API**：`market-playbook-learning-flow.test.ts` 用纯函数把样本、草案、审核、启用、Prompt block 和观测串起来，能证明架构通路，不花模型费用。
- **draft 到 active 中间必须模拟审核**：测试里显式改写 `promptInstruction` 和 `qualitySignal` 后才 `activateMarketPlaybookDraft`，这个动作提醒后续 UI 也必须有审核页，不能样本一导入就全局生效。
- **项目锁定和自定义 active 是两件事**：当前 `resolveProjectMarketPlaybook` 只从内置 registry 解析；低成本测试先验证内置锁定选择，再用审核后的 active draft 直接验证 Prompt/观测。后续如接数据库，需要补"从项目锁定 id 解析用户自定义 active playbook"。
- **最关键断言仍是裁判边界**：同一段剧本传入 playbook 后，`playbookAlignmentScore` 有值，但 `overallScore` 与不传 playbook 完全一致，说明 B 层观测没有偷进主评分。

## P11 MarketPlaybook 审核工作台新发现

- **先做可见审核入口，别直接做自动启用**：`MarketPlaybookWorkbench` 放在首页，能导入样本、编辑 patterns、看 Prompt 预览和 active JSON，但明确不自动写 registry。这个边界比“看起来启用了但实际没接上”更安全。
- **UI 编辑逻辑要下沉到共享 helper**：`review-workbench.ts` 负责 trim、重建 promptRules/qualitySignals 和 activation preview，组件只管展示和交互，避免把规则散在 TSX 里。
- **active JSON 是下一阶段数据库化的桥**：当前复制 JSON 已经能给程序员/运营审核资产；后续要做的是把这份 JSON 持久化为用户自定义 active playbook，并让 server 按 selection 解析。
- **真实 Chrome 烟测要区分 Electron preload 报错**：裸浏览器访问 Vite 会报 `window.api.system` 缺失，这是 Electron 环境差异；只要页面渲染和工作台存在，不应误判为 P11 UI 回归。

## 人物小传/剧本骨架链路新发现

- **先保住人物小传，再处理骨架失败**：人物小传和势力底账已经生成时，`rough_outline_batch_parse_failed` 不应该让整步 500；应该保住人物成果，生成临时骨架，并把 warning 明确显示给用户。
- **可恢复不是静默兜底**：临时骨架只能作为恢复态，必须通过 `outlineGenerationError` 传到前端提示，不能把坏 JSON 伪装成完整成功。
- **20 集不要按 60 集生成人物矩阵**：短剧只需要核心冲突角色、递线索角色、压迫角色和反转角色；强行 3 势力 x 多分支 x 多人物会让人物小传过慢且臃肿。
- **七问不能和骨架重复记账**：用户已经确认的 `storyIntent` 才是正式输入；七问候选有审核价值，但如果继续要求“先锁七问再生骨架”，就会制造两套账本且容易互相打架。
- **聊天刷新先查后端真相**：刷新后 UI 看不到不等于聊天丢失，要先查 `project_chats.messagesJson` 和 `ProjectRepository.getProject`，再判断是保存失败还是 hydration/显示问题。

## UI 性能复发问题

- **UI 改动后变卡已经是复发问题，不是偶发体验抱怨**：每次改 `CharacterStage`、`OutlineStage`、首页工作台、生成状态面板、复制按钮、卡片列表时，都必须把“真实页面是否变卡”当成验收项。
- **大文本复制不能在 render 阶段预构建**：复制人物小传、剧本骨架、世界底账这类长文本时，只能通过 `getText` 在点击复制时构建；不能把 `buildXxxCopyText(...)` 的结果直接作为 prop 传入，避免每次状态更新都重算整页文本。
- **列表卡片不能无限加交互重量**：人物卡、势力卡、剧集卡每新增按钮、动效、派生字段，都要检查是否会让每张卡多一个 state、timer、motion 或大对象闭包。能下沉到纯 helper 的逻辑下沉，能按需计算的不要常驻渲染。
- **“刷新后几秒才出现列表 / 点导航等几秒”通常不是纯渲染卡**：先查是否把 UI 更新绑在远端接口后面。项目列表应先读本地摘要缓存再后台刷新；阶段导航应先更新本地 `currentStage`，项目快照随后补水。
- **修 UI 性能时不要随手增加 hook 订阅数量**：尤其在 Vite HMR + ErrorBoundary 下，给同一自定义 hook 多加 `useAuthStore`/store hook 可能触发 `Rendered more hooks than during the previous render`。缓存元数据这类非渲染依赖优先用 `store.getState()` 快照读取。
- **typecheck 通过不等于 UI 可用**：UI 改完至少要做一次真实页面手测或 Chrome 性能观察，重点看滚动、输入、展开/折叠、生成中状态、复制按钮点击后的响应。
- **如果用户反馈“卡”**：先查本轮新增的 render-time 计算、全局 store selector、map 列表、Framer Motion/AnimatePresence、setTimeout/interval 和大文本 formatter，不要先怀疑浏览器或机器。

## 我最容易再犯的错

- 只看到报错点，不追第一次越界的位置。
- 看见历史 PASS 就急着背书当前状态。
- 觉得“先兼容一下”没关系，最后把第二口径扶正。
- 文档里口头说归档了，但物理文件还留在现役区。
- 为了省事直接问用户，而不是先查代码、日志和现役文档。
- 看到 HTTP 路由存在就默认后端已经接管，没继续追到 application 层是不是还只是 TODO 壳。

## 以后必须提醒自己

- 每轮回复先说：`爱你，波别！`
- 不再主动汇报上下文百分比、上下文剩余或“无法精确读取”；用户明确问时再答。
- 每次代码改动后、每次出现新问题、每次出现新结论时，立刻补五件套。
- 如果发现第二口径、保底、隐藏降级、补丁链，优先收口，不要继续往前堆。
- 删除 main 旧链后，要立刻补一条文档：server 端是不是已经有真实现；如果没有，就把它写成当前唯一待办，不准让 TODO 壳伪装成完成态。
- 可以自己精确杀进程清理现场，但杀前必须确认 PID、命令行和用途，不能误杀 AI 宿主、当前终端或项目外关键进程。
