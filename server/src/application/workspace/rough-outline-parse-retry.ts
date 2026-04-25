export function isLikelyTruncatedJsonResponse(text: string): boolean {
  const normalized = String(text || '').trim()
  if (!normalized) return false
  const openBraceCount = (normalized.match(/{/g) || []).length
  const closeBraceCount = (normalized.match(/}/g) || []).length
  return openBraceCount > closeBraceCount || /[,:[\s]+$/.test(normalized)
}

export function buildRoughOutlineParseRetryPrompt(originalPrompt: string): string {
  return [
    '你是短剧编剧助手。上一版 JSON 没写完就被截断了。',
    '这次只输出最小必要 JSON，不要任何解释、不要 markdown、不要 ```json。',
    '最后一个字符必须是 `}`。',
    '只输出这个结构，所有字段值都控制在 1 句以内：',
    '{',
    '  "outline": {',
    '    "title": "string",',
    '    "genre": "string",',
    '    "theme": "string",',
    '    "protagonist": "string",',
    '    "mainConflict": "string",',
    '    "summary": "整季总述，3句以内",',
    '    "facts": [{"label": "string", "description": "1句", "level": "core", "linkedToPlot": true, "linkedToTheme": false}],',
    '    "actSummaries": [',
    '      {"act": "opening", "summary": "1句"},',
    '      {"act": "midpoint", "summary": "1句"},',
    '      {"act": "climax", "summary": "1句"},',
    '      {"act": "ending", "summary": "1句"}',
    '    ]',
    '  }',
    '}',
    'facts 只保留 4 条以内。每条 description 只写 1 句。',
    '',
    '项目上下文（供你填充内容用）：',
    originalPrompt
  ].join('\n')
}

export function buildRoughOutlineBatchParseRetryPrompt(originalPrompt: string): string {
  return [
    '你是短剧编剧助手。上一版分集 JSON 没写完就被截断了。',
    '这次只输出最小必要 JSON，不要任何解释、不要 markdown、不要 ```json。',
    '最后一个字符必须是 `}`。',
    '只输出这个结构，每集 summary 只写 1 句：',
    '{',
    '  "batchSummary": "当前批次总述，1句",',
    '  "episodes": [',
    '    {"episodeNo": 1, "summary": "1句"},',
    '    {"episodeNo": 2, "summary": "1句"}',
    '  ]',
    '}',
    'episodeNo 必须严格遵守项目上下文里的当前批次范围；不能缺集、不能多集、不能重复集号。',
    '',
    '项目上下文（供你填充内容用）：',
    originalPrompt
  ].join('\n')
}
