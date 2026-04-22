import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveOutlineEpisodeCount,
  extractLatestAuthoritativeEpisodeCountFromText,
  extractLatestDeclaredEpisodeCountFromText,
  extractLatestEpisodeCountFromText,
  resolveProjectEpisodeCount
} from './episode-count.ts'

test('extractLatestEpisodeCountFromText prefers latest user override', () => {
  const text = '先写10集，后来改成30集，最终就按30集做。'
  assert.equal(extractLatestEpisodeCountFromText(text), 30)
})

test('extractLatestEpisodeCountFromText returns zero when no episode count exists', () => {
  assert.equal(extractLatestEpisodeCountFromText('只改人物和冲突，不提集数。'), 0)
})

test('extractLatestDeclaredEpisodeCountFromText only trusts direct user declarations', () => {
  const text = [
    '【项目】修仙传｜10集',
    '【待确认】',
    '- 具体30集剧情曲折细节',
    '现在改了，不做10集了，要做30集。'
  ].join('\n')

  assert.equal(extractLatestDeclaredEpisodeCountFromText(text), 30)
})

test('extractLatestDeclaredEpisodeCountFromText ignores pending-confirmation counts', () => {
  const text = ['【项目】修仙传｜10集', '【待确认】', '- 具体30集剧情曲折细节'].join('\n')

  assert.equal(extractLatestDeclaredEpisodeCountFromText(text), 0)
})

test('extractLatestAuthoritativeEpisodeCountFromText respects whichever authority appears later', () => {
  const directAfterStructured = ['【项目】修仙传｜10集', '现在改了，不做10集了，要做30集。'].join(
    '\n'
  )
  const structuredAfterDirect = ['先按30集聊。', '【项目】修仙传｜10集'].join('\n')

  assert.equal(extractLatestAuthoritativeEpisodeCountFromText(directAfterStructured), 30)
  assert.equal(extractLatestAuthoritativeEpisodeCountFromText(structuredAfterDirect), 10)
})

test('resolveProjectEpisodeCount prefers confirmed brief over larger outline count', () => {
  const result = resolveProjectEpisodeCount({
    storyIntent: {
      titleHint: '项目A',
      genre: '',
      tone: '',
      audience: '',
      sellingPremise: '',
      coreDislocation: '',
      emotionalPayoff: '',
      protagonist: '',
      antagonist: '',
      coreConflict: '',
      endingDirection: '',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: [],
      manualRequirementNotes: '',
      freeChatFinalSummary: '',
      generationBriefText: '【项目】修仙传｜10集',
      confirmedChatTranscript: '用户：改成10集'
    },
    outline: {
      title: '修仙传',
      genre: '',
      theme: '',
      protagonist: '',
      mainConflict: '',
      summary: '',
      summaryEpisodes: Array.from({ length: 30 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集摘要`
      })),
      facts: []
    },
    fallbackCount: 50
  })

  assert.equal(result, 10)
})

test('resolveProjectEpisodeCount falls back in order: outline then fallbackCount', () => {
  assert.equal(
    resolveProjectEpisodeCount({
      outline: {
        title: '',
        genre: '',
        theme: '',
        protagonist: '',
        mainConflict: '',
        summary: '第1集：开场\n第2集：升级',
        summaryEpisodes: [],
        facts: []
      },
      fallbackCount: 40
    }),
    2
  )

  assert.equal(resolveProjectEpisodeCount({ fallbackCount: 24 }), 24)
})

test('deriveOutlineEpisodeCount trusts summaryEpisodes.length over summary text parsing', () => {
  // Case from E2E bug: 30-item summaryEpisodes but summary has no "第X集" markers.
  // parseEpisodeCountFromSummary returns 0, but episodes.length = 30 must win.
  const outline = {
    title: '修仙传',
    genre: '玄幻',
    theme: '隐忍反咬',
    protagonist: '黎明',
    mainConflict: '黎明被逼亮底',
    summary:
      '黎明这一段先被拖进局里：李科拿小柔逼他交出密库钥匙。推进到这一段收口前，更狠的代价已经顺着小柔追上来。', // 163 chars, no episode markers
    summaryEpisodes: Array.from({ length: 30 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集推进`
    })),
    facts: []
  }

  assert.equal(deriveOutlineEpisodeCount(outline, 10), 30)
})

test('deriveOutlineEpisodeCount returns fallback when summaryEpisodes is empty and summary has no markers', () => {
  const outline = {
    title: '修仙传',
    genre: '玄幻',
    theme: '',
    protagonist: '',
    mainConflict: '',
    summary: '这是一个没有集数标记的概要文本。',
    summaryEpisodes: [],
    facts: []
  }

  assert.equal(deriveOutlineEpisodeCount(outline, 10), 10)
})

test('deriveOutlineEpisodeCount returns fallback 10 when both summary and summaryEpisodes are absent', () => {
  const outline = {
    title: '修仙传',
    genre: '',
    theme: '',
    protagonist: '',
    mainConflict: '',
    summary: '',
    facts: []
  }

  assert.equal(deriveOutlineEpisodeCount(outline, 10), 10)
})

test('deriveOutlineEpisodeCount derives from summary text when summaryEpisodes is empty', () => {
  const outline = {
    title: '修仙传',
    genre: '',
    theme: '',
    protagonist: '',
    mainConflict: '',
    summary: '第1集：开局\n第2集：推进\n第30集：收束',
    summaryEpisodes: [],
    facts: []
  }

  assert.equal(deriveOutlineEpisodeCount(outline, 10), 30)
})
