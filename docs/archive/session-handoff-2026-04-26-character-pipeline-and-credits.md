# 2026-04-26 阶段存档：人物链路、积分、充值弹窗

## 当前状态

- 人物小传/剧本骨架生成已走 server HTTP 链路，`src/main` 旧人物/骨架/详纲生成链和 `server/src/shared` 本地副本已物理退场。
- P0 题材策略层已落地第一轮：`GenerationStrategy` 负责题材词库、禁词检测、污染清洗，玄幻规则不再作为全局默认规则。
- 人物链路已做六轮真实样本收口，当前工程侧已修：
  - 坏 JSON 不再直接 500，失败后可按势力占位 fallback。
  - 泛称 `主角/男主/反派` 不再触发整链重跑。
  - 守护女主、亲传大弟子、爪牙执行者、野心大长老有独立补全分支。
  - 用户可见 biography 会拒绝 `身份是/性格底色/在戏里/让X信奉/在主线里的作用/行动抓手`。
  - 弧线会清洗 `起点：起点是`、`终局变化：终局变化`、`代价选择 → 终局`。
  - 明显男性名会防止被情感兜底写成 `她/师妹/少女`。
- 测试账号 `12345@qq.com` 已补 1000 积分，当前钱包余额 `1001`。
- 充值弹窗已改为 portal 到 `document.body`，使用 `z-[99999]` 和 body 滚动锁，避免被人物页大弹层压住。
- 追加修复：2026-04-26 晚间真实生成在 99% 停留约 900 秒后失败。日志显示不是 UI 卡死，而是人物/骨架已生成完成后，合同校验触发三次整链重跑，最终报 `character_contract_incomplete_after_retries:protagonist=1:antagonist=0:incomplete=0`。

## 2026-04-26 晚间事故记录：99% 长时间失败

### 真实日志症状

- UI 显示 `已处理 1189/405 秒 · 99%`，提示仍为“正在先写人物小传，再生成统一剧本骨架”。
- 后端 `logs/server-dev.log` 中出现：
  - `character_bundle_added_missing_protagonist name=林轩，外门弟子，母亲遗物吊坠被毁后触发血脉封印，逐步觉醒`
  - `character_bundle_incomplete_after_enrichment ... antagonist=名门正派大小姐 protagonistCovered=1 antagonistCovered=0 ... incomplete=[林轩...{legacy:-;v2:appearance|personality|identity|values|plotFunction}]`
  - `[OutlineCharacters] contract retry attempt=2/3 ...`
  - `[OutlineCharacters] Failed ... character_contract_incomplete_after_retries:protagonist=1:antagonist=0:incomplete=0`
- 同一请求里还叠加了粗纲 batch JSON 截断重试，例如 `range=16-20 responseChars=0 parsed=no` 后再 retry。

### 根因

- `outline-characters-service.ts` 在合同不通过时会最多 3 次重跑完整链路：势力矩阵、人物 V2、粗纲 overview、4 个粗纲 batch 全部重来。一个合同误判会把 400 秒级生成放大成 900 秒级失败。
- `resolveCharacterContractAnchors` 把 outline 里的 `林轩，外门弟子，母亲遗物...` 当完整主角名，锚点匹配被描述后缀污染。
- `名门正派大小姐` 是角色类型，不是已命名人物；合同层此前把它当具体 antagonist 硬要求覆盖，导致 `antagonistCovered=0`。
- `buildMandatoryProtagonistDraft` 自动补主角时只补 legacy 字段，没有补 `appearance/personality/identity/values/plotFunction`，所以系统自己补出来的主角又被合同层判为不完整。

### 已改文件

- `src/shared/domain/workflow/character-contract.ts`
  - 清洗 outline 主角描述后缀，只保留具体名。
  - 将 `名门正派大小姐/仙盟大小姐/反派大小姐/贵女/嫡女` 这类角色类型锚点视为泛称，不再阻塞保存。
- `server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts`
  - `buildMandatoryProtagonistDraft` 补齐 V2 五维字段。
  - 玄幻主角兜底不再把 `名门正派大小姐` 泛称写进主角卡。
- `server/src/application/workspace/outline-characters-service.ts`
  - 移除外层 3 次完整生成重跑。
  - 保留一次最终本地合同校验；若仍失败，直接返回明确 `character_contract_incomplete`，不再吞掉几百秒重来。
- 对应测试：
  - `src/shared/domain/workflow/character-contract.test.ts`
  - `server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.test.ts`

## 最新验证

- `npm run typecheck` 通过。
- `npm run build` 通过。
- 第六刀定向测试通过：
  - `npx tsx --tsconfig server/tsconfig.json --test src/shared/contracts/character-profile-v2.test.ts server/src/application/workspace/enrich-character-drafts.test.ts`
  - `npx tsx --tsconfig server/tsconfig.json --test server/src/application/workspace/enrich-character-drafts.test.ts src/shared/contracts/character-profile-v2.test.ts server/src/application/workspace/character-profile-v2-agent.test.ts server/src/application/workspace/build-outline-character-entity-store.test.ts src/renderer/src/features/character/model/character-stage-copy-text.test.ts`
- 全量 `npm test` 最近一次通过口径：`758 tests, 756 pass, 0 fail, 2 skipped`。
- 追加验证：
  - `npx tsx --tsconfig server/tsconfig.json --test src/shared/domain/workflow/character-contract.test.ts server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.test.ts`：21 条通过。
  - `cd server && npm run typecheck` 通过。

## 下一次真实测试清单

先让用户重新生成人物小传和骨架。重点确认：不再 99% 后整链重跑三次；如果粗纲 batch JSON 截断，只允许该 batch 内部重试，不应再因为 `名门正派大小姐` 泛称导致整条人物/骨架链失败。

重点看：

1. 是否还出现 `让X信奉 / 在主线里的作用 / 行动抓手`。
2. 是否还出现 `起点：起点是 / 终局变化：终局变化 / 代价选择 → 终局`。
3. 男性名是否还被写成 `她 / 师妹 / 少女 / 大小姐`。
4. 守护女主是否还套 `旧账 / 外部靠山 / 可调动关系`。
5. 亲传大弟子是否还出现 `被更强的人替掉`。
6. 仙盟爪牙是否还硬套 `养育恩情 / 正道名分`。
7. 大长老、盟主、宗主这类权力核心是否还落入 `程序慢半拍 / 站队代价`。
8. 势力成员是否仍串阵营，尤其仙盟人物进入主角宗门。
9. outline 主角若返回 `林轩，外门弟子...`，最终人物锚点应只按 `林轩` 匹配。
10. 自动补主角时，完整人物小传不应再缺 `appearance/personality/identity/values/plotFunction`。

人物小传过关后，再跑剧本骨架；骨架失败也要确认人物成果不丢、warning 可见。

## 已知风险

- `xinjuben_transactions` 线上 schema 与代码预期不一致：线上 `type` 只允许 `credit/debit` 且 `appId` 必填，代码仍写 `payment/admin_adjust/api_call`。钱包余额已能更新，但流水写入可能失败。后续需要单独修 schema/流水口径。
- `cd server && npm run build` 仍受既有 `.ts` 后缀 import 配置影响，当前 server 验证口径以 `cd server && npm run typecheck` 为准。
- `server/pb_data/data.db` 当前工作树已有修改态，可能来自本地 PocketBase 使用或历史测试；不要在不确认的情况下回滚。
- 真实 UI 性能仍是风险，`CharacterStage`、`OutlineStage`、首页工作台和复制/导出能力后续改动必须做页面级手测。
- 仍可能慢的部分：AI 返回截断/空 JSON 时，`generate-outline-and-characters-support.ts` 会对单个粗纲 batch 做内部重试；这是局部重试，不是整链重跑。后续若仍慢，应优先优化 JSON 修复/单 batch 降 token，而不是恢复整链 retry。

## 关键文件

- `server/src/application/workspace/character-profile-v2-agent.ts`
- `server/src/application/workspace/enrich-character-drafts.ts`
- `server/src/application/workspace/build-outline-character-entity-store.ts`
- `server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts`
- `src/shared/contracts/character-profile-v2.ts`
- `src/shared/contracts/outline-character-generation-bundle.ts`
- `src/shared/domain/generation-strategy/generation-strategy.ts`
- `src/shared/domain/workflow/character-contract.ts`
- `src/renderer/src/features/credits/ui/CreditsTopupModal.tsx`
