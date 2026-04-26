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
- 旧业务链退役必须物理删除；只把 IPC 改成 deprecated 壳，会让旧 prompt、旧测试和旧 DTO 继续作为第二口径回流。
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
- **具体主角名必须硬锁**：`storyIntent.protagonist` 已经是 `林霄` 时，后续人物 agent 生成 `陆渊` 这类疑似主角不能并存，必须统一替换回锁定名，否则骨架、详细大纲会被双主角污染。
- **短剧轻量卡不能只靠“多余实名角色”产生**：20 集项目如果模型只返回 8 个完整实名人物，势力空席也必须转成轻量人物卡，否则 UI 会出现“完整 8、轻量 0、待补席位 5”的假收口。
- **通用字段补全不能写统一性格模板**：`职责边界/规矩解释权/只按规矩办事` 这种兜底会让不同阵营人物同质化；缺字段时要按爪牙、忠诚卧底、家族合作者等功能分流补全。
- **补全模板不能硬编码上一个项目的名词**：忠诚卧底、家族合作者、情感棋子这类模板里的家族名和主角名必须从当前 `storyIntent`/角色摘要推断，不能把 `慕容家`、`主角` 串到苏家/叶辰项目里。
- **复制文本暴露的是最终产品质量**：`。，/。。`、重复 `想要`、`表面是X是` 这类看似展示小问题，会直接破坏用户判断；拼接、去重、前缀清洗要在源头或 copy helper 里有回归。
- **功能席位也要有最小戏剧差异**：轻量卡里的护法、弟子、情报、执行不能共用“撑住势力线”；即使是 slot，也要写出守山门、递话探路、抢消息、办脏活等可被剧本调用的功能目标。
- **人物小传不能只当字段表**：V2 人物仍保留结构字段，但 `biography` 必须是自然人物小传，`arc` 必须写触发/摇摆/代价/终局，`conflictTrigger` 和 `advantage` 必须是可拍、可写进剧本的具体动作抓手。
- **Prompt 和解析层要双保险**：先用 Prompt 要求模型写好人物底账，再在 `parseCharacterProfileV2Response` / `mapV2ToLegacyCharacterDraft` 兜住硬拼小传和结果式弧线。
- **人物小传质量不能只靠 Prompt**：模型仍可能返回没点名、像字段拼接的 `biography`，必须由 V2 映射层判断“是否自然且包含人物名”，不合格就按五维重新融合。
- **人物弧线不能只拦“最终/背叛/醒悟”关键词**：模型会写“从A走到B”这种无标签弧线；清洗规则要检查起点/触发/摇摆/代价/终局五段是否齐全。
- **家族名推断要防中文误捕获**：不要从“从小被培养为家族棋子”里截出“培养为家”；优先用明确 `XX家`，没有再用人物姓氏 + `家`。
- **产品验收面会暴露隐藏字段**：Prompt 生成了外在形象、身份、性格、价值观、剧情作用，如果复制文本不输出这些字段，用户仍会认为小传没提升。
- **server 本地 shared 副本已退役**：`server/src/shared/` 不能再恢复；server 必须通过 `@shared/*` 使用根 `src/shared/*`，否则人物合同和题材策略会重新变成双口径。
- **势力矩阵的成员表不是关系表**：模型会为了表达冲突，把仙盟盟主、反派大小姐、世家管家复制进主角宗门；这是底账污染。跨势力利用/卧底/安插必须进 `crossRelations`，成员表只放主归属。
- **人物 profile 的 `factionId` 比占位名更可信**：如果 faction matrix 占位把同名人物放错阵营，而 V2 profile 已声明主归属，应跳过错误占位、合并同名实体，并按 profile 主归属补回缺失完整人物。
- **轻量卡重复完整人物是 identity 解析失败，不是展示小问题**：`masterEntityId` 会因同名多实体失配；展示层需要按名字兜底隐藏已升完整人物，但根修仍在 entityStore 去重。
- **兜底文案不能进入成稿**：“想守住自己还能掌控的位置”“退回场外”“关键杠杆”这类系统兜底话一旦出现在用户可见小传，就是质量门失败。兜底只能补结构，不能泄漏模板腔。
- **20 集人物策略是完整/轻量分流，不是全部深写**：20 集默认完整小传最多 8 个，功能人物和边缘中层先进入轻量卡/世界底账，需要时再升级；否则人物页会臃肿且后续骨架被无关角色稀释。
- **工程验证不等于产品质量通过**：人物链路修完后必须用用户真实项目重新生成一版，看唯一主角、真女主/反派分离、轻量卡分流和小传文案质量，确认后才能继续骨架。
- **P0 不能再靠表层补丁推进**：人物小传/骨架链路要先建立 canonical bundle，把人物底账、骨架、warnings、diagnostics 放进同一个正式交接包；旧返回结构只做兼容投影。
- **合同校验要拦半成品**：人物如果只满足旧 `CharacterDraftDto` 或只满足 V2 `CharacterProfileV2Dto`，都会让后续生成拿到半套账本；合同必须要求两边同时完整。
- **诊断日志要变成数据**：`rough_outline_failed_without_temporary_skeleton` 这类关键信号不能只 append log，必须进入 bundle diagnostics，后续 UI、回归测试和排障才能读同一套真相。
- **AI 返回“有内容但 JSON 外壳坏”是可恢复错误**：人物 V2 阶段不能因为 `json_parse_failed` 整步 500；先从 fenced/prose 里提取 JSON，仍失败就用势力矩阵占位生成 fallback 人物，并通过 `faction_parse_fallback` 留诊断。
- **真实输出通过 HTTP 不等于质量过关**：这轮链路不再 500，但用户贴出的正文仍暴露模板句、弧线复制、轻量卡重复和跨阵营归属错误；以后必须把“能生成”和“可承接骨架”分开验收。
- **箭头弧线是模型常见偷懒格式**：`A → B → C → 最终D` 不能直接显示，必须拆首尾，触发/摇摆/代价优先取结构字段，否则就会出现“起点里塞完整链、终局再塞完整链”的重复。
- **同族归属比 placeholder 更可靠**：`慕容福/慕容管家` 这类管家型人物常被势力矩阵误塞进主角宗门；若同族核心人物已在仙盟/家族线，管家、家臣、暗卫应跟随家族主归属。
- **轻量卡重复往往来自数组展示，不是模型新生成**：`想要 A / A。` 这种问题要在 preview join 前做标点归一去重，不能只改 prompt。
- **耗时异常先查是否整链重跑**：这次 424 秒变 900 秒，不是单个模型变慢，而是合同层把泛称“主角”当具体姓名校验，误判 `叶辰` 没覆盖主角，触发整条生成链第二轮。以后慢一倍先查 `[OutlineCharacters] contract retry`。
- **泛称锚点必须软化**：`主角`、`男主`、`反派` 不是人物名，不能要求生成结果里有人叫这个名字；只有 `林霄/叶辰/苏天雄` 这种具体名才适合做硬覆盖校验。
- **补救链路也要有性能边界**：人物 JSON 坏掉后 adaptive split 能保质量，但串行单人补救会把一次坏 JSON 放大成几分钟；至少要有限并发，并继续观察是否需要更早 fallback。
- **守护女主不能走通用利益杠杆兜底**：`掌门之女/青瑶仙子/暗中守护主角` 这类人物如果缺字段，应该补保护主角、父亲、宗门和真相，不得泄漏“旧账/外部靠山/被对手牺牲”模板。
- **亲传大弟子不是普通爪牙**：`亲传大弟子/师父/同门/掌门派` 的压力是师命、同门规矩和主角安危之间的取舍，不是“证明自己有用/被更强的人替掉”。
- **爪牙模板不能滥用收养忠诚**：只看到“盟主/仙盟长老”不能自动生成“养育恩情/正道名分”；只有明确收养、养育、忠心耿耿、言听计从时才走个人忠诚线，`爪牙/执行/灭口` 优先走压迫执行线。
- **人物主归属可从身份文本纠偏**：如果 V2 profile 写明“正道仙盟盟主/仙盟长老”，即使 `factionId` 被模型写错，也应按 identity/biography 纠到仙盟；成员表继续只放主归属。
- **弧线阶段标签要去壳**：模型会给链条节点写 `起点的X`、`终局变化：Y`，重建结构化弧线时必须先剥掉阶段标签，避免显示 `起点：起点...`、`终局变化：终局变化...`。
- **玄幻样本修好的规则不能当全局规则**：宗门、仙盟、魔尊血脉、掌门之女、亲传大弟子这些词只属于某些策略；继续留在全局会让女频、都市、律政项目串味。
- **题材策略层和 MarketPlaybook 是两件事**：策略层负责世界类型、人物位和禁用词；MarketPlaybook 负责当月热门打法。混在一起会让“题材正确”和“打法热门”互相覆盖。
- **污染检测是题材适配的验收口**：非玄幻题材出现仙盟/宗门/血脉，不是文案小瑕疵，而是策略分发失败，必须有回归测试拦住。
- **题材污染第一刀要修权威底账，不只修展示文案**：人物/骨架阶段应在 canonical bundle 组包前清洗 `outlineDraft`、`characterProfilesV2`、`factionMatrix`、`entityStore` 和可见人物小传；清洗后再检测残留，这样详细大纲不会继续吃到串味底账。
- **题材清洗能力必须上移共享层**：人物/骨架和详细大纲都需要清理嵌套 DTO，递归替换不能藏在某个业务文件里；应由 `GenerationStrategy.repairStrategyContaminationValue` 统一处理任意生成值，业务层只决定在哪个阶段出口调用。
- **正式剧本不要再加第二个审计口**：postflight 已能发现 `generation_strategy_contamination`，batch guard/retry 已接入 `strategy_contamination` 负责前置重写；后续继续降污染时只能加强这条问题单/重写链，不能复制新的后处理链。
- **策略污染进 batch 时要复用 EpisodeGuardFailure**：`strategy_contamination` 应由 `run-script-generation-batch` 每集解析后采集，并进入 `pickEpisodeRetryMode`、`buildEpisodeEditPrompt`、`shouldAcceptRepairCandidate` 同一条链；候选接受逻辑要能传入已知 failures，否则干净重写可能因结构差异被误拒。
- **不要只拦样本路径，要清掉默认兜底源头**：张强样本被 enforcer 分流后看似不漏“旧账/外部靠山”，但 `buildGeneralLeverDraft` 默认分支仍会把同类模板漏给下一个未知人物。只修分流不修默认源头，下一轮还会复发。
- **字段硬拼 biography 是展示合同失败**：模型哪怕返回完整 V2 字段，只要 biography 里出现 `身份是/性格底色/在戏里`，用户看到的就是拼接表，不是人物小传；映射层必须重建自然段。
- **结构化弧线也会重复整链**：模型会把“起点→中期→后期→最终”整段塞进终局字段；不能只判断有五个标签就放行，还要检查终局是否重复整条链。
- **构建产物可能放大旧模板误判**：源码已改但 `out/`、`server/dist/` 仍有旧文本时，用户本地若没重建/服务没重启，会继续看到旧“自己这条线”。验证时要区分源码、构建产物和正在运行的进程。
- **ignored dist 不能当当前后端真相**：`server/dist` 被 `.gitignore` 忽略，却能被 `server npm start` 使用；如果它残留旧模板，应该清掉或重新构建，避免误跑旧产物。
- **大长老本人不是大长老爪牙**：`大长老最倚重的爪牙` 应该是执行者；`某人是大长老，野心夺血脉、取代掌门` 才是权力核心反派。规则如果只搜“大长老”会误伤，要同时看身份语法和夺权动机。
- **阶段标签也是模板泄漏**：即使弧线已经有五段，只要出现 `起点：起点是`、`触发事件为`、`代价选择 → 终局`，用户看到的仍是模型草稿。展示层要把阶段标签和箭头终局拆干净。
- **自然小传不要把字段名换个说法硬塞进去**：`让X信奉`、`在主线里的作用`、`行动抓手` 看似比 `身份是/性格底色/在戏里` 隐蔽，但本质仍是字段拼接，必须在 V2 映射层拦掉。
- **情感兜底要防性别错位**：模型会把“活泼师妹/她/少女”塞给 `林尘` 这类男性名；兜底层不能只看摘要，还要用人名和身份做二次中性化，避免角色底账自相矛盾。
- **全局弹窗不能相信局部 z-index**：充值弹窗挂在 header 组件里，即使 `fixed z-50`，也会被阶段大弹层/局部 stacking context 压住。登录、充值这类全局 UI 必须 portal 到 body，并锁滚动。
- **钱包到账和流水成功是两件事**：这次手动补积分先更新了 `user_wallets`，但 `xinjuben_transactions` 因线上 schema 与代码枚举不一致写入失败。以后处理支付/积分问题要分别查余额和流水，不要只看其中一个。

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
