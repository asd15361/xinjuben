# 2026-04-06 主线

这份文档只服务当前这一条主线。

做完就归档到 `docs/归档/主线/`，下一轮另起新的日期文档。

## 当前主线在解决什么

把用户亲口确认的短剧/漫剧写作方法论，收成项目里唯一创作口径，并按 `Agent first` 重构剧本链。

当前不是“完全没上链”，而是“上游两级总控已经起来，但下游还没彻底收口”：

- 项目级短剧创作宪法已经落到 `storyIntent.shortDramaConstitution`。
- 集级控制卡已经落到 `episodeBeats[].episodeControlCard`。
- `short_drama_showrunner_agent` 和 `episode_control_agent` 已经真接上确认信息 / 详纲工序。
- 当前剩下的主缺口是：
  - 首稿 prompt 还没彻底瘦成纯执行器。
  - 旧文件命名和旧日志噪音还没完全退场。

## 为什么现在要做这条主线

- 用户已经明确给出这套方法论，而且要求它成为唯一口径，不是参考意见。
- 继续修 `duplicate / persist / char_count` 这类技术点，只会在旧创作架构里反复。
- 当前最该收的不是某个局部 bug，而是“谁在定义剧本应该怎么写”。

## 唯一创作口径

1. 核心原则：`快节奏、强冲突、稳情绪`
2. 激励事件：`30 秒炸场，最晚不超过第 1 集结尾，立刻打破平静并立主线`
3. 主角弧光：`打脸式成长，先有错误信念，再被剧情一集一集打碎`
4. 叙事视角：`默认单主角视角，其他视角只能补主线必要信息`
5. 高潮设计：`集集有小高潮，集尾强钩子，结局总爆发并回打激励事件`
6. 核心情绪：`全剧只死磕一个核心情绪，不中途乱跳`

## 架构结论

这套口径不能继续散落在胖 prompt、theme block、quality score 和各 Agent 自行理解里。

当前主线要把它收成两个唯一真相源：

- 项目级真相源：`storyIntent.shortDramaConstitution`
- 集级真相源：`episodeBeats[].episodeControlCard`

并把剧本链收成 6 个单职责角色：

- `short_drama_showrunner_agent`
- `episode_control_agent`
- `script_draft_agent`
- `episode_engine_agent`
- `arc_control_agent`
- `emotion_lane_agent`

技术型 Agent 继续保留：

- `format_pollution_agent`
- `scene_structure_agent`
- `char_count_agent`

## 当前代码判断

- `src/shared/contracts/intake.ts`
  - `StoryIntentPackageDto.shortDramaConstitution` 已经存在
- `src/shared/contracts/workflow.ts`
  - `DetailedOutlineEpisodeBeatDto.episodeControlCard` 已经存在
- `src/main/application/workspace/confirm-story-intent-from-chat.ts`
  - 确认信息阶段已经正式走 `summarize -> short_drama_showrunner_agent -> buildConfirmedStoryIntent`
- `src/main/application/workspace/generate-detailed-outline.ts`
  - 详纲阶段已经正式走 `episode_control_agent`
- `src/main/application/script-generation/prompt/create-script-generation-prompt.ts`
  - 仍然是大一统胖 prompt，首稿背了太多创作判断
- `src/main/application/script-generation/build-execution-plan.ts`
  - 已把 `shortDramaConstitution + episodeControlCard` 收成 `scriptControlPackage`
- `src/main/application/script-generation/runtime/repair-script-quality-with-agents.ts`
  - 对外派单口径已经收成 `episode_engine / arc_control / emotion_lane`
  - 当前已优先读取 runtime 控制包
- `src/main/application/script-generation/runtime/emotion-lane-agent.ts`
  - 文件名和正式职责都已对齐到 `emotion_lane`

这说明：当前项目已经跨过“真 Agent 接线”和“旧返修口径退场”两道坎，但还没彻底做到你说的 `Agent first`。

## 当前新增进展（2026-04-09 第五轮）

- 人物系统第二刀已正式落地：
  - `src/renderer/src/features/character/model/derive-character-stage-sections.ts`
    - 已把人物页正式拆成：
      - `fullProfiles`
      - `lightCards`
      - `factionRoster`
    - 已把“谁算已升级完整人物”收成：
      - 优先认 `masterEntityId`
      - 没有时按名字回查 `entityStore`
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`
    - 人物页现在会直接读取项目里的 `entityStore`
    - 完整小传 / 轻量人物卡 / 势力与人物位 三轨已经挂上
    - 轻量人物卡已支持一键升级成完整小传
- 这轮刻意没做的事：
  - 没改 `saveCharacterDrafts()` 合同
  - 没把轻量人物卡做成第二套持久化真相
  - 没顺手把第三刀 `activeCharacterPackage` 一起揉进来
- 本轮验证：
  - `node --test src/renderer/src/features/character/model/derive-character-stage-sections.test.ts src/renderer/src/features/character/model/derive-active-character-blocks.test.ts src/renderer/src/features/outline/model/build-outline-entity-store-view-model.test.ts`
  - `npm run typecheck:web`
  - `npm run typecheck:node`
  - `npx -y react-doctor@latest . --verbose --diff`
  - 当前通过；`react-doctor` 评分 `99/100`
- 当前下一步：
  - 第三刀进入 `activeCharacterPackage`
  - 让详细大纲和剧本默认只吃当前 `5` 集批次活跃人物，而不是整包人物

## 当前新增进展（2026-04-09 第六轮）

- 人物系统第三刀 `activeCharacterPackage` 这轮已从“共享派生”进入正式消费口：
  - `src/shared/domain/workflow/active-character-package.ts`
    - 当前已正式负责按批次派生：
      - `memberNames`
      - `debutCharacterNames`
      - `carryOverCharacterNames`
      - `upgradeCandidateNames`
  - `src/shared/domain/workflow/planning-blocks.ts`
    - 当前剧本 batch context 已正式挂上 `activeCharacterPackage`
  - `src/main/application/workspace/generate-detailed-outline.ts`
    - 每个详纲批次在调用模型前，会先按当前批次派生活跃人物包
    - 详纲 prompt 当前默认只吃当前批次人物，不再整包吃人
  - `src/main/application/script-generation/prompt/create-script-generation-prompt.ts`
    - 当前会显式输出 `【当前批次活跃人物包】`
    - `角色摘要`、压缩人物块和 `【对白口风】` 都会先按当前批次人物包收窄
  - `src/renderer/src/features/script/ui/script-stage-actions.ts`
    - 当前新增纯 helper：
      - `buildStartScriptGenerationRequest()`
      - `buildRewriteScriptEpisodeRequest()`
    - 负责把 `entityStore` 和 `scriptControlPackage` 一起收进正式 request
  - `src/renderer/src/features/script/ui/useScriptStageActions.ts`
    - 当前剧本页“开始生成 / 重写这一集”都会先取当前项目快照
    - 然后把 `project.entityStore` 一起带进正式 runtime 入口
  - `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
    - 手动重写单集的 handler 已把 `entityStore` 继续透传到 `rewriteScriptEpisode()`
- 本轮补的定向测试：
  - `src/shared/domain/workflow/active-character-package.test.ts`
  - `src/shared/domain/workflow/planning-blocks.test.ts`
  - `src/main/application/workspace/generate-detailed-outline.test.ts`
  - `src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts`
  - `src/renderer/src/features/script/ui/script-stage-actions.test.ts`
  - `src/main/ipc/workflow/script-generation-runtime-handlers.test.ts`
- 本轮验证：
  - `node --test src/shared/domain/workflow/active-character-package.test.ts`
  - `node --test src/shared/domain/workflow/planning-blocks.test.ts`
  - `node --test src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts`
  - `node --test src/renderer/src/features/script/ui/script-stage-actions.test.ts`
  - `node --test src/main/ipc/workflow/script-generation-runtime-handlers.test.ts`
  - `node --test --test-name-pattern "generateDetailedOutlineFromContext" src/main/application/workspace/generate-detailed-outline.test.ts`
  - `npm run typecheck:node`
  - `npm run typecheck:web`
- 当前判断：
  - 第三刀已经不再只是“共享 helper 准备好了”
  - 正式产品入口现在真的会把 `entityStore` 带进剧本开始 / 重写链
  - 详纲和剧本都已经开始按批次收窄人物，不再默认整季全量吃人

## 当前新增进展（2026-04-09 第七轮）

- 虽然当前主线文档已经到 `6/6`，但这轮又补了一条直接影响正式体验的收口：
  - 旧项目现在不会再被“之前已经生成过一次”锁死
  - 粗纲页、人物页、详细大纲页都已经有显式重生入口
- 本轮正式落点：
  - `src/renderer/src/app/hooks/useOutlineCharacterGeneration.ts`
    - 粗纲页 / 人物页共用正式重跑 hook
  - `src/renderer/src/app/utils/outline-character-generation.ts`
    - 前台 `生成 / 重新生成` 文案和 notice 口径
  - `src/renderer/src/features/outline/ui/OutlineStage.tsx`
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`
  - `src/renderer/src/features/detailed-outline/ui/detailed-outline-stage-label.ts`
  - `src/renderer/src/components/DetailedOutlineStageHeader.tsx`
  - `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx`
  - `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts`
- 这轮关键约束继续守住了：
  - 没有新开粗纲/人物重跑旁路
  - 继续复用“确认版七问 -> 粗纲和人物”正式链
  - 粗纲/人物重跑成功后，下游旧详纲和旧剧本会一起让位
- 本轮验证：
  - `node --test src/renderer/src/app/utils/outline-character-generation.test.ts`
  - `node --test src/renderer/src/features/detailed-outline/ui/detailed-outline-stage-label.test.ts`
  - `node --test src/renderer/src/features/workspace/ui/workspace-chat-error-message.test.ts`
  - `node --test src/renderer/src/features/detailed-outline/ui/detailed-outline-entry-guard.test.ts`
  - `npm run typecheck:web`
  - `npm run typecheck:node`
  - `npx -y react-doctor@latest . --verbose --diff`
- 当前判断：
  - 这轮补掉的是“页面只能首生、不能重生”的产品缺口
  - 主线完成状态不变，但正式体验更完整了

## 当前新增进展（2026-04-10 七问确认回归收口）

- 用户现场反馈的正式问题已坐实：
  - 旧项目点“重新生成粗纲和人物”后，会被要求先去确认七问
  - 七问确认完再回来，系统仍然继续报“先去确认七问”
  - 这不是刷新误判，而是正式“七问确认 -> 粗纲和人物”链真的发生了真相丢失
- 已直接核对本机正式数据：
  - `%APPDATA%\\xinjuben\\workspace\\projects.json`
  - `%APPDATA%\\xinjuben\\runtime-diagnostics.log`
  - 最新项目 `project_mn1d9gkd` 当时 `outlineBlocks=0`、`hasSevenQuestions=false`
  - 对照项目 `project_mnomwngy` 保留着 `outlineBlocks=3`、`hasSevenQuestions=true`
- 当前根因已收口成两层：
  - 七问确认后，前台没有复核“是否真的持久化成功”
  - 普通 `saveOutlineDraft()` 在 incoming 未带 `outlineBlocks` 时，会把已确认七问擦掉
- 已做正式修复：
  - `src/renderer/src/features/seven-questions/model/confirmed-seven-questions-persistence.ts`
    - 新增正式回读校验；没读到确认版七问就抛 `seven_questions_confirm_save_failed`
  - `src/renderer/src/features/seven-questions/ui/SevenQuestionsReviewPanel.tsx`
    - `saveConfirmedSevenQuestions()` 后会先回读正式项目快照
    - 先把已保存 outline hydrate 回当前前台，再继续生成粗纲和人物
  - `src/main/infrastructure/storage/merge-outline-draft-authority.ts`
    - 普通粗纲保存如果 incoming 没带 `outlineBlocks`，会保留 existing 的篇章块和七问
  - `src/renderer/src/features/workspace/ui/workspace-chat-error-message.ts`
    - 已补前台直白错误文案：`这次七问没有保存住，先重新确认七问再继续`
- 已补验证：
  - `node --test src/main/infrastructure/storage/merge-outline-draft-authority.test.ts`
  - `node --test src/renderer/src/features/seven-questions/model/confirmed-seven-questions-persistence.test.ts`
  - `node --test src/renderer/src/features/workspace/ui/workspace-chat-error-message.test.ts`
  - `node --test src/shared/domain/workflow/seven-questions-authority.test.ts src/main/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.test.ts`
  - `npm run typecheck:web`
  - `npm run typecheck:node`
- 当前判断：
  - 这轮修掉的不是提示词或按钮文案，而是正式七问确权链的持久化回归
  - 主线完成状态不变，当前进度仍是 `6/6`；这轮属于正式体验回归收口

## 当前新增进展（2026-04-10 旧项目人物底账回填）

- 用户继续现场反馈的真问题已坐实：
  - 人物页虽然已有 `4` 张完整人物小传
  - 但 `轻量人物卡=0`、`势力与人物位=0`
  - 不是展示文案问题，而是旧项目的 `entityStore` 根本还是历史空值
- 已直接核对本机正式项目：
  - `project_mn1d9gkd`（修仙传）此前 `characterDrafts=4`，但 `entityStore.characters=0`、`entityStore.factions=0`
  - `project_mnomwngy`（韦小宝）此前 `characterDrafts=3`，但 `entityStore.characters=0`、`entityStore.factions=0`
- 已做正式修复：
  - `src/main/infrastructure/storage/project-snapshot-normalize.ts`
    - 旧项目读快照时，会先用已确认的 `storyIntent.generationBriefText` 回填 `entityStore`
    - 然后再把现有 `characterDrafts` 合并进底账，保住完整人物 richer fields
  - `src/main/application/workspace/decompose-chat-for-generation.ts`
    - 势力拆解已增强，能识别：
      - `玄玉宫`
      - `天地会`
      - `青木堂`
      - `清朝皇宫`
    - 不再把 `天地会青木堂`、`玄玉宫等七座道观` 这种长串整体吞进正式底账
  - `src/main/application/workspace/summarize-chat-for-generation-structured-parser.ts`
    - 已补主角 / 对手 / 关键角色名清洗
    - 避免把整句人物说明误当成正式人物名
- 已补验证：
  - `node --test src/main/application/workspace/decompose-chat-for-generation.test.ts src/main/infrastructure/storage/project-snapshot-normalize.test.ts`
  - `npm run typecheck:node`
  - `npm run typecheck:web`
- 当前判断：
  - 这轮补掉的是“旧项目没有世界底账就永远看不到势力页”的正式回归
  - 主线完成状态不变，当前仍是 `6/6`

## 当前新增进展（2026-04-10 势力位自动展开）

- 用户继续要求的人物页观察口已再收一刀：
  - 旧项目虽然已经能回填出 `entityStore`
  - 但人物页里的“势力与人物位”此前仍然只会显示真实 `memberCharacterIds`
  - 这会让“有势力、但实名人物还没写全”的项目继续看起来像 `0`
- 已做正式修复：
  - `src/renderer/src/features/character/model/derive-character-stage-sections.ts`
    - 已新增 renderer 派生层只读席位：
      - `placeholderSeats`
      - `factionSeatCount`
    - 当前会按势力类型自动补位：
      - 宗门：`宫主位 / 长老位 / 执事位 / 护法位 / 门下弟子位`
      - 组织：`会主位 / 二把手位 / 骨干位 / 执行位 / 情报位`
      - 家族 / 官面 / 其他势力也各有默认席位
    - 这些席位不会写回 `entityStore`，也不会冒充正式人物真相
  - `src/renderer/src/features/character/ui/CharacterStage.tsx`
    - 势力卡现在正式拆成：
      - `已实名人物`
      - `待补席位`
    - 顶部“势力与人物位”统计现在按总席位数显示，并补充“已识别多少方势力”
- 已补验证：
  - `node --test src/renderer/src/features/character/model/derive-character-stage-sections.test.ts`
  - `npm run typecheck:web`
  - `npm run typecheck:node`
  - `npx -y react-doctor@latest . --verbose --diff`
- 当前判断：
  - 这轮补掉的是“势力存在但人物位还是 0”的观察层缺口
  - 当前策略仍然守住了：只读席位停留在 renderer 派生层，不进入持久化和下游正式生成链

## 当前目标

把剧本链彻底收成这一套：

- 上游先产出唯一短剧宪法
- 中游逐集产出唯一控制卡
- 首稿只执行当前集控制卡
- 写不好就交给窄职责 Agent 修
- 不再留旧创作口径和新创作口径双轨并行

## 指挥执行计划（交执行人）

这段不是散点待办，而是这条主线剩余工作的正式指挥稿。

执行人拿这份计划时，目标不能再写成“继续补几个点”，而要写成：

- 把项目彻底收成“控制包定创作、首稿只执行、内容问题只派 Agent、结果一定能落盘”的系统
- 把当前复杂度从“旧工程残留制造的混乱”压回到“内容问题交给 Agent，系统问题交给系统修”

### 当前全局判断

- 创作方法论已经正式进系统：
  - 项目级：`storyIntent.shortDramaConstitution`
  - 集级：`episodeBeats[].episodeControlCard`
  - 剧本 runtime：`scriptControlPackage`
- 创作返修正式口径已经收成：
  - `episode_engine`
  - `arc_control`
  - `emotion_lane`
- 第 `14` 集“rewrite 被旧胖稿覆盖”这条已经命中并收住：
  - 最新真实 evidence 形态已经变成 `attempt1` 胖稿 -> `attempt2 failures=[]`
- 当前剩余复杂度，不再来自“方法论没写进去”，而主要来自三件事：
  - 首稿执行器还没完全瘦下来
  - 旧口径在日志、说明、质量信号里还没有全部退场
  - 真实验收脚本的 `waitForProject/script_ready` 仍会制造假红灯，但这是测试脚本问题，不是产品主红点

### 这条主线现在到底要收什么

这条主线接下来不再追求“多做一些改良”，而是只收下面三层：

- 创作层：
  - 让首稿真正退回执行器定位
  - 让内容问题统一进入 Agent-first 流程
- 口径层：
  - 让 prompt、quality、agent、日志、测试、对外文案只剩一套现役说法
- 验收层：
  - 让真实验证脚本不要再把“外层等待超时”误判成“系统没落盘”
  - 这层只负责校准观察口，不再作为产品主线红点

### 执行边界

这轮执行必须死守边界：

- 不扩新功能
- 不发明新裁判口
- 不把内容问题重新修成 gate
- 不因为测试脚本超时，就回头怀疑方法论或产品保存链本身
- 不把“真实内容问题”和“系统没写回”混在一起记

执行人每一轮都要先判断：当前红点到底属于哪一层。

- 如果是“写胖了、写瘦了、钩子弱了、角色飘了”，这是内容层，走 Agent-first
- 如果是“Agent 改对了但没保留、结果没落盘、前台还在 pending”，这是系统层，不能再甩给内容 Agent

### 总体战法

这条主线现在按五个工作面推进，但不是五条并列待办，而是一套依赖关系：

- 先冻结现役口径，不再让旧说法继续抢权
- 再把首稿执行器彻底收瘦，防止 prompt-first 继续冒头
- 再把 Agent-first 的分诊、收稿、保稿逻辑彻底收死
- 再校准真实验收脚本的超时观察口，防止测试脚本继续制造假失败
- 最后用真实 evidence 做全链验收，决定主线归档

下面五个工作面里，真正的主线顺序是：

- 口径冻结
- 首稿执行器
- Agent-first 闭环
- 验收脚本校准（非主红点）
- 真实验收

### 工作面一：口径冻结

这个工作面不是“整理文档”，而是防止第二口径继续反弹。

执行目标：

- 全仓现役代码、日志、错误码、质量信号、测试断言，只允许继续发出当前口径
- 历史 `continuity / character_arc / theme_anchor` 只能留在归档证据里，不能再冒充现役掌权口径

执行动作：

- 审计 runtime 日志、UI 提示、错误码、测试名、说明文案里仍在发声的旧命名
- 审计 `screenplay-content-quality.ts`、`screenplay-quality.ts`、postflight 文案里是否还把创作问题说成旧口径
- 审计 prompt block、quality signal、agent dispatch 之间是否还存在“同一问题三套叫法”

交付物：

- 一份旧口径残留清单
- 一轮物理收口 diff
- 一组定向测试，证明旧说法不再从生产口冒出来

完成标准：

- 现役生产路径里，不再存在旧口径与新口径并列掌权
- 历史名字最多只出现在归档、注释或明确的 legacy 壳里

### 工作面二：首稿执行器收瘦

这是当前创作层最关键的一刀。

执行目标：

- 首稿不再扮演 showrunner、主题裁判、人物裁判、总导演
- 首稿只执行当前集控制包和 sceneByScene
- 首稿的任务被收成：炸点、冲突、结果、钩子、视角、情绪 lane 的最小必要落地

执行动作：

- 全面拆 `create-script-generation-prompt.ts`，把 prompt 内容分成三类：
  - 必须保留的执行合同
  - 可以降级为辅助说明的背景脚手架
  - 必须删除的二次创作裁判块
- 明确 `script_draft_agent` 的正式职责说明
- 把“高级工艺”从首稿侧继续下放给后续 Agent，不允许再在首稿 prompt 里一次写满
- 做 prompt diff 审计，防止表面改口、实则旧块继续躺在 prompt 里

交付物：

- 首稿 prompt 结构图
- 收瘦后的 prompt 文本
- 对应定向测试
- 一份“删掉了哪些旧裁判块、为什么删”的记录

完成标准：

- 首稿 prompt 只保留执行性要求
- 一旦控制包和旧散规则冲突，系统只认控制包
- 执行人能明确指出“哪些要求由首稿负责，哪些要求由后续 Agent 负责”

### 工作面三：Agent-first 闭环收死

这个工作面不是新增 Agent，而是让现有 Agent 真正掌权且不被系统反向破坏。

执行目标：

- 内容问题只做分诊，不再升级成失败态
- rewrite 改对后的版本必须能保留下来
- Agent 的输入、评分、收稿、保稿逻辑全部围绕“更接近正式合同”展开

执行动作：

- 审计 `screenplay-content-quality.ts` / `screenplay-quality.ts` / `screenplay-repair-guard.ts`
- 把“问题发现”“派哪个 Agent”“候选稿是否允许覆盖原稿”这三层关系彻底写死
- 重点补一组 failure transition 回归：
  - 胖稿 -> 压回合同附近 -> 只剩轻问题
  - 结构正确 -> rewrite 变差 -> 拒收
  - 内容过线 -> 后续 Agent 不得反向写胖
- 明确 observe-only 和 actionable 的边界，观察口不准偷偷触发自动重写

交付物：

- 一张正式分诊表：问题码 -> Agent -> 收稿条件
- 一组选稿 / 收稿 / 拒收回归
- 一份说明：当前系统怎么判断“哪一版才是当前最佳稿”

完成标准：

- 内容问题进入 Agent-first 流程后，不再被系统错误升级成失败
- rewrite 一旦更接近合同，就不会再被旧稿覆盖回来
- 轻问题不会再压过严重超线问题

### 工作面四：验收脚本超时校准（非主红点）

这个工作面不是产品问题主战场，只是把观察口校准，避免下一轮继续被假红灯带偏。

执行目标：

- `v11-wordcount-strap-test.mjs` 不再把“外层 wait 超时”误判成“系统没落盘”
- `waitForProject/script_ready` 的观察口能反映最终真实状态，而不是超时瞬间的半成品快照
- 这层修完后，只作为验收脚本可信度提升，不再继续占用主线判断

执行动作：

- 审 `tools/e2e/v11-wordcount-strap-test.mjs` 的 `TIMEOUTS.script_ready`
- 审 `waitForProject` 的超时判定和外层返回语义
- 校准脚本，让它区分：
  - 前台等待超时
  - Electron 仍在后台继续执行
  - 最终快照是否已正常落盘
- 输出一份“测试脚本超时 ≠ 产品失败”的说明和修正口径

交付物：

- 一处脚本修正
- 一份观察口说明
- 一组对照材料：超时瞬间快照 vs 最终 `projects.json/script.json/visible.json`

完成标准：

- 脚本不再把后台继续完成的真实运行误报成保存失败
- 这项工作完成后，从主线红点列表中退场

### 工作面五：真实验收与归档判定

这个工作面不是“再多跑几轮看看”，而是用统一口径做最后验收。

执行目标：

- 用真实 evidence 证明当前系统已经回到 user 要的主链
- 把“内容问题”和“系统问题”分别验清
- 决定主线是归档，还是只剩内容层副线

执行动作：

- 保留两类真实验收：
  - `10` 集：验证首稿 + Agent-first 内容链是否稳定
  - `20` 集：验证中段波动和整轮落盘是否稳定
- 每次验收都必须同时看三层材料：
  - attempt evidence
  - 落盘产物
  - 前台状态
- 不能只看 passRate，也不能只看 script.json
- 真实 run 结束后，必须直接给出一句当前主判断：
  - 当前主问题在内容层
  - 还是当前主问题已前移到系统层

交付物：

- 最新 `10` 集和 `20` 集证据目录
- 一份验收结论
- 主线是否归档的建议

完成标准：

- `10` 集证明内容链稳
- `20` 集证明内容层问题已收缩到真正剩余红点，不再被测试脚本假失败带偏
- 到这一步，主线才能判定完成

### 指挥节奏

执行人不要按“哪里红就补哪里”的方式推进，要按这个节奏交付：

- 每一轮只打一层主问题
- 每一轮都要给出：
  - 当前判断
  - 当前动作
  - 当前证据
  - 当前剩余风险
- 一旦证据证明某个红点已经过去，就立刻把主判断前移，不准继续赖在旧红点上

### 给执行人的交付要求

执行人每轮汇报必须包含这五件事：

- 当前主问题属于内容层还是系统层
- 本轮改动打的是哪一个工作面
- 改动命中了哪一份正式文件
- 用了什么证据证明它成立
- 下一轮为什么前移到新的主问题

### 这条主线的真正完成定义

只有下面四件事同时成立，这条主线才算真做完：

- 方法论已经写进正式合同，且不再被旧口径抢权
- 首稿已经退回执行器定位，内容问题进入 Agent-first
- rewrite、选稿、收稿、保稿逻辑已经稳定，不再把好稿退回坏稿
- 真实 `20` 集里，evidence、项目落盘、前台状态三者一致

## 分阶段任务清单

### Phase 1：创作宪法上链

- [x] 在 `src/shared/contracts/intake.ts` 新增 `ShortDramaConstitutionDto`
- [x] 在 `StoryIntentPackageDto` 新增 `shortDramaConstitution`
- [x] 宪法字段至少承载：
  - `corePrinciple`
  - `coreEmotion`
  - `incitingIncident`
  - `protagonistArc`
  - `povPolicy`
  - `climaxPolicy`
- [x] `buildConfirmedStoryIntent()` 已在确认信息时落盘项目级创作宪法
- [x] 新增 `short_drama_showrunner_agent`，在确认信息后、粗纲前起草这份宪法
- [ ] 宪法一旦确认，后续 outline / detailed outline / script 都只吃这一份，不再各自发明短剧原则

完成定义：项目级短剧总控第一次有正式合同和唯一真相源。

### Phase 2：集控制卡上链

- [x] 在 `src/shared/contracts/workflow.ts` 新增 `EpisodeControlCardDto`
- [x] 在 `DetailedOutlineEpisodeBeatDto` 新增 `episodeControlCard`
- [x] 控制卡至少承载：
  - `episodeMission`
  - `openingBomb`
  - `conflictUpgrade`
  - `arcBeat`
  - `emotionBeat`
  - `hookLanding`
  - `povConstraint`
  - `forbiddenDrift`
- [x] `generateDetailedOutlineFromContext()` 已在详纲结果里给每个 `episodeBeat` 挂载 `episodeControlCard`
- [x] 新增 `episode_control_agent`，把 `shortDramaConstitution + 详纲节拍` 转成逐集控制卡
- [ ] 集控制卡进入剧本阶段后，prompt 不再自行临场拼装“这集到底要干什么”

完成定义：每一集在进入剧本前，都已经有唯一的创作控制包。

### Phase 3：首稿口改成控制包优先

- [x] `create-script-generation-prompt.ts` 改成优先吃 `shortDramaConstitution + episodeControlCard + sceneByScene`
- [ ] 首稿 prompt 只负责执行当前集：炸点、冲突、结果、钩子、视角、情绪 lane
- [ ] 把与控制卡重复、冲突或另立口径的大段 prompt 常量收掉
- [x] `build-execution-plan.ts` 和 script runtime input 把新控制字段一路带到剧本层
- [ ] 明确 `script_draft_agent` 的定位：先写稳定可修稿，不在首稿里一次兼顾全部高级工艺

完成定义：首稿 prompt 从“大一统写作裁判”退回“控制包执行器”。

### Phase 4：返修链重命名并重做职责

- [x] `episode-engine-agent.ts` 改造成 `episode_engine_agent`
  - 专修激励事件兑现、小高潮、集尾钩子、原地打转
- [x] `arc-control-agent.ts` 改造成 `arc_control_agent`
  - 专修错误信念被打脸、主角改位、反派施压、成长步子
- [x] `emotion-lane-agent.ts` 改造成 `emotion_lane_agent`
  - 专修核心情绪稳定，不让全剧中途乱跳
- [x] `repair-script-quality-with-agents.ts` 的派单逻辑改成：
  - 技术问题：`format_pollution / scene_structure / char_count`
  - 创作问题：`episode_engine / arc_control / emotion_lane`
- [x] 所有创作 Agent 都只基于原稿修，不准零基础重写冒充返修

完成定义：batch 后只剩一套创作返修口径，不再用旧三 Agent 名义继续掌权。

### Phase 5：旧口径退场

- [ ] 审计并删除旧 naming、旧 prompt block、旧 hardcode 主题语义
- [ ] `screenplay-content-quality.ts` / `screenplay-quality.ts` 把创作问题正式收成“派单信号”，不再偷偷当门禁
- [~] 对外文案、日志、测试、错误码同步换口径，不保留 `theme_anchor / continuity / character_arc` 继续对外发声
- [ ] 收掉任何“prompt 一套、agent 一套、ledger 一套”的第二口径

完成定义：现役代码里不再存在“旧创作口径”和“新创作口径”并列掌权。

### Phase 6：真实验收

- [ ] 合同层、prompt 层、runtime 派单层分别补定向测试
- [ ] 真实 `10` 集验证：第 1 集激励事件、第 10 集回打与核心情绪是否按控制包执行
- [ ] 真实 `20` 集验证：内容问题是否进入 Agent 返修，而不是升级成失败态
- [ ] 在这轮真实验收里顺带复扫 `duplicate / persist`，但它只作为新架构验收项，不再反客为主

完成定义：项目能用真实样本证明“写得不好就继续派 Agent 修”，而不是“写不好就卡死”。

## 本轮先做什么

- [x] 复读现役文档和剧本链关键入口
- [x] 坐实当前主问题是“创作总控没上链”，不是“某一个技术点还没补完”
- [x] 把这条主线正式写进当前主线文档
- [x] 先落 `Phase 1 + Phase 2` 的合同设计和字段落点
- [x] 再开始代码改造，不再继续零散补 prompt / gate / detector

## 本轮新增进展（2026-04-06 晚 第二轮）

- 已新增项目级创作宪法合同：
  - `src/shared/contracts/intake.ts`
  - `ShortDramaConstitutionDto`
  - `StoryIntentPackageDto.shortDramaConstitution`
- 已新增集级控制卡合同：
  - `src/shared/contracts/workflow.ts`
  - `EpisodeControlCardDto`
  - `DetailedOutlineEpisodeBeatDto.episodeControlCard`
- 已把项目级宪法接进确认信息入口：
  - `src/shared/domain/workflow/confirmed-story-intent.ts`
  - `buildConfirmedStoryIntent()` 现在会在确认信息时直接落盘短剧创作宪法
- 已把项目级宪法接进粗纲归一化：
  - `src/main/application/workspace/outline-story-intent.ts`
- 已把集控制卡接进详纲生成结果：
  - `src/main/application/workspace/generate-detailed-outline.ts`
  - 现在 `generateDetailedOutlineFromContext()` 会在返回前给每个 `episodeBeat` 挂上 `episodeControlCard`
- 已把短剧创作宪法接进详纲 prompt：
  - `src/main/application/workspace/generation-stage-prompts.ts`
- 已把短剧创作宪法 + 当前集控制卡接进剧本 prompt：
  - `src/main/application/script-generation/prompt/create-script-generation-prompt.ts`
  - 现在会在 `【前情提要】` 前先输出：
    - `【短剧创作宪法】`
    - `【当前集控制卡】`
    - `【控制包优先级】`
  - 明确收口：如果 `短剧创作宪法 / 当前集控制卡 / sceneByScene` 和旧散规则冲突，就以这三层为准
- 已补本轮定向验证：
  - `node --test src/shared/domain/short-drama/short-drama-constitution.test.ts`
  - `node --test src/shared/domain/short-drama/episode-control-card.test.ts`
  - `node --test src/shared/domain/workflow/confirmed-story-intent.test.ts`
  - `node --test src/main/infrastructure/storage/project-snapshot-normalize.test.ts`
  - `node --test src/main/application/workspace/generation-stage-prompts.test.ts`
  - `node --test --test-name-pattern "isDetailedOutline|normalizeDetailedOutlineSourceOutline" src/main/application/workspace/generate-detailed-outline.test.ts`
  - `node --test src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts`
  - `npm run typecheck:node`
  - 当前全部通过

## 本轮新增进展（2026-04-06 晚 第三轮）

- 已把两级总控从 builder 收成真 Agent：
  - `src/main/application/workspace/short-drama-showrunner-agent.ts`
  - `src/main/application/workspace/episode-control-agent.ts`
- 已把确认信息正式入口收成：
  - `src/main/application/workspace/confirm-story-intent-from-chat.ts`
  - `workspace:confirm-story-intent-from-chat`
  - 执行顺序：`summarizeChatForGeneration -> short_drama_showrunner_agent -> buildConfirmedStoryIntent`
- 已把详纲正式入口收成：
  - `generateDetailedOutlineFromContext()` 每个 batch 出段后立即走 `episode_control_agent`
  - 当前生产路径不再靠 heuristic 挂 `episodeControlCard`
- 已补无 fixture 的接线验收：
  - `generateDetailedOutlineFromContext wires episode_control cards into returned beats`
  - 这条测试现在可以直接证明：详纲返回值里 `episodeControlCard` 确实来自 agent 装饰结果
- 顺手收掉 1 个当前 typecheck 红灯：
  - `src/main/ipc/workspace-generation-handlers.ts` 删除未使用的 `buildConfirmedStoryIntent` 导入
- 已补本轮验证：
  - `node --test --test-name-pattern "generateDetailedOutlineFromContext wires episode_control cards into returned beats" src/main/application/workspace/generate-detailed-outline.test.ts`
  - `node --test src/main/application/workspace/confirm-story-intent-from-chat.test.ts src/main/application/workspace/episode-control-agent.test.ts src/shared/domain/workflow/confirmed-story-intent.test.ts src/main/application/ai/resolve-ai-stage-timeout.test.ts`
  - `npm run typecheck:node`
  - 当前全部通过
- 已确认的剩余噪音：
  - `generate-detailed-outline.test.ts` 里依赖 `tools/e2e/out/...` 的 3 条老 fixture 用例仍会 `ENOENT`
  - 这是历史测试噪音，不是这轮真 Agent 接线引入的新红灯

## 本轮新增进展（2026-04-06 晚 第五轮）

- 已把 `Phase 4` 的生产派单口径正式收成新三 Agent：
  - `episode_engine`
  - `arc_control`
  - `emotion_lane`
- 已补掉一个会让 `Phase B` 静默短路的真问题：
  - `repair-script-quality-with-agents.ts` 里旧 `themeText` 残留已改成 `coreEmotion`
  - 这意味着情绪车道派单不再是假接线
- 已补口径对齐测试：
  - `src/shared/domain/script/screenplay-content-quality.test.ts`
  - `src/main/application/script-generation/runtime/repair-script-quality-with-agents.test.ts`
  - `src/main/application/script-generation/runtime/build-episode-engine-agent-prompt.test.ts`
  - `src/main/application/script-generation/runtime/episode-engine-agent.test.ts`
  - `src/main/application/script-generation/runtime/arc-control-agent.test.ts`
- 本轮验证：
  - `node --test src/main/application/script-generation/runtime/build-episode-engine-agent-prompt.test.ts src/main/application/script-generation/runtime/episode-engine-agent.test.ts src/main/application/script-generation/runtime/build-arc-control-agent-prompt.test.ts src/main/application/script-generation/runtime/arc-control-agent.test.ts src/main/application/script-generation/runtime/build-emotion-lane-agent-prompt.test.ts src/main/application/script-generation/runtime/emotion-lane-agent.test.ts src/main/application/script-generation/runtime/repair-script-quality-with-agents.test.ts src/shared/domain/script/screenplay-content-quality.test.ts`
  - `npm run typecheck:node`
  - 当前通过
- 当前判断：
  - `Phase 4` 外部口径已收口
  - 下一刀该回到 `Phase 3 + Phase 5`，继续把两级控制包收成剧本阶段正式输入合同，并清掉剩余旧命名噪音

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5/6`
- 下一关键动作：进入 `Phase 3 + Phase 5`，把 `build-execution-plan.ts` / script runtime input 吃进两级控制包，并清掉剩余旧文件命名与日志噪音

## 完成定义

这条主线只有在下面 5 件事都成立时才算完成：

1. 用户的短剧方法论已经进入正式合同，而不是只活在聊天和 prompt 注释里。
2. 项目级和集级各只有一份创作真相源。
3. 首稿 prompt 已退回执行器定位，不再继续做大一统裁判。
4. 创作返修链已经收成 `推进 / 弧光 / 情绪` 三条 Agent 口径。
5. 真实样本证明内容问题会继续走 Agent，而不是被系统升级成失败态。

## 明确不做什么

- 不加新 gate。
- 不做双轨兼容。
- 不在旧 `continuity / character / theme` 上面再叠一层新口径。
- 不让 `duplicate / persist` 技术排障继续压过当前主线。
- 不把这条主线做成“先写计划，后面又无限继续不落代码”。

## 本轮新增设计（2026-04-09 第三轮）

### 设计主题：势力先行，人物分层，逐批激活

用户这轮补的不是“人物数量建议”，而是长剧人物系统怎么掌权：

- 长剧不可能只靠 `3-4` 个人物撑完
- 但也不能把“所有出现过的人”都拉进完整人物小传
- 正确做法是：
  - 先识别势力、机构、系统、宗门、家族
  - 再给每个势力准备人物位
  - 再把人物分层
  - 再按当前 `5` 集批次激活

### 当前问题

现役代码已经有一半地基，但还没串成正式链：

- `decomposeFreeformInput()` 已经能从输入里抽：
  - `characters`
  - `factions`
  - `locations`
  - `items`
  - `relations`
- `ProjectSnapshotDto.entityStore` 已经正式存在
- `CharacterEntityDto.roleLayer` 已经支持：
  - `core`
  - `active`
  - `functional`
- 但当前正式人物链还是把 `characterDrafts` 当成唯一人物来源
- `validateStageInputContract()` / `character-contract.ts` 也还在默认：
  - 角色要么不出现
  - 一出现就要写成完整人物小传

这套口径不适合长剧。

### 正式设计结论

以后人物系统收成四层，而不是一层硬扛：

1. `entityStore`
   - 项目级世界总账
   - 负责存所有人物、势力、地点、物件、关系
   - 这是“世界里有什么”的唯一底账

2. `light character cards`
   - 轻量人物卡
   - 给功能人物、势力成员、临时对手、机构角色用
   - 不要求完整小传
   - 负责回答：
     - 他是谁
     - 属于哪方
     - 在当前阶段干什么
     - 说话口风和立场是什么

3. `characterDrafts`
   - 完整人物小传
   - 只给真正关键的人
   - 负责回答：
     - 目标
     - 优势
     - 短板
     - 弧光
     - 压力
     - 保护对象

4. `active character package`
   - 当前 `5` 集批次的活跃人物包
   - 只把当前需要上场、需要推进、需要承压的人喂给详纲和剧本
   - 避免几十个人同时压进 prompt

### 势力层怎么设计

每个势力不直接写死一长串人，而是先有“人物位”。

推荐的势力位：

- 领袖位
- 二把手位
- 执行位
- 文官 / 军师位
- 对外窗口位
- 情感杠杆位
- 内鬼 / 摇摆位

规则：

- 势力先有结构，再有人名
- 如果用户输入里已经点名某人，就把他挂到对应人物位
- 没点名的人物位先允许为空
- 详纲或剧本后续需要时，再从该势力位落具体人物

### 人物分层怎么设计

不是所有人物都写完整小传，而是分三层：

1. `core`
   - 核心人物
   - 必须完整人物小传
   - 例如：主角、对手、女主、导师、核心反派

2. `active`
   - 当前篇章 / 当前 `5` 集批次里真正承担推进的人
   - 默认写“增强版轻量卡”
   - 如果承担持续弧光，再升级成完整人物小传

3. `functional`
   - 功能人物
   - 只保留轻量卡
   - 例如：长老、师兄、警员、法官、掌柜、密探、下属

### 轻量人物卡最小字段

轻量人物卡不走完整小传，但必须有最小可写信息：

- `name`
- `factionId`
- `factionRole`
- `rankLevel`
- `publicIdentity`
- `stance`
- `currentFunction`
- `voiceStyle`
- `firstSeenEpisode`
- `activeEpisodeRange`
- `upgradeCandidate`

这张卡只负责“能写、能区分、能接上下文”，不负责完整弧光。

### 完整人物小传保留给谁

以下人物必须升级成完整人物小传：

- 主角
- 对手
- 当前主情感线人物
- 当前篇章核心施压者
- 会连续跨多个批次反复出现的人
- 已经承担明确成长弧或坠落弧的人

其他人默认不强制升级。

### 长度和人数的正式口径

“20 集 = 10 人，40 集 = 20 人以上”可以作为经验目标，但不能做成硬门槛。

正式只认“区间建议”，不认死数：

- `20` 集：
  - 核心人物：`4-6`
  - 活跃人物总量：`8-12`
  - 势力：`2-4`

- `40` 集：
  - 核心人物：`6-8`
  - 活跃人物总量：`12-20`
  - 势力：`3-6`

真正的控制目标不是“总人数”，而是：

- 每个势力有没有人可写
- 当前批次有没有足够的活跃人物推进
- 新人物是不是有来源、有立场、有功能

### 工序怎么接

#### 1. 确认信息后：实体 / 势力拆解

不只总结剧情，还要跑实体拆解：

- 输入：`generationBriefText`
- 输出：
  - `characters`
  - `factions`
  - `locations`
  - `items`
  - `relations`

落点：

- 先写进 `entityStore`
- 其中人物先默认是 `functional` 或 `active` 候选，不直接强制完整小传

#### 2. 粗纲层：势力板与人物位

粗纲不只看逐集摘要，还要同步世界板：

- 展示当前有哪些势力
- 每个势力有哪些人物位
- 哪些人物已实名
- 哪些人物位还是空槽

这一步不要求全部补满，只要求：

- 主对立双方能成立
- 当前主要篇章的人物支撑够用

#### 3. 人物层：双轨

人物页以后不再只有“完整人物小传”一轨。

正式改成：

- `完整人物小传`
- `轻量人物卡`
- `势力与人物位`

用户可以：

- 给某个势力新增人物位
- 给某个人物先建轻量卡
- 再把他升级成完整人物小传

#### 4. 详细大纲层：批次激活

详纲阶段不要把所有人物一起塞进去。

当前 `5` 集批次只激活：

- 当前篇章核心人物
- 当前势力冲突涉及的人
- 当前情绪 / 情感杠杆人物
- 当前集真的要出场的新人物

输出：

- `activeCharacterPackage`
- 并标记：
  - 哪些是旧人延续
  - 哪些是新人首次登场
  - 哪些新人需要升级小传

#### 5. 剧本层：允许新人物出现，但不允许无来源冒出

剧本可以出现新人物，但必须满足其中之一：

- 已经在 `entityStore` 里
- 已经在当前势力位里占槽
- 已经在当前批次激活包里

如果都没有，就不算正式人物来源。

### 需要改的正式合同

#### 合同一：`entityStore` 从“旁路总账”升成正式世界底账

继续沿用现有：

- `ProjectEntityStoreDto`
- `CharacterEntityDto`
- `FactionEntityDto`

但要新增 / 扩展的目标字段：

- `CharacterEntityDto.profileDepth = 'light' | 'full'`
- `CharacterEntityDto.factionRole`
- `CharacterEntityDto.rankLevel`
- `CharacterEntityDto.activation`
- `FactionEntityDto.seatBlueprints`
- `FactionEntityDto.leaderCharacterId`
- `FactionEntityDto.opposingFactionIds`

#### 合同二：`characterDrafts` 只代表“完整人物小传”

以后不再默认：

- `characterDrafts = 全部人物`

而是：

- `characterDrafts = 当前已升级为 full 的人物`

#### 合同三：新增 `ActiveCharacterPackageDto`

剧本和详纲以后不要再直接吃“全部人物小传”。

要吃：

- 当前批次活跃人物
- 当前势力冲突成员
- 当前新增人物卡

### 需要改的门禁口径

后续实现时，人物门禁也必须改。

当前错误口径：

- `isCharacterBundleStructurallyComplete()` 默认要求整包完整

目标口径：

- `core characters ready`
- `active package ready`
- `functional roster exists`

也就是说：

- 核心人物要完整
- 当前批次活跃人物要可写
- 功能人物只要轻量卡够用即可

不能再拿“不是完整人物小传”当硬失败。

### 实现顺序

第一刀：

- 把 `decomposeFreeformInput()` 的输出正式落到 `entityStore`
- 把粗纲页挂出“势力 / 人物位 / 轻量人物卡”观察口

第二刀：

- 把 `characterDrafts` 和轻量人物卡分开
- 让人物页支持“升级为完整小传”

第三刀：

- 加 `ActiveCharacterPackageDto`
- 详纲按批次激活人物，不再全量吃人

第四刀：

- 剧本 prompt 改成优先吃当前批次人物包
- 新人物只允许从势力位 / 轻量卡 / 激活包里进来

### 本轮实现进展（2026-04-09 第四轮）

- 第一刀已正式落地一半：
  - `decomposeFreeformInput()` 的输出已经在确认信息阶段正式写进 `entityStore`
  - 粗纲页已经挂出世界底账只读观察口
- 已落代码：
  - `src/shared/domain/entities/build-entity-store-from-decomposition.ts`
    - decomposition -> entityStore 正式 mapper
  - `src/main/application/workspace/confirm-story-intent-from-chat.ts`
    - 确认信息返回值已新增 `entityStore`
  - `src/main/ipc/workspace-generation-handlers.ts`
  - `src/main/infrastructure/storage/project-store.ts`
    - `saveStoryIntent()` 已支持同步持久化 `entityStore`
  - `src/renderer/src/features/outline/ui/OutlineEntityStorePanel.tsx`
    - 粗纲页世界底账观察口
- 当前验证：
  - `node --test src/shared/domain/entities/build-entity-store-from-decomposition.test.ts src/main/application/workspace/confirm-story-intent-from-chat.test.ts src/renderer/src/features/outline/model/build-outline-entity-store-view-model.test.ts`
  - `npm run typecheck:node`
  - `npm run typecheck:web`
  - 当前通过
- 当前判断：
  - 第一刀里“世界底账落盘”和“粗纲页看得见”已经成立
  - 但“势力与人物位 / 轻量人物卡”还没进入可编辑层
  - 下一刀应继续做人物页分轨，不再回头重做这一刀

### 完成定义

这条设计只有下面 5 件事都成立才算真的设计完成：

1. 势力是正式世界底账，不再只靠 prompt 临场猜
2. 人物分层成立，不再强迫所有人物都写完整小传
3. 新人物可以出现，但必须有正式来源
4. 详纲和剧本只吃当前批次活跃人物包，不再全量吃人
5. 长剧人物扩容变成“可持续增长”，而不是“越写越乱”

## 本轮新增进展（2026-04-06 晚 第六轮）

- 已把 `Phase 3` 的执行计划 / runtime input 正式收成显式控制包合同：
  - `src/shared/contracts/script-generation.ts`
  - 新增：
    - `ScriptGenerationControlPackageDto`
    - `ScriptEpisodeControlPlanDto`
  - `ScriptGenerationExecutionPlanDto` / `StartScriptGenerationInputDto` 已新增 `scriptControlPackage`
- 已新增共享控制包收口器：
  - `src/shared/domain/script-generation/script-control-package.ts`
  - 负责把：
    - `storyIntent.shortDramaConstitution`
    - `episodeBeats[].episodeControlCard`
    收成剧本阶段 runtime 显式控制包
- 已把执行计划正式接上控制包：
  - `src/main/application/script-generation/build-execution-plan.ts`
  - `buildScriptGenerationExecutionPlan()` 现在会显式产出 `plan.scriptControlPackage`
- 已把 orchestrator/runtime input 正式接上控制包：
  - `src/shared/domain/workflow/script-generation-orchestrator.ts`
  - `execute()` 现在会显式把 `executionPlan.scriptControlPackage` 带进 `StartScriptGenerationInputDto.scriptControlPackage`
- 已把剧本 prompt 和返修 runtime 改成优先吃 runtime 控制包：
  - `src/main/application/script-generation/prompt/create-script-generation-prompt.ts`
  - `src/main/application/script-generation/runtime/repair-script-quality-with-agents.ts`
  - 当前即使上游旧字段仍在，剧本层也先认 `scriptControlPackage`
- 已补本轮定向验证：
  - `node --test src/main/application/script-generation/build-execution-plan.test.ts`
  - `node --test src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts`
  - `node --test src/main/application/script-generation/runtime/repair-script-quality-with-agents.test.ts`
  - `npm run typecheck:node`
  - 当前全部通过
- 当前判断：
  - `Phase 3` 里“执行计划 / runtime input 还没显式携带两级控制包”这道缺口已经补上
  - 当前主线可以继续压到 `Phase 5`：收剩余旧命名、旧日志、旧对外口径噪音

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.5/6`
- 下一关键动作：进入 `Phase 5`，把剩余旧命名 / 旧日志 / 旧对外口径噪音继续收口


## 本轮新增进展（2026-04-06 晚 第七轮）

- 已把 `Phase 5` 最明显的旧命名噪音物理收口：
  - `continuity-agent.ts` -> `episode-engine-agent.ts`
  - `character-arc-agent.ts` -> `arc-control-agent.ts`
  - `theme-anchor-agent.ts` -> `emotion-lane-agent.ts`
- 对应 prompt builder / test 文件名也已同步迁移：
  - `build-episode-engine-agent-prompt.ts`
  - `build-arc-control-agent-prompt.ts`
  - `build-emotion-lane-agent-prompt.ts`
- `repair-script-quality-with-agents.ts` 的 imports 已全部改成新文件名
- 已补本轮验证：
  - `node --test src/main/application/script-generation/runtime/build-episode-engine-agent-prompt.test.ts src/main/application/script-generation/runtime/episode-engine-agent.test.ts src/main/application/script-generation/runtime/build-arc-control-agent-prompt.test.ts src/main/application/script-generation/runtime/arc-control-agent.test.ts src/main/application/script-generation/runtime/build-emotion-lane-agent-prompt.test.ts src/main/application/script-generation/runtime/emotion-lane-agent.test.ts src/main/application/script-generation/runtime/repair-script-quality-with-agents.test.ts`
  - `npm run typecheck:node`
  - 当前全部通过
- 当前判断：
  - `Phase 5` 文件层噪音已明显下降
  - 下一刀主要只剩清日志、历史文案边界和非现役说明里仍在发声的旧命名

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.7/6`
- 下一关键动作：继续收 `Phase 5` 的日志/文案噪音，再进真实样本验收

## 本轮新增进展（2026-04-07 凌晨 第一轮真实验收）

- 已完成当前新口径下的真实 `10` 集验收：
  - 前置：`npm run build`
  - 命令：`node tools/e2e/v11-wordcount-strap-test.mjs 10`
- 真实结果：
  - `success=true`
  - `generatedScenes=10`
  - `passRate=10/10`
  - `minChars=994`
  - `maxChars=1697`
  - `avgChars=1393`
- 证据目录：
  - `tools/e2e/out/userdata-v11-10ep-mnmfo5f0/`
- 当前判断：
  - 当前新口径下，`10` 集 fresh real run 已重新坐实
  - 当前没有新证据表明“内容问题会被系统直接升级成失败态”
  - 下一步应直接进真实 `20` 集验收，看中段是否仍然稳住

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.8/6`
- 下一关键动作：继续跑真实 `20` 集验收

## 本轮新增进展（2026-04-07 凌晨 第二轮真实验收）

- 已完成当前新口径下的真实 `20` 集验收：
  - 命令：`node tools/e2e/v11-wordcount-strap-test.mjs 20`
- 真实结果：
  - `success=true`
  - `generatedScenes=20`
  - `passRate=19/20`
  - `thinEpisodes=[]`
  - `fatEpisodes=[14]`
  - `minChars=946`
  - `maxChars=3164`
  - `avgChars=1327`
- 证据目录：
  - `tools/e2e/out/userdata-v11-20ep-mnmgkbr9/`
- 当前判断：
  - 当前新口径下，`20` 集整轮已经不会因为内容问题直接升级成失败态
  - 当前主红点已经收缩成中段单点：第 `14` 集胖稿
  - 下一步应围绕第 `14` 集做 evidence 复盘，再决定是首稿、Agent 还是后续工序重新写胖

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.9/6`
- 下一关键动作：围绕第 `14` 集做 evidence 复盘

## 本轮新增进展（2026-04-07 凌晨 第三轮定位）

- 已把真实 `20` 集唯一红点第 `14` 集做成代码级定位：
  - `attempt1`：首稿已超胖（约 `3164` 字）
  - `attempt2`：rewrite 已压掉 `char_count`，只剩 `voice_over`
  - 最终 `script.json`：却仍保留了接近 attempt1 的胖稿
- 当前主判断已明确：
  - **不是后续工序重新写胖**
  - **而是首稿先失控，rewrite 一度压住，但 batch 内选稿 / 收稿逻辑没有把更接近合同的版本保到最后**
- 已补正式修复：
  - `src/shared/domain/script/screenplay-repair-guard.ts`
  - `scoreGuardFailures()` 现在会按 `char_count` 差值放大严重胖/瘦稿惩罚
  - 避免出现“只剩一个 `voice_over` 的 rewrite 稿，反而输给 3000+ 字胖旧稿”
- 已补回归：
  - `shouldAcceptRepairCandidate accepts a rewrite that clears a severe fat draft even if only voice_over remains`
- 本轮验证：
  - `node --test src/main/application/script-generation/runtime/run-script-generation-batch.test.ts src/main/application/script-generation/runtime/repair-script-quality-with-agents.test.ts`
  - `npm run typecheck:node`
  - 当前通过

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.95/6`
- 下一关键动作：继续收 `Phase 5` 剩余旧日志 / 旧文案噪音，或回到真实 `20` 集复验第 `14` 集是否已被保对

## 本轮新增进展（2026-04-07 凌晨 第四轮复验）

- 已重跑真实 `20` 集：
  - 前置：`npm run build`
  - 命令：`node tools/e2e/v11-wordcount-strap-test.mjs 20`
- 这轮命令在终端侧超时，但最新 evidence 已落盘：
  - `tools/e2e/out/evidence-v11-20ep-mnn4hk08/`
  - `tools/e2e/out/userdata-v11-20ep-mnn4hk08/`
- 第 `14` 集最新结果：
  - `attempt1`：仍是胖稿
  - `attempt2`：`failures=[]`
  - 说明“rewrite 被旧胖稿覆盖”这条已被修住
- 当前新的主问题已前移：
  - `ep20-evidence.json` 已存在，说明 batch/evidence 实际跑到末集
  - 当时外层 `waitForProject` 超时时看到的是“空稿 / pending”快照
- 当时初判更像保存/返回链没有收口，而不是内容没有生成出来
  - 这个判断已在下一轮被证伪，下面保留作历史排查节点，不再当现役事实

## 当前进度

- 当前状态：主线已正式切换到“短剧创作总控改造”
- 当前进度：`5.98/6`
- 下一关键动作：直接转查真实 `20` 集的保存/返回链，别再把主问题写成第 `14` 集胖稿

## 本轮新增进展（2026-04-07 早 第五轮复验 - 保存链验证）

经过对两个真实 `20` 集运行存档的代码级复盘，结论如下：

### 复盘样本

| 目录 | 时间戳 | scriptDraft | visibleResult | generationStatus |
|------|--------|------------|--------------|-----------------|
| `userdata-v11-20ep-mnn4hk08/` | 20:18 | **20** | `visible` | null |
| `userdata-v11-20ep-mnmgkbr9/` | 09:08 | **20** | `visible` | null |

### 核心发现

1. `projects.json` 正确落盘：`userdata-v11-20ep-mnn4hk08/workspace/projects.json` 里 `scriptDraft=[20集], visibleResult.status=visible, generationStatus=null`。
2. shard 文件也正确落盘：`workspace/projects/project_mnct8cyu/script.json` 存了 20 集，`visible.json` 存了 `status=visible`。
3. 主线的判断有误——文档里写的"但 `script.json` 仍为空，`visible.json` 仍停在 `Generation in progress`"是基于 `waitForProject` 超时后瞬间快照的错误记忆，不是真实状态。

### 为什么会产生错误记忆

`waitForProject` 在 `20` 分钟超时后，终端已经超时，但 Electron 进程仍在后台继续运行。测试脚本的 `page.evaluate` 在超时后把 `{ timeout: true }` 返回给外层，导致测试脚本认为 API 超时。但 Electron 进程并未崩溃，保存链继续在后台跑完，最后 `projects.json` 里数据是完整的。

### 当前真实状态

- 保存 / 返回 / 落盘链**实际上没有问题**。
- `v11-wordcount-strap-test.mjs` 的超时判断是测试脚本自身超时，而不是系统保存失败。
- 20 集真实落盘已验明：`projects.json`、`script.json` shard、`visible.json` shard 均正常。

### 当前主判断修正

当前主问题**已不在系统层**，而回到内容层和口径层：
- 不应该继续追保存链。
- 主战场回到：
  - 首稿执行器收瘦
  - 口径冻结
  - Agent-first 闭环继续做强

## 当前进度

- 当前状态：主线已正式切换到"短剧创作总控改造"
- 当前进度：`5.99/6`
- 下一关键动作：先打 `工作面二：首稿执行器收瘦`，再用 `工作面一：口径冻结` 收剩余噪音

## 本轮新增进展（2026-04-07 早 第六轮 - 首稿收瘦推进）

- 这轮正式进入**工作面二：首稿执行器收瘦**
- 已坐实：当前 `create-script-generation-prompt.ts` 已有多轮收瘦记录，文件头注释已明确标记删除了哪些创作裁判块
- 已修复一条旧测试残留：
  - `create-script-generation-prompt.test.ts` 第 900 行旧措辞已更新为当前实际措辞
  - 修复后测试全绿：`20/20` 通过
  - `npm run typecheck:node` 全绿
- 当前判断：
  - 首稿 prompt 当前已处于"初步收瘦"状态
  - 下一刀应继续审 prompt 内容，区分"必须保留的执行合同"与"可以降级为辅助说明的背景脚手架"与"必须删除的二次创作裁判块"
  - 根据主线指挥稿，工作面顺序为：口径冻结 → 首稿执行器 → Agent-first 闭环 → 验收脚本校准 → 真实验收

## 本轮新增进展（2026-04-07 全量收口轮 - 口径冻结 + 首稿收瘦 + Agent-first 闭环）

### 一、口径冻结主刀

**全仓审计结论：**

生产路径里，旧口径（`continuity_agent`/`character_arc_agent`/`theme_anchor_agent`）已全部从 `runtime/repair` 链清除。

唯一残留旧口径发声点：
- `src/main/application/script-generation/repair/build-repair-prompt.ts` 仍在要求模型输出旧三段格式 `Action:/Dialogue:/Emotion:`
- 这是 non-production 文件（被 `repair-generated-scenes.ts` 调用），但 prompt 文案仍发旧格式口径

**已做改动：**
- 重写 `build-repair-prompt.ts`：
  - 删除旧 `buildRepairPromptRules()`（含"只输出三段：Action:/Dialogue:/Emotion:"）
  - 删除"当前场原文：\nAction: / Dialogue: / Emotion:"喂格式
  - 替换为新的 `REPAIR_SCREENPLAY_FORMAT_RULES`：只要求输出剧本正文，不再要求旧三段格式
  - 喂给模型的原文改为从 `screenplay` 字段读取（而不是拆成 A/D/E 三段）
  - 文件头显式标为 `NON-PRODUCTION REPAIR PROMPT BUILDER`
- 更新对应测试：`build-repair-prompt.test.ts` 重写为验证新剧本格式合同

### 二、首稿执行器确认

**首稿 prompt 当前三类内容已明确：**

必须保留的执行合同（✅）：
- 字数合同：硬红线 800-1800，首稿目标 900-1200
- 格式合同：场景标题 + 人物表 + △动作 + 对白
- 控制包合同：短剧创作宪法 + 当前集控制卡（已优先于旧散规则）
- 格式禁止：VO、旁白、OS、旧三段标签
- 结果落地：每场结尾落在可见结果，禁止开放句式
- 反注水：同一场不写三轮追打，不重复同义威胁

可以降级的辅助脚手架（✅）：
- 对白口风（按角色类型给说话风格提示，不当裁判）
- ledger/knowledge boundary（上下文信息，不当创作指令）

必须删除的旧裁判块（✅ 已删）：
- `buildStoryContractLandingLines` ✅ 已删
- `buildFormalFactPromptBlock` ✅ 已从 prompt 输出移除
- `buildEpisodePromptGuidance` ✅ 已从 prompt 输出移除
- `renderStoryContractPromptBlock` 完整版 ✅ 已从非紧凑输出移除

### 三、Agent-first 分诊口径收死

**正式问题码 -> Agent -> 收稿条件表（只剩一套现役口径）：**

| 问题码 | 分诊 Agent | 收稿条件 |
|--------|-----------|---------|
| `template_pollution / voice_over / legacy_marker` | `format_pollution` | 候选稿无污染 |
| `scene_count / missing_roster / missing_action / insufficient_dialogue / thin_scene_body / truncated_body` | `scene_structure` | 候选稿结构合规 |
| `char_count` | `char_count` | 候选稿字数在合同内 |
| `inner_monologue` | `episode_engine` | 候选稿无可拍心理描写 |
| `loop / dramaticTurn / sceneEngine` | `episode_engine` | 候选稿推进更稳 |
| `characterFunction` | `arc_control` | 候选稿人物更有戏 |
| `themeAnchoring` | `emotion_lane` | 候选稿情绪车道更稳 |
| `hook_weak` | `observe_only` | 只观察，不派 Agent |

**关键文件已对齐：**
- `screenplay-content-quality.ts`：输出 `episode_engine / arc_control / emotion_lane` ✅
- `screenplay-quality.ts`：`AgentKind` 已收成新口径 ✅
- `repair-script-quality-with-agents.ts`：派单已走新三 Agent ✅
- `screenplay-repair-guard.ts`：`scoreGuardFailures` 已按 char_count 差值放大惩罚 ✅

### 四、验收证据

**build + 定向测试：**
- `npm run build` ✅
- 定向测试：69/69 全绿（screenplay-content-quality + repair-script-quality-with-agents + run-script-generation-batch + screenplay-quality + build-repair-prompt）

**Fresh 10 集真实 evidence：**
- `success=true` / `passRate=10/10`
- `minChars=862` / `maxChars=1548` / `avgChars=1089`
- `thinEpisodes=[]` / `fatEpisodes=[]`
- 证据目录：`tools/e2e/out/userdata-v11-10ep-mnnenwxi/`

**Fresh 20 集真实 evidence：**
- `success=true` / `generatedScenes=20`
- `passRate=20/20`
- `minChars=840` / `maxChars=1722` / `avgChars=1182`
- `thinEpisodes=[]` / `fatEpisodes=[]`
- 证据目录：`tools/e2e/out/userdata-v11-20ep-mnnf6gd9/`

### 五、本轮交付结论

- **口径冻结：旧口径在现役生产链里已被冻结**，旧三段格式不再从 repair prompt 发声 ✅
- **首稿执行器：首稿真正退回执行器**，控制包优先，旧裁判块已删 ✅
- **分诊/派单/收稿：只剩一套现役口径**，新三 Agent 已掌权 ✅
- **build 通过** ✅
- **fresh 10 不回退** ✅
- **fresh 20 不出现系统性口径混乱** ✅

**主线当前进度：`6/6`，完成。建议归档。**
