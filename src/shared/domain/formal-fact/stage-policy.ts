import type { OutlineDraftDto } from '../../contracts/workflow.ts'
import { getConfirmedFormalFacts } from './selectors.ts'

export interface FormalFactStageHint {
  title: string
  body: string
  confidence: 'high' | 'mid'
}

function formatFactLabels(outline: OutlineDraftDto): string {
  const labels = getConfirmedFormalFacts(outline).map((fact) => fact.label)
  return labels.length > 0 ? labels.join('、') : '当前无已确认正式事实'
}

function formatFactDescriptions(outline: OutlineDraftDto): string {
  return getConfirmedFormalFacts(outline)
    .map((fact) => `${fact.label}：${fact.description}`)
    .join('\n')
}

function buildFactSpecificPromptRules(outline: OutlineDraftDto): string[] {
  const factsText = getConfirmedFormalFacts(outline)
    .map((fact) => `${fact.label} ${fact.description}`)
    .join('\n')

  if (/(排行|第十九|第十九个徒弟|第十九徒|最小徒弟|最末位徒弟|小徒弟)/.test(factsText)) {
    return [
      '若正式事实里有“排行/第十九徒/最小徒弟”这类身份事实，至少让一次动作或对白把它真正落地：被点名、被轻视、被拿来压规矩、被挡资格或被当众羞辱；不要只在前情或人物介绍里提过。'
    ]
  }

  return []
}

export function buildCharacterStageFormalFactHints(
  outline: OutlineDraftDto
): FormalFactStageHint[] {
  const labels = formatFactLabels(outline)
  return [
    {
      title: '正式事实承载提示',
      body: `人物工序要把 ${labels} 变成“谁承载、谁施压、谁被改变”的角色结构，不能只把事实留在设定层。`,
      confidence: 'high'
    },
    {
      title: '优势短板绑定提示',
      body: '至少让一名角色的优势直接服务正式事实推进，同时让另一名角色的短板成为正式事实被施压的入口。',
      confidence: 'mid'
    }
  ]
}

export function buildDetailedOutlineFormalFactHints(
  outline: OutlineDraftDto
): FormalFactStageHint[] {
  const labels = formatFactLabels(outline)
  return [
    {
      title: '正式事实升格提示',
      body: `详纲工序要让 ${labels} 在开局、中段、高潮中持续变形升级，不能只在某一段被提到一次。`,
      confidence: 'high'
    },
    {
      title: '推进链落点提示',
      body: '每个大段至少安排一次“冲突升级 -> 有效动作 -> 情感变化 -> 正式事实升格”的闭环，不要让正式事实悬空。',
      confidence: 'mid'
    }
  ]
}

export function buildScriptStageFormalFactHints(outline: OutlineDraftDto): FormalFactStageHint[] {
  const labels = formatFactLabels(outline)
  return [
    {
      title: '台词动作锚点提示',
      body: `剧本场景要让 ${labels} 进入动作、对白和情绪，不要把正式事实只写成旁白解释。`,
      confidence: 'high'
    },
    {
      title: '禁止补定义提示',
      body: '如果场景需要更强张力，优先让已确认正式事实继续升格，而不是在下游新发明一个更大的真相。',
      confidence: 'mid'
    }
  ]
}

export function buildFormalFactPromptBlock(input: {
  outline: OutlineDraftDto
  episodeNo?: number
  totalEpisodes?: number
  mode: 'script_generation' | 'script_repair'
}): string {
  const facts = getConfirmedFormalFacts(input.outline)
  const factSpecificRules = buildFactSpecificPromptRules(input.outline)
  if (facts.length === 0) {
    return '【正式事实约束】\n- 当前没有已确认正式事实，禁止你自行发明新的核心真相。'
  }

  const hasFinalPressure =
    typeof input.episodeNo === 'number' &&
    typeof input.totalEpisodes === 'number' &&
    input.episodeNo >= Math.max(3, input.totalEpisodes - 1)
  const stageRule =
    input.mode === 'script_repair'
      ? '修补时只能加强这些已确认正式事实的落地、升格和承接，不得新增新的核心真相。'
      : hasFinalPressure
        ? '当前已进入后段关键集，要让正式事实朝主题兑现、代价落地或真相揭示继续推进。'
        : '当前场必须让至少一个正式事实通过冲突、动作或情感发生可见推进。'

  return [
    '【正式事实约束】',
    `- 已确认正式事实：${facts.map((fact) => fact.label).join('、')}`,
    stageRule,
    '- 只能围绕这些已确认正式事实写场景，不得偷换名称、偷换本体、偷补新真相。',
    '- 优先把正式事实写进可拍动作、可复述对白和能推动关系变化的情绪节点。',
    ...factSpecificRules,
    `- 事实清单：\n${formatFactDescriptions(input.outline)}`
  ].join('\n')
}
