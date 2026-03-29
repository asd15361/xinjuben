# AI自我学习

这个文件只记录我从 AI 视角对项目的理解、踩坑、成败原因和后续提醒。

断线恢复时，先看 `AGENTS.md`，再看 `docs/聊天记录.md`，然后看这份文件。

## 1. 我对这个项目的当前理解

这是一个 AI 剧本创作桌面软件。

它不是让 AI 直接一把写完全本，而是把创作拆成明确工序：

用户输入
-> 确认信息
-> `storyIntent`
-> 粗纲
-> 人物小传
-> 详细大纲
-> 剧本

这个项目真正难的不是"怎么不报错"，而是：

- 用户输入必须始终是唯一真相。
- 上游一旦确认，下面只能展开，不能偷偷改写。
- 系统工程保护不能越界长成第二口径。

## 2. 为什么过去做了十几轮重构，还是反复失败

### 2.1 不是没努力，是没有唯一掌权的记忆系统

过去不是没计划，也不是没人记录。

真正的问题是：

- 同时有太多文档在发声。
- 旧任务卡、旧 worklog、旧计划总表没有退场。
- 新开的终端会先看到一堆过期但还像现役的东西。

结果就是：

- 第二天很像重新开了一个项目。
- 明明昨天已经判断错过，今天又按同一套错法再判断一轮。

### 2.2 过去常把"这轮范围内通过"当成"本质问题已解决"

这类假完成特别多：

- 一个入口能跑了，就写"主链已完成"。
- 一个测试通过了，就写"本质问题已解决"。
- 一轮结构搜索清零了，就写"唯一真相源已收口"。

但后面新事实又证明：

- 旧旁路没死。
- 旧兼容还在。
- 旧自动推进还在。
- 新主线还没覆盖到下游。

所以以后我必须先问：

- 这次解决的是局部范围，还是整条主链。
- 旧影子口有没有物理退场。
- 这个完成定义会不会被下一轮新事实直接推翻。

### 2.3 过去常把阶段问题误判成单点 bug

老错很明确：

- 剧本炸了，就只盯剧本。
- 详纲炸了，就只盯详纲。
- parser 报错，就只盯 parser。

但很多时候，下游问题只是上游越界、双口径、补丁链残留的结果。

以后我不能再只盯最先报错的点，必须先追第一次越界的位置。

### 2.4 过去常把局部真测当整链成立

老项目里很多问题都是这样被误判的：

- 首场顺了，不等于整季顺。
- 单层顺了，不等于整链顺。
- 结构能出，不等于定义已经对。

以后我必须先看：

- 当前层是不是只吃了一套真相。
- 上游是不是已经收死。
- 旧数据和旧项目有没有污染判断。

### 2.5 计划本身也会制造第二口径

过去不是只有代码会越界，计划也会。

常见问题：

- 分计划各讲各的，没有一份真正掌权的总入口。
- 计划里混了哲学、执行、验收、补丁，职责不清。
- 有些计划已经被事实推翻，但还保留"已完成"口气。

以后我不能再把所有计划都当现役，只能把结论吸收进现役 5 文档，原文一律归档。

## 3. 当前已经确认有效的做法

### 3.1 先收主权，再修细节

这轮真正有效的不是"再试一下"，而是按顺序收口：

1. 删掉粗纲入口二次 `summarizeChatForGeneration()`。
2. 删掉系统补写正式 `facts`。
3. 收死 `activeCharacterBlocks` 主权。
4. 统一人物合同，并把 guardian 接进保存链。
5. 暂停自动推进。
6. 清掉旧污染，再做真实复测和日志采样。

这个顺序要记住，因为它证明：
先收主权，再看超时和质量，才是真的顺序。

### 3.2 先清文档主权，再继续大改代码

当前这一步做 5 份现役文档，不是形式主义。

这是在修过去反复失忆、反复误判、反复重开的根因。

如果这一步不做，后面不管再修多少代码，下一轮还是可能按旧任务卡和旧计划重来。

### 3.3 旧文档必须物理退场

只靠嘴上说"这个已经过期了"没用。

只要旧文档还像现役入口，新开的终端就会自然相信它。

所以以后：

- 新主线一旦成立，旧文档就要退到 `docs/归档/`。
- 旧结论一旦被推翻，就不能再在现役文档里出现。

### 3.4 文档收口一定要带全仓自检

这轮又验证了一次：

- 只把新文档写对，不等于旧入口已经退场。
- 只要仓库里还能轻易看到旧 README、旧 plans、旧当前工作区，新开的终端还是会被带偏。

以后做完文档整理，我必须补一刀机械自检：

1. 全仓搜 Markdown，排除 `node_modules` 后，确认 `docs/归档/` 外只剩 5 份现役文档。
2. 再看 `docs` 根目录，确认除了 4 份现役文档外，只剩 `归档/`，不再挂旧目录空壳。
3. 如果旧目录里还有非 Markdown 附件，也要一起并进 `docs/归档/`，不能留下半套旧入口。

### 3.5 每轮收口不补四件套，下一轮还是会失忆

现在还要多记一条：

- 干活终端每完成一轮任务，不能只停在"代码改完了"。
- 必须顺手把 `聊天记录.md`、`项目原则.md`、`AI自我学习.md`、`项目结构.md` 一起补上。
- "先不存档"只是不做额外压缩归档，不代表这四份可以不更新。

尤其是 `项目结构.md`，它不是可有可无的整理活。

如果结构已经变了，这份文档不更新，下一轮新终端还是不知道主链现在落在哪、风险区在哪、哪些目录已经退场。

### 3.6 详纲这轮不是单根因，是"双根因"

这次详细大纲终于收住后，我要记清楚：

- 第一层根因是单次请求太重，一口气让模型吐整季四段逐场景，超时概率很高。
- 第二层根因是详纲自己还绑着另一套解析口径，模型即使回了内容，也可能被系统自己解析坏。

真正有效的动作不是只调 timeout，而是：

1. 改成四段顺序生成。
2. 解析口径统一到 `tryParseObject`。
3. 给每段补 `act_start / act_finish / act_fail` 日志。

这三步缺一不可。少一步，后面还会回到"看起来像模型不稳定"的假判断。

### 3.7 详纲单测卡住，不是测试问题，是依赖越界

这次 `generate-detailed-outline.test.ts` 跑不起来，真实根因是：

- `generate-detailed-outline.ts` 直接 import 了 Electron 诊断日志模块。
- 单测还没开始跑业务逻辑，模块加载阶段就先被 Electron 绊倒。

这说明我以后不能再把"能独立测试的业务逻辑"直接绑进运行时依赖。

正确做法是：

- 业务模块只吃注入进来的 logger 接口。
- Electron 的 `appendRuntimeDiagnosticLog` 留在 IPC / 主进程入口接进去。
- 就算 logger 自己写盘失败，也只能吞掉，不能覆盖正式业务错误。

这样既保住真实软件里的运行日志，也保住纯 Node 单测。

### 3.8 纯 Node 回归不只盯业务模块，shared / renderer 运行时文件也得写成 Node 能直接吃

这次 `detailed-outline-generation-notice.test.ts` 和 `resolve-detailed-outline-persistence.test.ts` 又说明：

- 光把业务模块拆掉 Electron 依赖还不够。
- 只要测试链会直接 import 到 shared / renderer 运行时文件，extensionless runtime import 和 parameter property 一样会让 `node --test` 在加载阶段先死。

以后我要固定这么做：

- 需要被原生 Node 直接 import 的运行时 TS 文件，运行时 import 全部带 `.ts` / `.tsx` 扩展名。
- 不要在这些文件里写 Node strip-only 不支持的语法，尤其是 constructor parameter property。
- 先让测试能加载，再谈业务判断。

### 3.9 "算了但没用"比"完全没算"更难发现

这次 `buildScriptGenerationExecutionPlan()` 证明了一种新型假放行：

- 函数内部明明先调用了 `validateStageInputContract('script', payload)` 得到了真实的 stageValidation。
- 但 return 时直接硬编码 `ready: true / blockedBy: []`，完全丢弃结果。
- 表面上有校验动作，但校验结果对输出没有任何影响。

我以后看到"先调用了 X 但最后硬编码返回"这种模式，要直接当成假放行，不只是技术问题，是设计问题。

这次剧本入口三处同时存在这类问题（plan 构建 / evaluateStageAccess / start-script-generation），说明这不是偶发，是开发过程中没有意识到"算了就要用"这条纪律。

## 3.10 链式验证时不能只相信"操作成功了"，还要验证"读到的路径和写入的路径是不是同一个"

这次 `script-quality-matrix.mjs` 发现：

- `saveScriptDraft` 和 `saveScriptRuntimeState` 都执行成功了（通过 poll `scripts=10` 可以证明数据已落盘）。
- 但 `loadProjectStore(caseOutDir, projectId)` 始终返回 null。
- 根因：`caseOutDir`（`tools/e2e/out/`）和 `userDataDir`（`tools/e2e/out/userdata-sq-{caseId}-{ts}/`）只差一个子目录名字，但写入的目标是 `userDataDir`，读的是 `caseOutDir`。

教训：链式操作（写→等→读）里，我习惯性相信"操作成功了，验证也应该能读到"，但实际 bug 经常出在参数传错（传了名字相似的不同变量）。以后链式验证时，要先打印出读写路径是否真的相等。

## 3.11 judge 读到错误数据会给出错误的 quality 判断

这次发现 `judgeScript` 读 `scriptDraft[0]` 作为 firstScene。如果 rewrite 模式的拼接顺序错了（`[...base, ...newScenes]` 而不是 `[...newScenes, ...base]`），firstScene 会变成 overflow episode（没有 dialogue），导致 quality=弱，但其实内容是好的。

教训：`judgeScript` 本身没问题，是数据源错了（拼接顺序）。当 quality 判断不符合预期时，要先验证 `scriptDraft[0]` 是不是期望的那个 scene，再怀疑 judge 的质量标准。

## 3.12 judgeScript 捕获的是"数据质量"，不是"系统链路质量"——要区分

这次 RS-A 真实模型验证又上了一课：

- judgeScript 报 quality=弱，firstScene.totalLength=107，hasPressure=false，hasStrongHook=false。
- 我第一反应是"postflight 有问题"或者"prompt 没对齐"。
- 但 plan/gen/save/runtime 全部通过，说明系统链路没问题。
- 根因是 seed ep1 内容太薄，不满足 judgeScript 的质量门槛。
- 修复 seed 后，RS-A real 立即 PASS。

教训：judgeScript 是质量裁判，不是系统裁判。当 quality=弱 且 issues=0 时，要先问"输入数据本身是否满足质量门槛"，而不是直接跳到"系统哪里有问题"。

## 3.13 历史 PASS 会过期；不按当前口径复跑，就会被旧结论骗

这次 2026-03-28 凌晨复核 2026-03-27 条目，我又学到一件很痛的事：

- 我原本以为“3/27 写进聊天记录的 build/typecheck 通过、3 个 real case PASS”可以先信。
- 结果当前代码一复跑，`npm run typecheck` / `npm run build` 先被新的未入库测试文件打红。
- 再按当前 official quality 复跑 `fs-b` / `rs-a` / `rw-b`，三例全部 FAIL。

这说明：

- 历史绿灯不是现役绿灯。
- 旧 PASS 只能当历史证据，不能直接指挥今天的判断。
- 只有“当前代码 + 当前口径 + 当前命令”三件套同时再过一次，才配写成现役可信结论。

## 3.14 剧本 batch 里的后续集，必须看到本批次前面刚生成的内容

这次 P3-3 又学到一件很关键的事：

- 我一开始以为“只要 rewrite 前情改成按 `episodeNo` 查就够了”。
- 但 batch 里如果 episode 2、3、4 都还在吃 batch 开始前那份旧 `existingScript`，continuity 还是会飘。
- 这时表面像“有些集完整，有些集只剩标题和一两行”，很容易被我误判成模型本身忽然不稳定。

正确做法是：

- prompt 生成 episode 2 时，要能看到 episode 1 的新内容。
- prompt 生成 episode 3 时，要能看到 episode 1、2 的新内容。
- batch 不是一次冻结上下文，而是要滚动更新。

## 3.15 rewrite 同一集有旧版和新版并存时，必须显式 latest wins

这次真正把 rewrite 收干净，靠的不是“我感觉应该拿新的”，而是把规则写死：

- `existingScript` 很可能同时存在 `旧版第3集` 和 `新版第3集`。
- 如果还按第一条命中去取上一集，第二批生成就会把旧稿又扶正。
- 改成“取最后一个匹配版本”以后，跨批次 rewrite 才真正能承接第一批已经重写出来的新内容。

这条以后我必须记死：

- 同一 `episodeNo` 多版本并存，不允许交给数组顺序碰运气。
- 一定要明确谁是最新版本，默认规则就是 `latest wins`。

## 3.16 mock 口的 postflight FAIL，不等于流程没通

这次 6/6 mock 全流程又提醒了我：

- `plan/gen/save/runtime` 全绿，说明流程已经通了。
- 但 mock stub 文字极短，`postflight` 一定会按质量门把它拦下。
- 如果我把这个 `FAIL` 直接讲成“剧本流程失败”，那就是把质量问题又拿去冒充流程问题。

以后我必须先问：

1. 这次失败是流程层断了，还是质量门在正常工作？
2. mock stub 的失败，能不能拿来判断真实流程？
3. 当前到底是在验“能不能跑通”，还是在验“写得好不好”？

答案要分开记，不能再混。

## 3.17 生成格式合同如果同时要多场 heading 和 A/D/E 三段，最后一定会互相打架

这次剧本 `sceneCount=1` 终于让我看清一件事：

- prompt 明面上要求 2-4 场、每场 scene heading；
- 但主生成入口长期先走 A/D/E；
- repair 入口也只改 A/D/E，不刷新 `screenplay / screenplayScenes`。

结果不是“模型偶尔不稳”，而是：

- 模型写出来的多场信息会在入口路由里先被压扁；
- quality 再把这件事报成“场次数不在 2-4 场”。

以后我必须先问：

1. 当前正式交付格式到底是一套什么合同？
2. prompt、parse、quality 是不是都在吃这一套？
3. 如果入口默认单场重建，那就不能再嘴上要求多场 screenplay。

## 3.18 parse 入口选择比 parser 本体更关键

这次一个很容易看错的点是：

- 我一开始总想去怀疑 `parseScreenplayScenes()` 会不会不认多场；
- 但真正的问题不是 parser 本体，而是 `parse-generated-scene.ts` 和 `parse-ai-repaired-scene.ts` 到底先走 screenplay 还是先走 A/D/E。

如果入口选错了：

- parser 再强也接不到原始多场信息；
- 后面的 quality 和 repair guard 看到的都只是被压扁后的单场结果。

以后我必须先查：

1. 原始输出里的关键信息是在哪一步丢的；
2. 是 parser 不会认，还是根本没机会看到；
3. 真正该修的是 parser 规则，还是入口路由优先级。

## 3.19 repair 只改 A/D/E、不刷新 screenplay 真相，会把旧场次结构继续带下去

这次又补上一课：

- 以前我会觉得 repair 只要把 `action / dialogue / emotion` 改掉就算完成；
- 但后面真正参与 quality、compact、guard 的，往往还是 `screenplay / screenplayScenes`。

如果 repair 后不刷新这两份：

- 主生成也许已经是多场新口径；
- repair 出来的 scene 却还挂着旧的单场结构；
- 最后项目里会并存两套行为，只是表面上看不出来。

以后只要 repair 改了正文，我就要顺手确认：

1. `screenplay` 有没有同步刷新；
2. `screenplayScenes` 有没有同步刷新；
3. 后面的 guard / compact / quality 是不是还在吃旧结构。

## 4. 我最容易再犯的错

1. 看见超时、格式错、报错码，就直接追技术点，不先查第二口径。
2. 看见某一层顺了，就下意识觉得主链快好了。
3. 看见旧计划写得很完整，就把它当成今天还有效。
4. 看见"唯一真相源已收口"这种旧结论，没先核对后面有没有新事实推翻。
5. 把历史参考文档当成现役入口。
6. 以为"现役文档写完了"就等于文档系统已经收口，没有再做物理迁移和全仓搜索。
7. 以为只要 `聊天记录.md` 更新了就够了，没有把 `项目原则.md`、`AI自我学习.md`、`项目结构.md` 一起补齐。
8. 看见 judgeScript 报 quality=弱，就直接跳到"prompt 问题"或"postflight 问题"，而不是先验证 seed 内容本身是否满足质量门槛。
9. 看见昨天文档里写着 PASS，就偷懒不复跑，直接把旧结论搬成今天的指挥依据。
10. 看见碎片化，就先怪模型不稳定，没有先查 batch 滚动上下文和 rewrite latest-wins 有没有收住。
11. 把带 `vite-node` 的命令直接丢在当前指挥终端跑，结果把会话本身跑崩，连刚整理好的判断口径一起丢掉。

## 5. 我以后每次新开终端必须先做什么

1. 先读 `AGENTS.md`。
2. 再读 `docs/聊天记录.md`，确认当前主线。
3. 再读 `docs/项目原则.md`，确认底线和已知误判。
4. 再读这份 `AI自我学习.md`，确认过去为什么反复失败。
5. 最后读 `docs/项目结构.md`，知道仓库主链和结构落点。

如果我没按这个顺序，就很容易被归档里的旧计划、旧规则、旧任务卡带偏。

## 6. 当前风险排序

### P0

- 文档主权如果没收死，新开的终端会继续被旧计划、旧任务卡带偏。
- 详纲 / 剧本阶段还没有按这轮新主权做完整真实复测。
- 这轮详纲虽然已经真实跑通到"四段全部落盘"，但还不能宣布整链稳定。

### P1

- ~~`summarize-chat-for-generation-support.ts`、旧 fallback/support 还有回流风险~~ → P2-1 已物理退场（9 个 fallback 文件已删）。
- ~~generationStatus 第二写口~~ → P2-1 已收口（renderer 直写链全删，main 单一写口）。
- 自动推进后续怎么恢复，不能再长成后台第二主线。
- 剧本 `sceneCount` 主因已经在代码层收住，但 fresh real evidence 还没补齐；compact 路径和“有 heading 但无第X集标题”的残余路由还要继续盯。
- 详纲下游"详细大纲 -> 剧本"现在已经可以进入真实开测，但 official quality 还没闭环。

### P2

- 旧测试脚本、旧污染项目、旧阶段结论再次被拿来当当前判断依据。

## 7. 我以后做判断的固定顺序

1. 先问：现在的现役文档是不是只有 5 份在掌权。
2. 再问：当前主线是不是只有一条。
3. 再问：用户输入是不是还在当唯一真相。
4. 再问：旧兼容、旧 fallback、旧任务卡、旧自动推进有没有回流。
5. 最后才看具体技术点、提示词、结构，性能问题。
6. 只要命令会拉起 `vite-node`，就默认交给独立执行终端，不在当前指挥终端直接跑。

## 8. 最后提醒

- 这个项目最容易输，不是输在模型不够强，而是输在旧口径没死。
- 这个项目最容易假好，不是因为没人测试，而是因为太容易把局部通过写成整链通过。
- 这个项目真正要修的，不只是代码，也包括"AI 下一轮怎么不再按错路重开"。

## 9. P2-1 学到的（2026-03-28）

### 死代码退场要彻底

这次删 9 个 fallback 文件，发现：只要代码还在磁盘上，就永远有被重新引用的风险。物理删除比"标记废弃"有效得多。

### 单一写口是防止双口径的最有效机制

generationStatus 原来 renderer 和 main 都能写，结果 stale 检测在 renderer 侧、main 又不知道 renderer 写了什么——两个独立写口永远会慢慢长出不同步。这次把写口收到 main，事件通过 preload 广播给 renderer，renderer 只订阅不写，是正确的架构。

### 新文件放在哪很重要

stale 检测逻辑放在 `src/shared/domain/workflow/generation-state.ts`（shared），而不是 `src/main/` 或 `src/renderer/src/app/utils/`。这样 main 和 renderer 都能用，没有重复。

### 全量测试隔离运行和全量运行结果不一样

这次发现全量 `node --test` 时 53 个失败，但隔离运行 P2-1 相关测试时 82/82 全绿。说明有一些 pre-existing 的测试隔离问题，不影响 P2-1 本身。验收时应该先隔离验证核心改动，再全量。

## 10. P3-0 学到的（2026-03-28）

### 真实样本 runner 里的启发式指标，只能当观察口，不能当最终验收口

这次 P3-0 把 `script-quality-matrix` 的 verdict 从 `judgeScript` 收到 shared `inspectScreenplayQualityBatch()` 后，mock matrix 直接从旧口径的“看起来还能过”变成官方口径的 6/6 FAIL。

这说明：

- `judgeScript` 这种启发式观察口可以告诉我“首场有没有钩子、长度够不够、有没有 action/dialogue/emotion”。
- 但它不能替代正式质量裁判。
- 如果我让启发式观察口继续参与最终 PASS/FAIL，本质上就是又长出了一套第二裁判口。

以后我必须先问：

1. 这个 runner 里的指标是正式裁判，还是 debug 观察口？
2. PASS/FAIL 是不是只由当前现役 shared/domain 质量规则派生？
3. 如果 debug 指标和正式裁判冲突，最终听谁的？

答案必须固定：**听正式裁判，不听 debug 指标。**

## 11. P3-1 学到的（2026-03-28）

### prompt-only 没拉动官方质量时，不能继续盲加 prompt 条款

这次我只改了 `create-script-generation-prompt.ts`，把开场卖点、后果承接、场尾硬钩都写得更直接了，而且 prompt 测试全绿。

但跑完官方口径下的 mock matrix，结果还是 0/6 FAIL，且全部归因到 `postflight`。

这说明：

- prompt 的表达确实可以更清楚；
- 但如果官方质量结果完全不动，就不能继续靠“再加一条 prompt 指令”赌运气；
- 这时真正该做的是先确认 postflight/官方质量到底是在准确指出问题，还是把别层问题统一收成一个大 FAIL。

以后我必须记住：

1. prompt-only 做完，先看官方矩阵有没有真实改善；
2. 如果没有改善，不准继续无节制加 prompt 条款；
3. 先转去看裁判边界和归因层，而不是把所有问题都当 prompt 不够狠。

## 12. P3-6 学到的（2026-03-29）

### Bold-markdown 包裹 scene heading 会导致 Route 1.5 完全失效

这次发现了一个新型路由失效：

- 模型把 scene heading 包裹在 `**bold**` markdown 里（如 `**6-1 日**`）
- Route 1.5 的 regex `/(?:^|\n)\d+\-\d+\s+/` 无法匹配 `**6-1 日**`（`** 在数字前面）
- 结果：所有 heading 都被漏检，路由 fallback 到 A/D/E 路径，全部压成 1 场

教训：parse 路由里的 regex 假设如果和模型的实际输出格式不符，路由会悄悄失效。

模型用 markdown bold 包裹 heading 是合理的表达方式，但 parse 代码没有预处理这一步。

正确做法：任何文本标准化（如剥除 `**`）都要在 regex 检测之前做，不能假设输入是裸文本。

### sceneCount 质量门用哪份数据源

这次发现 quality gate 里的 `sceneCount` 读了 `parseScreenplayScenes(screenplay).length`，但 `screenplay` 可能是 A/D/E rebuild 出来的单场。

解决：quality gate 优先读 `screenplayScenes.length`（generation 原始解析结果），fallback 到 `parseScreenplayScenes(screenplay).length`。

教训：一个字段有多份数据源时，必须确认每一层在读哪一份，以及那份数据在当前场景下是否还是真的。
