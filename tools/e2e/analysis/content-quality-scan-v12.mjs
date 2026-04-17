/**
 * tools/e2e/analysis/content-quality-scan-v12.mjs
 *
 * 扫描第11-30集内容质量，生成质量报告。
 *
 * 用法：node tools/e2e/analysis/content-quality-scan-v12.mjs
 *
 * 输出：
 * - tools/e2e/out/content-quality-scan-v12-report.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')
const OUT_DIR = join(ROOT, 'tools', 'e2e', 'out')
const REPORT_PATH = join(OUT_DIR, 'content-quality-scan-v12-report.json')

// 动态导入 ts 文件需要 tsx 或 ts-node
// 直接用 JSON 结果做分析
const scriptPath = join(ROOT, 'tools', 'e2e', 'out', 'userdata-v11-30ep-mnh8rg9x', 'workspace', 'projects', 'project_mnd9a9j7', 'script.json')

console.log('读取剧本数据...')
const scriptData = JSON.parse(readFileSync(scriptPath, 'utf-8'))
const episodes = scriptData.scriptDraft

console.log(`共 ${episodes.length} 集`)

// 6种已知循环模式
const KNOWN_LOOP_PATTERNS = [
  {
    id: 'throwFakeKey',
    label: '扔假钥循环',
    keywords: ['假钥', '假钥匙', '将假钥', '将钥匙扔进', '反手将钥匙扔', '把假钥扔'],
    verifiedKw: ['扔掉', '抛出', '掷出', '丢弃']
  },
  {
    id: 'xiaRouBleeding',
    label: '小柔流血循环',
    keywords: ['小柔', '袖口', '血迹', '渗血', '暗器', '伤口'],
    verifiedKw: ['捂伤口', '强忍', '踉跄', '小柔脸色惨白']
  },
  {
    id: 'gangsterScoldWaste',
    label: '喽啰骂废物循环',
    keywords: ['废物', '没用', '蠢货', '饭桶', '连个女人'],
    verifiedKw: ['废物', '没用', '蠢货']
  },
  {
    id: 'liKeFaceDark',
    label: '李科铁青脸循环',
    keywords: ['铁青脸', '脸色铁青', '脸色骤变', '李科愣在'],
    verifiedKw: ['铁青脸', '愣在', '脸色骤变']
  },
  {
    id: 'fakeSealMap',
    label: '假阵图循环',
    keywords: ['假阵图', '真阵图', '地砖浮现', '用假阵图'],
    verifiedKw: ['阵图', '调包']
  },
  {
    id: 'yiChengYangQuestion',
    label: '李诚阳质问循环',
    keywords: ['最小徒弟', '为何私闯', '按排行', '钥匙必须'],
    verifiedKw: ['没资格', '先跪下', '没资格碰']
  }
]

function countChars(text) {
  return (text || '').replace(/\s+/g, '').length
}

function detectLoops(screenplay) {
  const lines = (screenplay || '').split('\n')
  const detections = []

  for (const pattern of KNOWN_LOOP_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const hasTrigger = pattern.keywords.some(kw => line.includes(kw))
      if (!hasTrigger) continue
      const isRealLoop = pattern.verifiedKw.some(kw => line.includes(kw))
      detections.push({
        patternId: pattern.id,
        patternLabel: pattern.label,
        sceneNo: null,
        triggerLineIndex: i,
        triggerLineText: line.slice(0, 80),
        isRealLoop,
        loopLevel: isRealLoop ? 'repeat' : null
      })
      break // 每模式只报一次
    }
  }
  return detections
}

function computeThemeAnchoring(screenplay) {
  const themeKeywords = ['谦卦', '谦', '不争', '空无一物', '放手', '退让', '不必争', '不求', '不强求']
  const hasKeyword = themeKeywords.some(kw => (screenplay || '').includes(kw))
  if (hasKeyword) return 80
  // 等价场景
  const equivPatterns = ['选择不打开', '不追究', '不打开']
  const hasEquiv = equivPatterns.some(p => (screenplay || '').includes(p))
  if (hasEquiv) return 60
  // 空宝暗示
  if (/空无一物|秘宝.*空/.test(screenplay || '')) return 50
  return 0
}

function computePlotNovelty(screenplay, prevScreenplays = []) {
  if (!prevScreenplays.length) return 80
  const history = prevScreenplays.slice(-3).join(' ')

  const newCharPatterns = /执事弟子|账房|老医师|医童|残党头目/
  const newChars = newCharPatterns.test(screenplay || '') && !newCharPatterns.test(history)

  const newDevicePatterns = /账册|封印图|血渍|暗号|伤药瓶|羊皮图|阵石|密钥/
  const currDevices = ((screenplay || '').match(newDevicePatterns) || [])
  const prevDevices = (history.match(newDevicePatterns) || [])
  const uniqueDevices = currDevices.filter(d => !prevDevices.includes(d))

  const newLocationPatterns = /密道|暗巷|侧窗|旧巢|山林|医庐|货栈/
  const currLocs = ((screenplay || '').match(newLocationPatterns) || [])
  const prevLocs = (history.match(newLocationPatterns) || [])
  const uniqueLocs = currLocs.filter(l => !prevLocs.includes(l))

  const score = (newChars ? 30 : 0) + uniqueDevices.length * 10 + uniqueLocs.length * 10
  return Math.min(100, 20 + score)
}

function computeCharacterArc(screenplay, protagonistName, antagonistName, supportingName) {
  const arcs = []
  for (const name of [protagonistName, antagonistName, supportingName]) {
    const dialogue = findDialogue((screenplay || ''), name)
    const text = dialogue.join(' ')

    let status = 'stagnant'
    let description = ''

    if (name === protagonistName) {
      const newMoves = ['调包', '反手', '抢先', '递出', '攥紧'].filter(m => text.includes(m))
      const passiveMoves = ['藏', '跪下', '转身', '扔'].filter(m => text.includes(m))
      if (newMoves.length > passiveMoves.length && newMoves.length >= 2) {
        status = 'advanced'
        description = `主动反制：${newMoves.join('、')}`
      } else if (passiveMoves.length > 3) {
        status = 'stagnant'
        description = `只有被动躲藏：${passiveMoves.join('、')}`
      } else {
        description = '弧线无明显推进'
      }
    } else if (name === supportingName) {
      const activeMoves = ['拍在', '偷', '扔进', '冲出'].filter(m => text.includes(m))
      const passiveMoves = ['挣扎', '脸色惨白', '声音发抖', '伤口'].filter(m => text.includes(m))
      if (activeMoves.length >= 1) {
        status = 'advanced'
        description = `主动动作：${activeMoves.join('、')}`
      } else if (passiveMoves.length >= 3) {
        status = 'regressed'
        description = `只有被动受害：${passiveMoves.join('、')}`
      } else {
        description = '弧线无明显推进'
      }
    } else if (name === antagonistName) {
      const defeatMarkers = ['铁青脸', '愣在', '废物', '脸色铁青'].filter(m => text.includes(m))
      const threatMarkers = ['逼近', '狞笑', '逼', '反咬'].filter(m => text.includes(m))
      if (defeatMarkers.length >= 2) {
        status = 'regressed'
        description = `持续被打脸：${defeatMarkers.join('、')}`
      } else if (threatMarkers.length >= 2) {
        status = 'advanced'
        description = `仍有威胁性施压：${threatMarkers.join('、')}`
      } else {
        description = '对抗性动作不明显'
      }
    }

    arcs.push({ characterName: name, status, description, evidence: dialogue.slice(0, 3) })
  }
  return arcs
}

function findDialogue(text, name) {
  const lines = text.split('\n')
  const result = []
  let capturing = false
  let current = ''

  for (const line of lines) {
    if (line.includes(`${name}：`) || line.includes(`${name}（`)) {
      capturing = true
      current = line
    } else if (capturing) {
      if (/^[△人物：]/.test(line.trim()) || line.match(/^[【A-Z]/) || line.trim() === '') {
        capturing = false
        if (current) result.push(current)
        current = ''
      } else {
        current += '\n' + line
      }
    }
  }
  if (current) result.push(current)
  return result
}

function buildRepairRecommendations(loops, arcs, themeScore, noveltyScore) {
  const recs = []

  const realLoops = loops.filter(l => l.isRealLoop)
  if (realLoops.length >= 2) {
    recs.push({
      type: 'continuity',
      priority: realLoops.length >= 3 ? 'high' : 'medium',
      reason: `检测到${realLoops.length}个真实循环：${realLoops.map(l => l.patternLabel).join('、')}`,
      targetCharacters: undefined
    })
  }

  for (const arc of arcs) {
    if (arc.status === 'stagnant' || arc.status === 'regressed') {
      recs.push({
        type: 'character_arc',
        priority: arc.status === 'regressed' ? 'high' : 'medium',
        reason: `${arc.characterName}（${arc.status}）：${arc.description}`,
        targetCharacters: [arc.characterName]
      })
    }
  }

  if (themeScore < 40) {
    recs.push({
      type: 'theme_anchor',
      priority: 'medium',
      reason: `主题锚定不足（${themeScore}分）`,
      targetCharacters: undefined
    })
  }

  return recs
}

// 扫描
const PROTAGONIST = '黎明'
const ANTAGONIST = '李科'
const SUPPORTING = '小柔'

const prevScreenplays = []
const results = []

for (const ep of episodes) {
  const screenplay = ep.screenplay || ''
  const sceneNo = ep.sceneNo

  if (sceneNo < 1 || sceneNo > 30) continue

  const loops = detectLoops(screenplay)
  const realLoops = loops.filter(l => l.isRealLoop)
  const themeScore = computeThemeAnchoring(screenplay)
  const noveltyScore = computePlotNovelty(screenplay, prevScreenplays)
  const arcs = computeCharacterArc(screenplay, PROTAGONIST, ANTAGONIST, SUPPORTING)

  const stalledRegressed = arcs.filter(a => a.status === 'stagnant' || a.status === 'regressed').length
  const arcScore = Math.max(0, 100 - stalledRegressed * 20)
  const loopPenalty = realLoops.length * 15

  const overallScore = Math.max(0, Math.round(
    themeScore * 0.30 +
    noveltyScore * 0.30 +
    arcScore * 0.25 -
    loopPenalty * 0.15
  ))

  const recs = buildRepairRecommendations(loops, arcs, themeScore, noveltyScore)

  results.push({
    sceneNo,
    charCount: countChars(screenplay),
    loopsDetected: loops.length,
    realLoops: realLoops.length,
    loopDetails: loops.map(l => ({ id: l.patternId, label: l.patternLabel, isRealLoop: l.isRealLoop })),
    themeAnchoringScore: themeScore,
    plotNoveltyScore: noveltyScore,
    characterArcs: arcs,
    overallScore,
    repairRecommendations: recs
  })

  prevScreenplays.push(screenplay)
}

// 统计
const ep11to30 = results.filter(r => r.sceneNo >= 11 && r.sceneNo <= 30)
const avgScore = Math.round(ep11to30.reduce((s, r) => s + r.overallScore, 0) / ep11to30.length)
const totalLoops = ep11to30.reduce((s, r) => s + r.realLoops, 0)
const lowScore = ep11to30.filter(r => r.overallScore < 60)
const stagnated = ep11to30.filter(r => r.characterArcs.some(a => a.status === 'stagnant'))
const themeProblem = ep11to30.filter(r => r.themeAnchoringScore < 40)

console.log('\n========== 内容质量扫描报告 ==========')
console.log(`扫描范围：第1-30集（共${results.length}集）`)
console.log(`第11-30集平均分：${avgScore}/100`)
console.log(`第11-30集真实循环总数：${totalLoops}`)
console.log(`低分区（<60分）：${lowScore.length}集`)
console.log(`人物停滞区：${stagnated.length}集`)
console.log(`主题未落地区：${themeProblem.length}集`)

console.log('\n--- 第11-30集详细 ---')
for (const r of ep11to30) {
  const flag = r.overallScore < 60 ? '⚠️' : '✅'
  const recs = r.repairRecommendations.map(r => `${r.type}(${r.priority})`).join(', ') || '无'
  console.log(`${flag} 第${r.sceneNo}集 | 分数:${r.overallScore} | 字数:${r.charCount} | 循环:${r.realLoops} | 主题:${r.themeAnchoringScore} | 弧线:${r.characterArcs.map(a => `${a.characterName}:${a.status}`).join(', ')} | 建议:${recs}`)
}

// 写入报告
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(REPORT_PATH, JSON.stringify({
  scanDate: new Date().toISOString(),
  summary: {
    totalEpisodes: results.length,
    ep11to30Average: avgScore,
    ep11to30TotalRealLoops: totalLoops,
    lowScoreCount: lowScore.length,
    stagnatedCount: stagnated.length,
    themeProblemCount: themeProblem.length
  },
  episodes: results
}, null, 2), 'utf-8')

console.log(`\n报告已写入：${REPORT_PATH}`)
