import type { CharacterDraftDto, OutlineDraftDto } from '../../../../shared/contracts/workflow'
import type { StartScriptGenerationInputDto } from '../../../../shared/contracts/script-generation'
import { buildFormalFactPromptBlock } from '../../../../shared/domain/formal-fact/stage-policy'
import { buildRelationshipPressureSnapshot } from '../../../../shared/domain/policy/pressure/pressure-policy'
import { buildEpisodePromptGuidance } from '../../../../shared/domain/script-prompt/stage-guidance'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  renderStoryContractPromptBlock
} from '../../../../shared/domain/story-contract/story-contract-policy'
import { buildCharacterStates } from '../ledger/ledger-characters'
import {
  buildCompactedCharacterBlock,
  buildCompactedSegmentBlock,
  buildCompactedStoryIntentBlock
} from './compact-script-context'
import {
  buildKnowledgeBoundaryBlock,
  buildLedgerAssertionBlock,
  buildMomentumBridgeBlock
} from './build-ledger-prompt-blocks'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { buildEpisodeSceneDirectives } from './build-episode-scene-directives'
import { buildSceneProgressionDirectives } from './build-scene-progression-directives'

export function createScriptGenerationPrompt(
  input: StartScriptGenerationInputDto,
  outline: OutlineDraftDto,
  characters: CharacterDraftDto[],
  episodeNo: number
): string {
  const storyContract = buildStoryContract({
    storyIntent: input.storyIntent,
    outline,
    characters
  })
  const anchorLedger = buildUserAnchorLedger({
    storyIntent: input.storyIntent,
    outline,
    characters
  })
  const characterStates = buildCharacterStates({
    characters,
    script: input.existingScript
  })
  const leadPressure = characterStates[0]?.relationshipPressure[0]
  const ledger = buildScriptStateLedger({
    storyIntent: input.storyIntent,
    outline,
    characters,
    script: input.existingScript
  })
  const pressureSnapshot = buildRelationshipPressureSnapshot({
    storyIntent: input.storyIntent,
    leadPressure
  })

  return [
    `你正在为短剧《${input.outlineTitle || '未命名项目'}》写第 ${episodeNo} 场核心场景。`,
    `主题：${input.theme || '待补主题'}`,
    `核心冲突：${input.mainConflict || '待补核心冲突'}`,
    `角色摘要：${input.charactersSummary.join('；') || '待补人物摘要'}`,
    buildCompactedStoryIntentBlock(input),
    buildCompactedCharacterBlock({
      characters,
      maxChars: input.plan.runtimeProfile.maxCharacterChars
    }),
    buildCompactedSegmentBlock({
      segments: input.segments,
      maxChars: input.plan.runtimeProfile.maxSegmentChars
    }),
    buildLedgerAssertionBlock(ledger),
    buildKnowledgeBoundaryBlock(ledger),
    buildMomentumBridgeBlock(ledger),
    `关系施压快照：${pressureSnapshot.leverLine}`,
    `关系施压说明：${pressureSnapshot.summary}`,
    buildFormalFactPromptBlock({
      outline,
      episodeNo,
      totalEpisodes: input.plan.targetEpisodes,
      mode: 'script_generation'
    }),
    buildEpisodePromptGuidance({
      outline,
      characters,
      segments: input.segments,
      episodeNo,
      totalEpisodes: input.plan.targetEpisodes
    }),
    renderStoryContractPromptBlock(storyContract, anchorLedger),
    '先按这个顺序写，不要一上来平均交代信息：',
    '1. 先写清这场谁在压谁、谁在护谁、谁在嘴硬、谁在难堪。',
    '2. 再把这种关系压强变成可拍动作，不要只让人物把情况说出来。',
    '3. Dialogue 里先让人物带着自己的站位说话：先回答他现在往哪边站、这句话冲谁去、在护谁或顶谁、为什么只能这么站。',
    '4. 只要一句话里听不出当前方向、关系选择和代价感，这句就还不算站位落地，继续改。',
    '5. 再往下追一句：这句话说出口时，他到底在嘴硬、难堪、心虚、压抑，还是在硬逼别人；如果听不出这种情绪负担，继续改。',
    '6. 情绪压强不是靠直说“我很痛苦”“我很愤怒”成立，而是要让人听见他怎么硬撑、怎么失手、怎么咽回去、怎么拿让步换眼前这一口气。',
    '7. 写对白前先问自己：这句话如果换另一个人说还成立吗？如果成立，就继续改，直到听得出就是这个人。',
    '8. 每场都要问自己三遍：局势有没有更重，关系有没有改位，人物有没有被逼出更疼的选择；如果三件事都没有明显变化，这场就不算推进成立。',
    '9. Emotion 只收这场被逼出来的变化和下一步，不要补分析总结；情绪要落在停顿、让步、反咬、撑着不退这些当下反应里，不准空写“他很痛苦”。',
    '10. 如果当前已经进入收束段，先把这一轮的决定、代价和局面变化写实，再留下一条最直接的余波，不要边收边继续开新口。',
    '11. 结果必须像能直接拍的戏：读完要能想见人物怎么站、怎么顶、怎么失手、怎么继续接下去；如果只是结构对了但演不出来，就继续改。',
    '请输出三段内容：',
    '1. Action:',
    '2. Dialogue:',
    '3. Emotion:',
    '要求：动作具体、对白有钉子句、情绪有推进；如果当前有关系施压快照，必须先把它写成动作、态度和难堪后果，不能只写成情况说明。对白一旦谁说都行，就重写到能听出人物自己的位置和口气。只要站位还停在空态度，没有护谁、顶谁、怕失去什么这些关系选择和代价，就继续重写。只要情绪还停在空词，或者只是把情绪直接说破、却没有落到嘴硬、停顿、失手、让步、反咬、压着不退这些反应和代价里，也继续重写。只要局势没有更重、关系没有改位、代价没有变实，就继续重写。只要场尾没有自然留下后续能接的动作、关系压力或新危险，也继续重写。',
    ...buildEpisodeSceneDirectives(outline, episodeNo),
    ...buildSceneProgressionDirectives({
      existingScript: input.existingScript,
      episodeNo
    }),
    '禁止写成分析报告、人物解说、分点拆解、情绪层次总结。',
    '禁止输出 ## 标题、序号小节、括号注释说明；只保留三段正文。',
    '再次强调：正文里绝对不要出现“站位”“钉子句”“关系施压”“说明如下”“总结如下”这些幕后工作词。'
  ].join('\n')
}
