import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function parseSceneBlocks(screenplay) {
  const lines = normalizeText(screenplay)
    .split('\n')
    .map((line) => line.trim())
  const scenes = []
  let current = null

  for (const line of lines) {
    if (!line) continue
    if (/^第[一二三四五六七八九十百零\d]+集$/.test(line)) continue
    if (/^\d+\-\d+\s*(日|夜)(内|外|内外)?/.test(line)) {
      if (current) scenes.push(current)
      current = { heading: line, lines: [] }
      continue
    }
    if (current) current.lines.push(line)
  }

  if (current) scenes.push(current)
  return scenes
}

function inspectEpisode(scene) {
  const screenplay = normalizeText(scene?.screenplay)
  const blocks = parseSceneBlocks(screenplay)
  const charCount = screenplay.replace(/\s+/g, '').length
  const issues = []
  const legacyText = normalizeText(
    [scene?.action || '', scene?.dialogue || '', scene?.emotion || ''].join('\n')
  )

  if (!screenplay && legacyText) issues.push('旧格式待重写')

  if (!/^第[一二三四五六七八九十百零\d]+集/m.test(screenplay)) issues.push('缺少第X集标题')
  if (/Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay)) issues.push('残留旧三段稿标记')
if (blocks.length < 2 || blocks.length > 4) issues.push(`场次数不在2-4场:${blocks.length}`)
if (charCount < 800) issues.push(`字数低于800字合同:${charCount}`)
if (charCount > 1200) issues.push(`字数超过1200字合同:${charCount}`)

  for (const block of blocks) {
    if (!block.lines.some((line) => /^人物[：:]/.test(line)))
      issues.push(`${block.heading} 缺少人物表`)
    if (!block.lines.some((line) => line.startsWith('△')))
      issues.push(`${block.heading} 缺少动作行`)
    if (block.lines.filter((line) => /^[^\s△：:（）()]{1,16}[：:]/.test(line)).length < 2) {
      issues.push(`${block.heading} 对白不足`)
    }
  }

  return {
    sceneNo: scene?.sceneNo || null,
    charCount,
    sceneCount: blocks.length,
    pass: issues.length === 0,
    issues
  }
}

async function main() {
  const target = process.argv[2]
  if (!target) {
    throw new Error('用法：node 测试/剧本/validate-screenplay-output.mjs <projects.json>')
  }

  const raw = await fs.readFile(path.resolve(target), 'utf8')
  const data = JSON.parse(raw)
  const project = Object.values(data.projects || {})[0] || null
  const scriptDraft = project?.scriptDraft || []
  const episodes = scriptDraft.map(inspectEpisode)
  const failed = episodes.filter((item) => !item.pass)

  console.log(
    JSON.stringify(
      {
        projectName: project?.name || '',
        totalEpisodes: episodes.length,
        passedEpisodes: episodes.length - failed.length,
        failedEpisodes: failed.length,
        failed
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
