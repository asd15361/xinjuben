# Graph Report - src/shared  (2026-04-27)

## Corpus Check
- 161 files · ~91,697 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 852 nodes · 1618 edges · 43 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_审计与状态|审计与状态]]
- [[_COMMUNITY_剧本质量修复|剧本质量修复]]
- [[_COMMUNITY_市场打法生命周期|市场打法生命周期]]
- [[_COMMUNITY_剧本内容策略|剧本内容策略]]
- [[_COMMUNITY_权威策略与校验|权威策略与校验]]
- [[_COMMUNITY_短剧控制卡|短剧控制卡]]
- [[_COMMUNITY_生成策略层|生成策略层]]
- [[_COMMUNITY_活跃角色|活跃角色]]
- [[_COMMUNITY_真相权威|真相权威]]
- [[_COMMUNITY_规划区块|规划区块]]
- [[_COMMUNITY_实体构建|实体构建]]
- [[_COMMUNITY_角色与世界观|角色与世界观]]
- [[_COMMUNITY_输入合同|输入合同]]
- [[_COMMUNITY_大纲剧集|大纲剧集]]
- [[_COMMUNITY_人物画像V2|人物画像V2]]
- [[_COMMUNITY_硬钩子|硬钩子]]
- [[_COMMUNITY_人物合同|人物合同]]
- [[_COMMUNITY_阵营席位|阵营席位]]
- [[_COMMUNITY_落地策略|落地策略]]
- [[_COMMUNITY_故事梗概|故事梗概]]
- [[_COMMUNITY_提示词变量|提示词变量]]
- [[_COMMUNITY_剧本连续性|剧本连续性]]
- [[_COMMUNITY_剧本最小化|剧本最小化]]
- [[_COMMUNITY_角色草稿|角色草稿]]
- [[_COMMUNITY_剧集片段|剧集片段]]
- [[_COMMUNITY_剧集脚本|剧集脚本]]
- [[_COMMUNITY_故事状态|故事状态]]
- [[_COMMUNITY_信号策略|信号策略]]
- [[_COMMUNITY_人物画像|人物画像]]
- [[_COMMUNITY_演进引擎|演进引擎]]
- [[_COMMUNITY_实体选择器|实体选择器]]
- [[_COMMUNITY_人物命名|人物命名]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_定义引擎|定义引擎]]
- [[_COMMUNITY_提升引擎|提升引擎]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]
- [[_COMMUNITY_项目|项目]]

## God Nodes (most connected - your core abstractions)
1. `getScreenplayLines()` - 24 edges
2. `inspectContentQualityEpisode()` - 23 edges
3. `inspectScreenplayQualityEpisode()` - 22 edges
4. `buildEpisodeControlCard()` - 19 edges
5. `cleanSentence()` - 14 edges
6. `ScriptOrchestrator` - 14 edges
7. `computeMarketQuality()` - 12 edges
8. `extractStructuredSceneFromScreenplay()` - 12 edges
9. `mapV2ToLegacyCharacterDraft()` - 11 edges
10. `getConfirmedFormalFacts()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `resolvePersistedGenerationTruth()` --calls--> `createInitialVisibleResult()`  [INFERRED]
  D:\project\xinjuben\src\shared\domain\workflow\persisted-generation-truth.ts → D:\project\xinjuben\src\shared\contracts\visible-release-state.ts
- `resolvePersistedGenerationTruth()` --calls--> `createVisibleSuccessState()`  [INFERRED]
  D:\project\xinjuben\src\shared\domain\workflow\persisted-generation-truth.ts → D:\project\xinjuben\src\shared\contracts\visible-release-state.ts
- `resolvePersistedGenerationTruth()` --calls--> `createVisibleFailureState()`  [INFERRED]
  D:\project\xinjuben\src\shared\domain\workflow\persisted-generation-truth.ts → D:\project\xinjuben\src\shared\contracts\visible-release-state.ts
- `resolvePersistedGenerationTruth()` --calls--> `createFormalBlockedState()`  [INFERRED]
  D:\project\xinjuben\src\shared\domain\workflow\persisted-generation-truth.ts → D:\project\xinjuben\src\shared\contracts\visible-release-state.ts
- `resolvePersistedGenerationTruth()` --calls--> `createFormalReleasedState()`  [INFERRED]
  D:\project\xinjuben\src\shared\domain\workflow\persisted-generation-truth.ts → D:\project\xinjuben\src\shared\contracts\visible-release-state.ts

## Communities

### Community 0 - "审计与状态"
Cohesion: 0.04
Nodes (31): buildAuditExecutionSnapshot(), buildAuditPolicyStatus(), buildLedgerPolicyStatus(), buildPressurePolicyStatus(), buildProgressionPolicyStatus(), buildRepairPolicyStatus(), buildRuntimePolicyStatus(), buildScriptEngineAssetStatus() (+23 more)

### Community 1 - "剧本质量修复"
Cohesion: 0.06
Nodes (53): pickHardHookWindow(), buildFallbackDialogueLine(), clipText(), dropLeadingPlaceholderSceneStubs(), extractStructuredSceneFromScreenplay(), hasActionPayload(), hasDialoguePayload(), hasMeaningfulCharacterRoster() (+45 more)

### Community 2 - "市场打法生命周期"
Cohesion: 0.06
Nodes (36): countKeywordHits(), createMarketPlaybookDraftFromSamples(), extractAntiPatterns(), extractMatchedKeywords(), extractPatterns(), extractPromptRules(), extractQualitySignals(), SampleValidationError (+28 more)

### Community 3 - "剧本内容策略"
Cohesion: 0.07
Nodes (46): checkSceneInformationDensity(), detectExpositionLines(), buildContentRepairSignals(), computeCatharsisPayoffScore(), computeCharacterArcProgress(), computeCharacterFunctionScore(), computeDramaticTurnScore(), computeFemaleEmotionalIdentificationScore() (+38 more)

### Community 4 - "权威策略与校验"
Cohesion: 0.06
Nodes (30): buildCharacterFingerprint(), computeHash(), buildScriptGenerationContract(), getConfirmedFormalFactLabels(), getConfirmedFormalFacts(), extractConfirmedSevenQuestions(), hasConfirmedSevenQuestions(), buildEpisodePromptGuidance() (+22 more)

### Community 5 - "短剧控制卡"
Cohesion: 0.08
Nodes (35): buildConfirmedStoryIntent(), normalizeConfirmedCharacterName(), normalizeConfirmedCharacterNameList(), attachEpisodeControlCardsToSegments(), buildEpisodeControlCard(), buildRequiredProp(), cleanText(), extractCliffhangerFromSummary() (+27 more)

### Community 6 - "生成策略层"
Cohesion: 0.07
Nodes (22): buildStrategyFactionMatrixPromptBlock(), countLiteralOccurrences(), getGenerationStrategyById(), inferStrategyIdFromText(), isFactionContaminationTerm(), isHiddenBloodlineXianxiaText(), isPayoffContaminationTerm(), isRoleContaminationTerm() (+14 more)

### Community 7 - "活跃角色"
Cohesion: 0.07
Nodes (18): buildMemberFromFullProfile(), buildMemberFromLightEntity(), buildOutlineBlocks(), buildTextCorpus(), collectEpisodeBeatTexts(), collectEpisodeTexts(), deriveActiveCharacterPackage(), findOutlineBlockNo() (+10 more)

### Community 8 - "真相权威"
Cohesion: 0.08
Nodes (11): enforceWriteAuthority(), mayWrite(), assertMainProducer(), enforceFormalFactEntry(), enforceLedgerEntry(), enforceScriptGenerationEntry(), enforceTruthDomainWrite(), assertSingleProducer() (+3 more)

### Community 9 - "规划区块"
Cohesion: 0.12
Nodes (22): analyzeLoadBearing(), analyzeLoadBearingEntities(), analyzeLoadBearingRoles(), deriveNarrativeThreads(), buildCharacterBlocks(), buildEntityGovernance(), buildOutlineBlocks(), buildRoleGovernance() (+14 more)

### Community 10 - "实体构建"
Cohesion: 0.17
Nodes (27): buildEntityStoreFromDecomposition(), createEntityId(), createProvenance(), findByName(), findResolvableEntityId(), hashText(), mergeAliases(), mergeCharacterEntity() (+19 more)

### Community 11 - "角色与世界观"
Cohesion: 0.12
Nodes (11): attachStoryFoundationToIntent(), buildStoryFoundation(), cleanText(), deriveCharacterRoster(), deriveWorldBibleFromStoryIntent(), extractBriefSection(), fallbackWorldType(), normalizeEpisodeCount() (+3 more)

### Community 12 - "输入合同"
Cohesion: 0.1
Nodes (17): assertRendererProcess(), authorityFail(), AuthorityFailureError, authorityOk(), detectForbiddenFallbackFact(), enforceNoForbiddenFallback(), isRendererProcess(), requireAuthorityFields() (+9 more)

### Community 13 - "大纲剧集"
Cohesion: 0.16
Nodes (18): buildFourActEpisodeRanges(), clampEpisodeCount(), deriveOutlineEpisodeCount(), extractDeclaredEpisodeCountFromLine(), extractEpisodeCountFromGenerationBrief(), extractLatestAuthoritativeEpisodeCountFromText(), extractLatestDeclaredEpisodeCountFromText(), extractLatestEpisodeCountFromText() (+10 more)

### Community 14 - "人物画像V2"
Cohesion: 0.27
Nodes (19): buildNaturalBiography(), buildStructuredArc(), cleanPublicMask(), cleanSentence(), extractArcStage(), hasArcTemplateLeak(), hasNaturalBiography(), hasRepeatedStructuredEnding() (+11 more)

### Community 15 - "硬钩子"
Cohesion: 0.25
Nodes (15): hasConcreteHardHook(), hasConcreteResult(), hasDirectThreat(), hasMarkerSupport(), hasPressureOnTarget(), hasResultMarkerSupport(), hasUrgencySupport(), hasWeakHookShape() (+7 more)

### Community 16 - "人物合同"
Cohesion: 0.22
Nodes (15): collectMissingLegacyFields(), collectMissingV2Fields(), fuzzyNormalizeName(), getCharacterBundleContractIssues(), getCharacterContractIssues(), hasText(), isAnchorCoveredByCharacterText(), isCharacterBundleStructurallyComplete() (+7 more)

### Community 17 - "阵营席位"
Cohesion: 0.23
Nodes (13): buildFactionSeatBlueprints(), buildRoleCounts(), buildSeatSlotGoals(), createBlueprint(), createSlotCharacter(), createSlotCharacterId(), hashText(), linkNamedCharactersToMemberFactions() (+5 more)

### Community 18 - "落地策略"
Cohesion: 0.22
Nodes (11): extractNamedSubject(), hasAny(), matchFormalFactLandingHeuristic(), extractAnchors(), matchFormalFactLanding(), normalizeText(), pushAnchor(), getFormalFactSemanticLabel() (+3 more)

### Community 19 - "故事梗概"
Cohesion: 0.29
Nodes (12): countFactionOrFieldSignals(), countRosterNames(), extractBriefSection(), extractEpisodeCount(), hasCrowdOrFunctionalRoles(), hasMeaningfulText(), hasWorldFoundation(), inspectProjectIntakeReadiness() (+4 more)

### Community 20 - "提示词变量"
Cohesion: 0.24
Nodes (10): extractAntagonist(), extractCoreItem(), extractExtraCharacters(), extractLeverageCharacter(), extractOrganization(), extractPromptVariables(), extractProtagonist(), extractRuleLeverCharacter() (+2 more)

### Community 21 - "剧本连续性"
Cohesion: 0.31
Nodes (10): checkCharacterStateContinuity(), checkHardConstraintViolations(), checkHookContinuation(), checkRequiredPropContinuity(), checkVillainProgressionContinuity(), extractSearchTokens(), getScreenplayText(), hasAnyToken() (+2 more)

### Community 22 - "剧本最小化"
Cohesion: 0.29
Nodes (13): applyMinimalTrim(), checkTrimTrigger(), isActionLine(), isDialogueLine(), isRosterLine(), isSceneHeading(), isTrimTarget(), parseScreenplayScenesForTrim() (+5 more)

### Community 23 - "角色草稿"
Cohesion: 0.32
Nodes (12): cleanCharacterLikeName(), isLatinLikeName(), isLikelyEntityAnchor(), isSyntheticExternalPressureDraft(), looksLikeExternalPressureEntityName(), mergeActiveBlockNos(), mergeCharacterDraft(), normalizeCharacterDrafts() (+4 more)

### Community 24 - "剧集片段"
Cohesion: 0.44
Nodes (9): compact(), getScriptSegmentBodyText(), getScriptSegmentHookText(), getScriptSegmentNormalizedSignature(), getScriptSegmentOpeningAction(), getScriptSegmentSearchText(), legacyText(), normalize() (+1 more)

### Community 25 - "剧集脚本"
Cohesion: 0.43
Nodes (6): collectOverflowScriptEpisodeNos(), collectScriptEpisodeNos(), countCoveredScriptEpisodes(), mergeScriptByEpisodeNo(), normalizeSceneNo(), restrictScriptToTargetEpisodes()

### Community 26 - "故事状态"
Cohesion: 0.48
Nodes (4): buildStoryStateSnapshot(), clipText(), findCharacterByName(), resolvePreviousEpisodeEnding()

### Community 27 - "信号策略"
Cohesion: 0.53
Nodes (4): findMemoryEchoEvidence(), findTraitBindingEvidence(), hasTraitBindingSignal(), normalizeRows()

### Community 28 - "人物画像"
Cohesion: 0.33
Nodes (0): 

### Community 29 - "演进引擎"
Cohesion: 1.0
Nodes (2): detectDramaProgressionDimensions(), validateDramaProgression()

### Community 30 - "实体选择器"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "人物命名"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "定义引擎"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "提升引擎"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "项目"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "项目"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `项目`** (2 nodes): `authority-failure.test.ts`, `authority-failure.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `定义引擎`** (2 nodes): `definition-engine.ts`, `validateFormalFactDefinition()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `提升引擎`** (2 nodes): `elevation-engine.ts`, `evaluateFormalFactElevation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `app-error.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `chat.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `drama-progression.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `formal-fact.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `runtime-task.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `workspace.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `项目`** (1 nodes): `market-playbook-types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildEpisodeControlCard()` connect `短剧控制卡` to `生成策略层`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `inspectContentQualityEpisode()` connect `剧本内容策略` to `市场打法生命周期`, `剧本连续性`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `inspectContentQualityEpisode()` (e.g. with `inspectStoryContinuityAgainstSnapshot()` and `inspectPlaybookAlignment()`) actually correct?**
  _`inspectContentQualityEpisode()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `inspectScreenplayQualityEpisode()` (e.g. with `trimLastSceneExcess()` and `applyMinimalTrim()`) actually correct?**
  _`inspectScreenplayQualityEpisode()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `buildEpisodeControlCard()` (e.g. with `buildScriptGenerationControlPackage()` and `normalizeShortDramaConstitution()`) actually correct?**
  _`buildEpisodeControlCard()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `审计与状态` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `剧本质量修复` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._