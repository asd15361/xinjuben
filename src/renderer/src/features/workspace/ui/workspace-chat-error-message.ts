export function normalizeWorkspaceChatErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')

  const trimmed = raw.trim()
  if (!trimmed) return '未知错误'

  const remoteMethodStripped = trimmed.replace(
    /^Error invoking remote method '[^']+':\s*(?:\w*Error:\s*)?/i,
    ''
  )
  const summaryPrefixStripped = remoteMethodStripped.replace(/^summary_generation_failed:/i, '')
  const authorityFailureNormalized = summaryPrefixStripped
    .replace(/^AuthorityFailureError:\s*/i, '')
    .trim()
  const timeoutMatch = summaryPrefixStripped.match(/^ai_request_timeout:(\d+)ms$/i)

  if (timeoutMatch) {
    const seconds = Math.max(1, Math.round(Number(timeoutMatch[1]) / 1000))
    return `AI 请求超时（${seconds} 秒）`
  }

  if (/^faction_matrix_timeout:\d+ms$/i.test(summaryPrefixStripped)) {
    return '势力矩阵生成超时，请重试'
  }

  if (/^faction_matrix_generation_failed:/i.test(summaryPrefixStripped)) {
    return '势力矩阵生成失败，请重试'
  }

  if (/^faction_matrix_parse_failed:/i.test(summaryPrefixStripped)) {
    return 'AI 已返回势力矩阵，但结构不合法，系统没法继续生成人物'
  }

  if (/^character_profile_v2_generation_failed:/i.test(summaryPrefixStripped)) {
    return '人物小传生成失败，请重试'
  }

  if (/^character_profile_v2_parse_failed:/i.test(summaryPrefixStripped)) {
    return 'AI 已返回人物小传，但结构不合法，系统没法继续生成粗纲'
  }

  if (
    /AUTHORITY_FAILURE_INCOMPLETE_RESULT/i.test(authorityFailureNormalized) &&
    /character_contract_incomplete/i.test(authorityFailureNormalized)
  ) {
    return '人物结果生成出来了，但保存时被旧人物合同拦住了；请先检查主角、对手和当前人物小传是否完整'
  }

  if (/AUTHORITY_FAILURE_INCOMPLETE_RESULT/i.test(authorityFailureNormalized)) {
    return '这一步已经生成出结果，但保存时被上游合同拦住了，请回到当前页面检查必填内容'
  }

  if (/^summary_payload_parse_failed$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回内容，但结构不合法，系统没法确认这版信息'
  }

  if (/^summary_payload_incomplete$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回内容，但关键信息没收齐，系统没法确认这版信息'
  }

  if (/^confirmed_story_intent_missing$/i.test(summaryPrefixStripped)) {
    return '请先重新点一次“确认信息”，这版聊天真相还没正式锁住'
  }

  if (/^seven_questions_confirmation_required$/i.test(summaryPrefixStripped)) {
    return '先去确认七问，再继续生成粗纲和人物'
  }

  const outlineIncompleteMatch = summaryPrefixStripped.match(
    /^rough_outline_incomplete(?::([a-z_]+))?$/i
  )
  if (outlineIncompleteMatch) {
    const code = (outlineIncompleteMatch[1] || '').toLowerCase()
    if (code === 'episode_count_short') {
      return 'AI 已返回粗纲，但集数不够，系统没法确认这版粗纲'
    }
    if (code === 'episode_count_overflow' || code === 'episode_numbers_invalid') {
      return 'AI 已返回粗纲，但集号对不上，系统没法确认这版粗纲'
    }
    if (code === 'episode_summary_missing') {
      return 'AI 已返回粗纲，但有分集没写实，系统没法确认这版粗纲'
    }
    if (
      code === 'missing_title' ||
      code === 'missing_genre' ||
      code === 'missing_theme' ||
      code === 'missing_protagonist' ||
      code === 'missing_main_conflict' ||
      code === 'missing_summary'
    ) {
      return 'AI 已返回粗纲，但总纲关键信息没收齐，系统没法确认这版粗纲'
    }
    return 'AI 已返回粗纲，但结构没收完整，系统没法确认这版粗纲'
  }

  if (/^rough_outline_(overview|batch)_parse_failed$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回粗纲内容，但结构不合法，系统没法确认这版粗纲'
  }

  if (/^rough_outline_requires_confirmed_seven_questions$/i.test(summaryPrefixStripped)) {
    return '先去确认七问，再继续生成粗纲和人物'
  }

  if (/^rough_outline_result_missing$/i.test(summaryPrefixStripped)) {
    return '这次没拿到新的粗纲结果，系统还不能替换当前版本'
  }

  if (/^seven_questions_confirm_save_failed$/i.test(summaryPrefixStripped)) {
    return '这次七问没有保存住，先重新确认七问再继续'
  }

  if (/^rough_outline_overview_incomplete:act_summaries_missing$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回粗纲总纲，但四段推进没收齐，系统没法继续往下生成'
  }

  if (/^character_bundle_incomplete$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回人物结果，但关键人物没收齐，系统没法继续往下生成'
  }

  if (/^character_profile_parse_failed$/i.test(summaryPrefixStripped)) {
    return 'AI 已返回人物结果，但结构不合法，系统没法继续往下生成'
  }

  if (/^workspace_generation_aborted:/i.test(summaryPrefixStripped)) {
    return '这次生成已中断，重新发起即可'
  }

  return summaryPrefixStripped || '未知错误'
}

export function buildWorkspaceChatFailureMessage(
  prefix: '回复失败' | '确认信息失败' | '生成失败',
  error: unknown
): string {
  return `${prefix}：${normalizeWorkspaceChatErrorMessage(error)}`
}
