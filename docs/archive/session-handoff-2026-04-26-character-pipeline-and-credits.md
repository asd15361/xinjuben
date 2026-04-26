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

## 最新验证

- `npm run typecheck` 通过。
- `npm run build` 通过。
- 第六刀定向测试通过：
  - `npx tsx --tsconfig server/tsconfig.json --test src/shared/contracts/character-profile-v2.test.ts server/src/application/workspace/enrich-character-drafts.test.ts`
  - `npx tsx --tsconfig server/tsconfig.json --test server/src/application/workspace/enrich-character-drafts.test.ts src/shared/contracts/character-profile-v2.test.ts server/src/application/workspace/character-profile-v2-agent.test.ts server/src/application/workspace/build-outline-character-entity-store.test.ts src/renderer/src/features/character/model/character-stage-copy-text.test.ts`
- 全量 `npm test` 最近一次通过口径：`758 tests, 756 pass, 0 fail, 2 skipped`。

## 下一次真实测试清单

先让用户重新生成人物小传，不要先推进骨架。

重点看：

1. 是否还出现 `让X信奉 / 在主线里的作用 / 行动抓手`。
2. 是否还出现 `起点：起点是 / 终局变化：终局变化 / 代价选择 → 终局`。
3. 男性名是否还被写成 `她 / 师妹 / 少女 / 大小姐`。
4. 守护女主是否还套 `旧账 / 外部靠山 / 可调动关系`。
5. 亲传大弟子是否还出现 `被更强的人替掉`。
6. 仙盟爪牙是否还硬套 `养育恩情 / 正道名分`。
7. 大长老、盟主、宗主这类权力核心是否还落入 `程序慢半拍 / 站队代价`。
8. 势力成员是否仍串阵营，尤其仙盟人物进入主角宗门。

人物小传过关后，再跑剧本骨架；骨架失败也要确认人物成果不丢、warning 可见。

## 已知风险

- `xinjuben_transactions` 线上 schema 与代码预期不一致：线上 `type` 只允许 `credit/debit` 且 `appId` 必填，代码仍写 `payment/admin_adjust/api_call`。钱包余额已能更新，但流水写入可能失败。后续需要单独修 schema/流水口径。
- `cd server && npm run build` 仍受既有 `.ts` 后缀 import 配置影响，当前 server 验证口径以 `cd server && npm run typecheck` 为准。
- `server/pb_data/data.db` 当前工作树已有修改态，可能来自本地 PocketBase 使用或历史测试；不要在不确认的情况下回滚。
- 真实 UI 性能仍是风险，`CharacterStage`、`OutlineStage`、首页工作台和复制/导出能力后续改动必须做页面级手测。

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
