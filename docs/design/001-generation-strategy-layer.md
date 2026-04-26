---
title: "题材策略层重构"
description: "把男频/女频和垂类规则从人物/骨架引擎中解耦，防止题材串味。"
category: "design"
number: "001"
status: "draft"
services: ["server/src/application/workspace", "server/src/application/script-generation", "src/shared/domain"]
last_modified: "2026-04-26"
---

# 001 — 题材策略层重构

## Status

进行中。`GenerationStrategy` 已成为当前生产链路的题材入口之一；人物、势力、剧本骨架、详细大纲、正式剧本 Prompt、控制卡 fallback、正式剧本 postflight 已完成第一轮接入。Electron IPC 的旧人物/骨架/详纲生成入口已退役为 HTTP API 权威入口。仍需继续删除或隔离 `src/main/application/workspace` 里的旧提示词文件，避免未来误用。

## Summary

决定新增 `GenerationStrategy` 题材策略层：通用生成引擎只负责结构、合同、去重、归属和恢复；题材相关的人物位、势力类型、冲突词库、fallback 文案、禁用词和污染检测全部从策略包读取。

第一批策略包至少覆盖 `男频玄幻修仙`、`女频古言宅斗`、`女频霸总甜宠`、`男频都市逆袭`，并预留 `都市律政` 扩展位。

## Requirements

- 用户选择男频/女频和垂类后，人物小传、势力位、剧本骨架、详细大纲、正式剧本都必须使用同一个策略。
- 玄幻专属词不能留在全局 fallback：如宗门、仙盟、掌门、长老、护法、魔尊血脉、亲传大弟子。
- 非玄幻项目必须有污染检测：例如都市律政输出宗门/仙盟/魔尊血脉时直接标记为策略污染。
- 策略层不能替代 MarketPlaybook。策略层解决“题材世界怎么站住”，MarketPlaybook 解决“当月打法怎么更像热门短剧”。
- 旧链路必须渐进迁移，不能一次性拆坏人物/骨架生成。

## Current Evidence

- `src/shared/contracts/project.ts` 已有 6 个 Subgenre。
- `src/shared/domain/short-drama/short-drama-market-policy.ts` 已有 audienceLane/subgenre 规则，但主要服务市场 prompt 和质检。
- `server/src/application/workspace/faction-matrix-agent.ts` 仍有 `隐藏血脉修仙项目` 专属铁律。
- `server/src/application/workspace/enrich-character-drafts.ts` 仍有守护女主、亲传大弟子、仙盟爪牙等玄幻分支。
- `server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts` 仍有 `buildMandatoryProtagonistDraft` 的隐藏血脉修仙兜底。
- `server/src/application/script-generation/prompt/build-episode-scene-directives.ts` 仍有长老、公审、宗门、法阵、钥匙等题材词混在全局剧本指令里。

## Architecture

```text
Project.marketProfile / StoryIntent.genre
  ↓
resolveGenerationStrategy()
  ↓
GenerationStrategy
  ├─ factionBlueprints
  ├─ characterArchetypes
  ├─ fallbackRules
  ├─ promptBlocks
  ├─ forbiddenTerms
  └─ contaminationChecks
  ↓
通用生成引擎
  ├─ faction-matrix-agent
  ├─ character-profile-v2-agent
  ├─ enrich-character-drafts
  ├─ rough-outline-stage-prompts
  ├─ detailed-outline
  └─ script-generation prompts
```

## Proposed Contract

```ts
export interface GenerationStrategy {
  id: string
  audienceLane: 'male' | 'female'
  subgenre: string
  worldLexicon: {
    factionTypes: string[]
    roleTitles: string[]
    conflictObjects: string[]
    pressureMethods: string[]
  }
  characterArchetypes: Array<{
    id: string
    matchHints: string[]
    protectTargets: string[]
    pressurePatterns: string[]
    actionHandles: string[]
    forbiddenFallbackPhrases: string[]
  }>
  factionBlueprints: Array<{
    label: string
    factionType: 'sect' | 'organization' | 'clan' | 'company' | 'legal' | 'court' | 'other'
    seatLabels: string[]
    defaultMethods: string[]
  }>
  promptBlocks: {
    factionMatrix: string[]
    characterProfile: string[]
    outline: string[]
    episodeScript: string[]
  }
  forbiddenTerms: string[]
  contaminationChecks: Array<{
    id: string
    pattern: RegExp
    message: string
  }>
}
```

## Migration Plan

1. **P0.1 Contract First**
   新建 `src/shared/domain/generation-strategy/`，定义 `GenerationStrategy`、`resolveGenerationStrategy`、基础测试。先只读 `marketProfile`，没有时按 `genre` 兜底。
   - 状态：✅ 已完成。`generation-strategy.ts` 已包含六个内置垂类策略、都市律政试点、污染词检测和 resolver；`buildMarketProfilePromptSection` 已开始读取策略层。

2. **P0.2 Extract Xianxia**
   把当前玄幻男频硬编码从 `faction-matrix-agent`、`enrich-character-drafts`、`buildMandatoryProtagonistDraft` 抽进 `male_xianxia` 策略包。
   - 状态：✅ 第一轮完成。`faction-matrix-agent` 改为 `buildStrategyFactionMatrixPromptBlock`；主角兜底改为 `buildStrategyProtagonistFallback`；人物补全里的核心题材名词改为策略上下文；`build-episode-scene-directives` 对非玄幻题材走通用策略指令。

3. **P0.3 Add Female Strategies**
   增加 `female_ancient` 和 `female_ceo`，至少覆盖人物位、势力位、冲突对象和禁用玄幻污染词。
   - 状态：✅ 回归第一轮完成。女频霸总样本已锁住人物补全、主角兜底、势力 Prompt、粗纲总纲 Prompt 的非玄幻输出边界。

4. **P0.4 Add Urban Legal Pilot**
   增加 `urban_legal` 扩展策略，即使前端暂未开放，也用测试锁住：律所/法庭/证据链项目不能生成宗门/仙盟/血脉。
   - 状态：✅ 试点回归第一轮完成。都市律政样本已锁住主角兜底、粗纲分集 Prompt、正式剧本场景指令。

5. **P0.5 Wire Prompt Builders**
   让 `faction-matrix-agent`、`character-profile-v2-agent`、`rough-outline-stage-prompts`、`build-episode-scene-directives` 从策略包取 prompt block，不再各自判断题材。
   - 状态：进行中。`faction-matrix-agent`、`enrich-character-drafts`、主角 mandatory fallback、`rough-outline-stage-prompts`、`generation-stage-prompts` 详细大纲、`build-episode-scene-directives`、`create-script-generation-prompt`、`build-ledger-prompt-blocks`、控制卡 fallback 道具已完成第一轮策略接入；Electron IPC 旧生成入口已退役为 HTTP API 权威入口。

6. **P0.6 Strategy Contamination Gate**
   增加生成后检测：人物小传、势力矩阵、轻量卡、骨架文本若出现当前策略禁用词，返回 warning 或触发局部重写。
   - 状态：✅ 第一轮 warning 已接入人物/骨架 canonical bundle 和正式剧本 postflight。`generateOutlineCharacterBundleFromConfirmedSevenQuestions` 会检测人物底账与剧本骨架文本中的策略禁词，并返回 `generation_strategy_contamination` warning；`finalizeScriptPostflight` 会检测正式剧本文本中的策略禁词，并写入同名 postflight issue。

7. **P0.7 Regression Matrix**
   每个策略至少一条真实样本回归：
   - 男频玄幻修仙：允许宗门/仙盟/血脉。
   - 女频古言宅斗：允许侯府/嫡庶/主母/婚约，不允许仙盟/魔尊血脉。
   - 女频霸总甜宠：允许集团/总裁/契约/家族压力，不允许宗门/长老。
   - 男频都市逆袭：允许公司/家族/黑卡/身份揭晓，不允许法阵/仙盟。
   - 都市律政：允许律所/法官/委托人/证据链，不允许宗门/仙盟/血脉。

## Boundaries

- 不改用户已有项目数据结构；新增策略解析必须兼容旧项目缺失 `marketProfile` 的情况。
- 不把 MarketPlaybook 合并进策略层；两者独立。
- 不在 renderer 写策略逻辑；renderer 只传 `marketProfile` 和展示 warning。
- 不允许新增题材规则直接写进 prompt 字符串里；必须先进入 strategy，再由 prompt builder 渲染。
- 不允许为了兼容旧逻辑保留“全局玄幻兜底”；所有玄幻兜底必须迁入 `male_xianxia`。

## Trade-offs

- **直接继续补 prompt**：快，但每个新题材都会继续串味，已被真实输出证明不可控。
- **一次性重写全部生成链**：理论干净，但风险大，容易把刚修好的 JSON 恢复、合同校验和归属去重打坏。
- **策略层渐进迁移**：改动可控，能保留现有工程验证，同时逐步清掉硬编码。选择此方案。

## Assumptions

- 第一阶段仍以当前 6 个内置垂类为主，都市律政作为架构试点策略先进入测试，不一定立刻开放 UI。
- 生成主链继续由 server 承担，`src/shared` 只放合同、策略资产和纯函数。
- 题材策略的目标是防串味和给生成提供世界词库，不负责当月热门打法。

## Verification

- 所有策略 resolver 必须有纯函数测试。
- 每迁一个 prompt/fallback 入口，必须有“非本题材禁用词不出现”的回归。
- 每个策略至少有一条端到端人物/势力样本测试。

## References

- `src/shared/domain/short-drama/short-drama-market-policy.ts`
- `server/src/application/workspace/faction-matrix-agent.ts`
- `server/src/application/workspace/character-profile-v2-agent.ts`
- `server/src/application/workspace/enrich-character-drafts.ts`
- `server/src/application/script-generation/prompt/build-episode-scene-directives.ts`
