# Graph Report - server/src  (2026-04-27)

## Corpus Check
- 107 files · ~70,708 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 686 nodes · 1232 edges · 41 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 177 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_大纲角色服务|大纲角色服务]]
- [[_COMMUNITY_PocketBase集合|PocketBase集合]]
- [[_COMMUNITY_阵营矩阵Agent|阵营矩阵Agent]]
- [[_COMMUNITY_项目路由|项目路由]]
- [[_COMMUNITY_大纲角色路由|大纲角色路由]]
- [[_COMMUNITY_角色生成Agent|角色生成Agent]]
- [[_COMMUNITY_七问确认Agent|七问确认Agent]]
- [[_COMMUNITY_大纲生成Agent|大纲生成Agent]]
- [[_COMMUNITY_项目快照|项目快照]]
- [[_COMMUNITY_LLM调用|LLM调用]]
- [[_COMMUNITY_SSE流式响应|SSE流式响应]]
- [[_COMMUNITY_短剧秀场Agent|短剧秀场Agent]]
- [[_COMMUNITY_中间件|中间件]]
- [[_COMMUNITY_应用入口|应用入口]]
- [[_COMMUNITY_数据库迁移|数据库迁移]]
- [[_COMMUNITY_类型定义|类型定义]]
- [[_COMMUNITY_工具函数|工具函数]]
- [[_COMMUNITY_聊天摘要|聊天摘要]]
- [[_COMMUNITY_聊天确认|聊天确认]]
- [[_COMMUNITY_聊天分解|聊天分解]]
- [[_COMMUNITY_索引|索引]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `createScriptGenerationPrompt()` - 28 edges
2. `generateOutlineCharacterBundleFromConfirmedSevenQuestions()` - 22 edges
3. `buildOutlineEpisodeBatchPrompt()` - 18 edges
4. `buildOutlineOverviewPrompt()` - 17 edges
5. `buildOutlineCharacterEntityStore()` - 16 edges
6. `buildScriptStateLedger()` - 15 edges
7. `buildMarketProfilePromptSection()` - 15 edges
8. `authenticateAdmin()` - 15 edges
9. `ProjectRepository` - 15 edges
10. `generateCharacterProfileV2ForFaction()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `generateOutlineCharacterBundleFromConfirmedSevenQuestions()` --calls--> `attachMasterEntityIdsToCharacterDrafts()`  [INFERRED]
  D:\project\xinjuben\server\src\application\workspace\generate-outline-and-characters-from-confirmed-seven-questions.ts → D:\project\xinjuben\server\src\application\workspace\build-outline-character-entity-store.ts
- `launchScriptGenerationWorker()` --calls--> `buildScriptGenerationExecutionPlan()`  [INFERRED]
  D:\project\xinjuben\server\src\api\routes\scripts.ts → D:\project\xinjuben\server\src\application\script-generation\build-execution-plan.ts
- `launchScriptGenerationWorker()` --calls--> `createInitialProgressBoard()`  [INFERRED]
  D:\project\xinjuben\server\src\api\routes\scripts.ts → D:\project\xinjuben\server\src\application\script-generation\progress-board.ts
- `invokeDetailedOutlineAct()` --calls--> `generateTextWithRuntimeRouter()`  [INFERRED]
  D:\project\xinjuben\server\src\application\workspace\generate-detailed-outline-support.ts → D:\project\xinjuben\server\src\application\ai\generate-text.ts
- `invokeRoughOutlineStage()` --calls--> `generateTextWithRuntimeRouter()`  [INFERRED]
  D:\project\xinjuben\server\src\application\workspace\generate-outline-and-characters-support.ts → D:\project\xinjuben\server\src\application\ai\generate-text.ts

## Communities

### Community 0 - "大纲角色服务"
Cohesion: 0.07
Nodes (39): buildConfirmedSevenQuestionsHandshakeSummary(), buildFallbackOutlinePayloadFromStoryIntent(), buildGuardianLeaderDraft(), buildMandatoryProtagonistDraft(), buildMandatoryProtagonistV2Fields(), buildProtagonistProfileFromDraft(), buildStrategyContaminationWarnings(), buildStrategyRepairWarning() (+31 more)

### Community 1 - "PocketBase集合"
Cohesion: 0.1
Nodes (37): addMissingDraftCharacters(), addMissingProfileCharacters(), attachMasterEntityIdsToCharacterDrafts(), buildCharacterSummary(), buildOutlineCharacterEntityStore(), buildProfileFactionText(), buildSeatBlueprints(), buildSeatSlotGoals() (+29 more)

### Community 2 - "阵营矩阵Agent"
Cohesion: 0.06
Nodes (17): buildScriptStateLedger(), buildUnresolvedSignals(), buildUsedTactics(), nowIso(), buildCharacterStates(), buildRelationshipPressure(), pickRecentScenes(), buildLedgerEvents() (+9 more)

### Community 3 - "项目路由"
Cohesion: 0.09
Nodes (35): buildCharacterContinuityLockLines(), buildKnowledgeBoundaryBlock(), buildLedgerAssertionBlock(), buildLedgerConstraintBlock(), buildTacticBanLines(), buildSceneProgressionDirectives(), clipText(), compactScene() (+27 more)

### Community 4 - "大纲角色路由"
Cohesion: 0.14
Nodes (20): generateDetailedOutlineForProject(), generateOutlineAndCharactersFromConfirmedSevenQuestions(), generateCharactersForProject(), generateFactionsForProject(), generateOutlineAndCharactersForProject(), generateOutlineForProject(), extractPocketBaseErrorDetails(), getSingleByProject() (+12 more)

### Community 5 - "角色生成Agent"
Cohesion: 0.08
Nodes (27): collectF6PostflightIssues(), lacksContinuationHook(), lacksPlayableBlocking(), detectDuplicateScenes(), normalizeScene(), buildGeneratedScriptText(), collectGenerationStrategyPostflightIssues(), finalizeScriptPostflight() (+19 more)

### Community 6 - "七问确认Agent"
Cohesion: 0.08
Nodes (23): createPaymentOrder(), generateOutTradeNo(), getAlipaySdk(), processAlipayWebhook(), queryOrderStatus(), authMiddleware(), optionalAuthMiddleware(), authenticateAdmin() (+15 more)

### Community 7 - "大纲生成Agent"
Cohesion: 0.11
Nodes (22): buildSceneRepairPrompt(), executeScriptRepair(), repairSingleScene(), buildContinuityConstraintBlock(), buildEpisodeIssueTicket(), buildEpisodeRewritePrompt(), executeScriptRewrite(), resolveRewriteSceneCount() (+14 more)

### Community 8 - "项目快照"
Cohesion: 0.2
Nodes (23): buildAmbitiousElderDraft(), buildEmotionLeverDraft(), buildGeneralLeverDraft(), buildGuardianHeroineDraft(), buildRuleLeverDraft(), buildSeniorDiscipleDraft(), buildStrategyTextContext(), buildStructuredArc() (+15 more)

### Community 9 - "LLM调用"
Cohesion: 0.13
Nodes (22): buildCharacterProfileAgentPrompt(), buildPromptAnchors(), clipText(), collapseText(), extractSection(), renderAnchorBlock(), splitBulletLines(), splitNameList() (+14 more)

### Community 10 - "SSE流式响应"
Cohesion: 0.13
Nodes (19): buildCharacterProfileV2AgentPrompt(), buildCharacterProfileV2RetryPrompt(), buildFallbackCharacterProfileFromPlaceholder(), buildFallbackCharacterProfilesFromFaction(), buildSingleCharacterProfileV2AgentPrompt(), createFactionScopedMatrix(), delay(), generateCharacterProfileV2() (+11 more)

### Community 11 - "短剧秀场Agent"
Cohesion: 0.16
Nodes (21): formatCharacterProfileSummary(), formatSevenQuestionsAsNarrativeConstraint(), buildDefaultPromptVars(), buildFactionRotationRules(), buildGeneralizedPromptRules(), buildOutlineEpisodeBatchPrompt(), buildOutlineOverviewPrompt(), buildOutlineStrategyPromptSection() (+13 more)

### Community 12 - "中间件"
Cohesion: 0.12
Nodes (19): appendConfirmedSevenQuestionsDiagnosticLog(), generateOutlineBundleFromConfirmedSevenQuestionsDefault(), generateCharacterBundle(), generateOutlineBundle(), generateOutlineEpisodeBatch(), generateOutlineOverview(), invokeRoughOutlineStage(), mergeActSummariesIntoPlans() (+11 more)

### Community 13 - "应用入口"
Cohesion: 0.15
Nodes (14): buildNarrativeConstraintLocks(), buildTruthText(), getCandidateText(), getNonOpeningSectionText(), getSectionText(), includesAny(), pushViolation(), renderNarrativeConstraintPromptBlock() (+6 more)

### Community 14 - "数据库迁移"
Cohesion: 0.16
Nodes (15): buildFirstDraftSystemPrompt(), resolveAiStageTimeoutMs(), buildCharCountRewriteGuidance(), buildContentRepairPrompt(), buildEpisodeAttemptRequest(), buildEpisodeEditPrompt(), buildEpisodeIssueTicket(), buildSceneStrategyText() (+7 more)

### Community 15 - "类型定义"
Cohesion: 0.18
Nodes (17): buildDetailedOutlineBatchPlans(), emitDetailedOutlineDiagnostic(), extractActEpisodes(), extractActSummary(), generateDetailedOutlineFromContext(), hasExactEpisodeCoverage(), invokeDetailedOutlineAct(), isDetailedOutlineActResultComplete() (+9 more)

### Community 16 - "工具函数"
Cohesion: 0.17
Nodes (14): normalizeOutlineStoryIntent(), toAnchorName(), toStringArray(), toStringOrEmpty(), cleanPossibleName(), extractNamesFromText(), normalizeAnchorName(), normalizeNameList() (+6 more)

### Community 17 - "聊天摘要"
Cohesion: 0.22
Nodes (15): collectBlockNoCandidates(), findCharacterList(), normalizeCharacter(), normalizeCharacterActiveBlockNos(), normalizeCharacterRoleLayer(), parseCharacterBundleText(), parseLineBasedCharacters(), pickText() (+7 more)

### Community 18 - "聊天确认"
Cohesion: 0.21
Nodes (15): buildCharactersSection(), buildDetailedOutlineSection(), buildEpisodeControlSection(), buildGenerationStrategySection(), buildMarketProfilePromptSection(), buildRoughOutlineSection(), buildScriptGenerationSection(), resolveStrategyPromptBlockKey() (+7 more)

### Community 19 - "聊天分解"
Cohesion: 0.16
Nodes (10): buildEpisodePlans(), buildScriptGenerationExecutionPlan(), clampTargetEpisodes(), resolveMode(), resolveLaneStrategy(), clamp(), normalizeCount(), resolveScriptRuntimeProfile() (+2 more)

### Community 20 - "索引"
Cohesion: 0.32
Nodes (10): buildFactionMatrixAgentPrompt(), buildFactionMatrixRetryPrompt(), generateFactionMatrix(), normalizeJsonEnvelope(), parseFactionMatrixResponse(), parseFactionMatrixResponseWithEpisodeCount(), resolveCharacterPoolBudget(), resolveFactionMatrixMaxOutputTokens() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (5): buildStorySynopsisFromChat(), includesAny(), isConcurrencyError(), requireProjectSnapshot(), withProjectResult()

### Community 22 - "Community 22"
Cohesion: 0.38
Nodes (8): buildEpisodeSceneDirectives(), buildGenericEpisodeSceneDirectives(), hasConfirmedFact(), resolveBatchContext(), resolveTotalEpisodes(), buildFormalFactSceneDirectives(), getConfirmedFact(), pickName()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (3): MarketPlaybookRepository, parsePlaybook(), stringifyJson()

### Community 24 - "Community 24"
Cohesion: 0.31
Nodes (6): createEmptyEntityStore(), createInitialFormalRelease(), createInitialVisibleResult(), mapProjectSnapshot(), mapProjectSummary(), parseJsonOrDefault()

### Community 25 - "Community 25"
Cohesion: 0.44
Nodes (8): enrichCharacterDrafts(), cleanText(), extractSectionBody(), parseCharacterCards(), parseCharacterLayers(), parseEpisodeCount(), parseStructuredGenerationBrief(), uniqueList()

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 29`** (2 nodes): `formal-fact.ts`, `requireUser()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `market-playbooks.ts`, `requireUser()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `script-audit.ts`, `requireUser()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `stage-contract.ts`, `requireUser()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `confirmFormalFact()`, `confirm-formal-fact.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `buildOutline()`, `build-episode-scene-directives.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `makeMinimalInput()`, `create-script-generation-prompt.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `makeMarketProfile()`, `build-market-profile-prompt-section.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `credits.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `pay.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolveAiStageTimeoutMs()` connect `数据库迁移` to `大纲生成Agent`, `SSE流式响应`, `中间件`, `类型定义`, `聊天确认`, `索引`?**
  _High betweenness centrality (0.325) - this node is a cross-community bridge._
- **Why does `generateFactionMatrix()` connect `索引` to `大纲角色服务`, `大纲角色路由`, `数据库迁移`?**
  _High betweenness centrality (0.281) - this node is a cross-community bridge._
- **Why does `generateOutlineCharacterBundleFromConfirmedSevenQuestions()` connect `大纲角色服务` to `工具函数`, `Community 25`, `大纲角色路由`, `PocketBase集合`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createScriptGenerationPrompt()` (e.g. with `buildScriptStateLedger()` and `buildEpisodeSceneDirectives()`) actually correct?**
  _`createScriptGenerationPrompt()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `generateOutlineCharacterBundleFromConfirmedSevenQuestions()` (e.g. with `normalizeOutlineStoryIntent()` and `validateStructuredOutline()`) actually correct?**
  _`generateOutlineCharacterBundleFromConfirmedSevenQuestions()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `buildOutlineEpisodeBatchPrompt()` (e.g. with `formatSevenQuestionsAsNarrativeConstraint()` and `formatCharacterProfileSummary()`) actually correct?**
  _`buildOutlineEpisodeBatchPrompt()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `buildOutlineOverviewPrompt()` (e.g. with `formatSevenQuestionsAsNarrativeConstraint()` and `formatCharacterProfileSummary()`) actually correct?**
  _`buildOutlineOverviewPrompt()` has 4 INFERRED edges - model-reasoned connections that need verification._