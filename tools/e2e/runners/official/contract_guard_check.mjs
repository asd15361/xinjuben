/**
 * 合同守卫脚本 - 稳定产出问题总收口计划 阶段8
 *
 * 验证以下关键合同点不被悄悄改回去：
 * 1. CharacterDraftDto 保持当前正式合同字段集合
 * 2. 当前人物入口仍走 parseCharacterBundleText + 下游规范化，而不是回退到旧 hasUsableCharacterDraft 假设
 * 3. buildCharacterGenerationPrompt JSON schema 用小写键名
 * 4. buildCharacterGenerationPrompt 不含"可写空字符串"说法（人物字段）
 *
 * 运行方式：
 *   node tools/e2e/runners/official/contract_guard_check.mjs
 *
 * 退出码：
 *   0 = 全部通过
 *   1 = 至少一项检查失败
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

const REQUIRED_DTO_FIELDS = [
  'masterEntityId',
  'name',
  'biography',
  'publicMask',
  'hiddenPressure',
  'fear',
  'protectTarget',
  'conflictTrigger',
  'advantage',
  'weakness',
  'goal',
  'arc',
  'roleLayer',
  'activeBlockNos'
]

const REQUIRED_PROMPT_FIELDS = [
  'name',
  'biography',
  'publicMask',
  'hiddenPressure',
  'fear',
  'protectTarget',
  'conflictTrigger',
  'advantage',
  'weakness',
  'goal',
  'arc',
  'roleLayer',
  'activeBlockNos'
]

function hasReturnedCharacterField(parseSrc, field) {
  if (field === 'name') {
    return /return\s*{[^}]*\bname\b[^}]*}/s.test(parseSrc)
  }

  return parseSrc.includes(`${field}:`)
}

let exitCode = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`)
    exitCode = 1
  }
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

console.log('\n=== 合同守卫检查 ===\n')

// 1. CharacterDraftDto 当前正式合同字段集合
check('CharacterDraftDto 保持当前正式合同字段集合', () => {
  const src = readFile('src/shared/contracts/workflow.ts')
  const match = src.match(/export interface CharacterDraftDto\s*{([^}]+)}/s)
  if (!match) throw new Error('找不到 CharacterDraftDto 定义')
  const fields = [...match[1].matchAll(/^\s*(\w+)\??:\s*/gm)].map((m) => m[1])
  const missing = REQUIRED_DTO_FIELDS.filter((f) => !fields.includes(f))
  const extra = fields.filter((f) => !REQUIRED_DTO_FIELDS.includes(f))
  if (missing.length > 0) throw new Error(`缺少字段: ${missing.join(', ')}`)
  if (extra.length > 0) throw new Error(`多余字段: ${extra.join(', ')}`)
  if (fields.length !== REQUIRED_DTO_FIELDS.length)
    throw new Error(`字段数应为 ${REQUIRED_DTO_FIELDS.length}，实际 ${fields.length}`)
})

// 2. 当前人物入口仍走 parseCharacterBundleText + 下游规范化
check('当前人物入口仍走 parseCharacterBundleText + 下游规范化', () => {
  const supportSrc = readFile(
    'src/main/application/workspace/generate-outline-and-characters-support.ts'
  )
  const parseSrc = readFile('src/main/application/workspace/parse-character-bundle.ts')
  const generateSrc = readFile('src/main/application/workspace/generate-outline-and-characters.ts')

  if (/hasUsableCharacterDraft/.test(generateSrc)) {
    throw new Error('发现旧 hasUsableCharacterDraft 痕迹，正式入口不应再依赖该旧验收门')
  }

  if (!supportSrc.includes('return parseCharacterBundleText(result.text)')) {
    throw new Error('generateCharacterBundle 未通过 parseCharacterBundleText 作为正式人物入口')
  }

  const parseFields = REQUIRED_PROMPT_FIELDS.filter((field) =>
    hasReturnedCharacterField(parseSrc, field)
  )
  const missingParseFields = REQUIRED_PROMPT_FIELDS.filter((field) => !parseFields.includes(field))
  if (missingParseFields.length > 0) {
    throw new Error(`parseCharacterBundleText 未覆盖字段: ${missingParseFields.join(', ')}`)
  }

  if (!generateSrc.includes("roleLayer: character.roleLayer || 'core'")) {
    throw new Error('generate-outline-and-characters 缺少 roleLayer 默认归一化')
  }

  if (!generateSrc.includes('character.activeBlockNos && character.activeBlockNos.length > 0')) {
    throw new Error('generate-outline-and-characters 缺少 activeBlockNos 正式归一化')
  }
})

// 3. 提示词 JSON schema 用小写键名（不是 Name/Biography/Goal...）
check('buildCharacterGenerationPrompt JSON schema 用小写键名', () => {
  const src = readFile('src/main/application/workspace/generation-stage-prompts.ts')
  const schemaMatch = src.match(/"characters":\s*\[\s*{[^}]+}/s)
  if (!schemaMatch) throw new Error('找不到 characters JSON schema')
  const schema = schemaMatch[0]
  const hasUppercase =
    /"Name"|"Biography"|"Goal"|"ProtectTarget"|"Weakness"|"PublicMask"|"HiddenPressure"|"Fear"|"Advantage"|"Arc"/.test(
      schema
    )
  if (hasUppercase) throw new Error(`schema 包含大写键名，当前值: ${schema}`)
  if (!schema.includes('"name"')) throw new Error('schema 缺少 "name" 键')
})

// 4. 人物小传字段不允许"可写空字符串"说法
check('人物小传字段不允许"可写空字符串"说法', () => {
  const src = readFile('src/main/application/workspace/generation-stage-prompts.ts')
  const lines = src.split('\n')
  const badLines = lines.filter((line) => {
    if (line.trim().startsWith('//')) return false
    const hasEmptyString = line.includes('空字符串')
    const hasPermission = /可以\s*写|允许\s*写|可写/.test(line)
    if (!hasEmptyString || !hasPermission) return false
    // outline 的 title/theme 单独处理，排除
    if (line.includes('title（剧名）') || line.includes('theme（主题）')) return false
    return true
  })
  if (badLines.length > 0) throw new Error(`发现以下违规行:\n${badLines.join('\n')}`)
})

console.log('\n=== 检查结果 ===')
if (exitCode === 0) {
  console.log('全部通过，合同未被悄悄改回。')
} else {
  console.error('有检查项失败，请修复后再提交。')
}

process.exit(exitCode)
