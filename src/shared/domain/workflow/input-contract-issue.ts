import type { InputContractIssueDto } from '../../contracts/input-contract'

export interface InputContractIssueDisplayDto {
  title: string
  detail: string
  stage: 'outline' | 'character' | 'detailed_outline' | 'script'
  actionLabel: string
}

function resolveIssueDisplay(
  code: string,
  message: string
): InputContractIssueDisplayDto | undefined {
  if (code === 'detailed_outline_character_missing') {
    return {
      title: '还不能直接进入详细大纲',
      detail: '人物页还是空的，先补出关键人物，再来排这一版详细大纲。',
      stage: 'character',
      actionLabel: '先去人物页'
    }
  }
  if (code === 'detailed_outline_character_contract_weak') {
    return {
      title: '还不能直接生成详细大纲',
      detail: '先把主角、对手和当前人物的姓名、小传、目标、优势、短板和弧光补齐，再往下走。',
      stage: 'character',
      actionLabel: '回人物页补齐'
    }
  }
  if (code === 'character_contract_incomplete') {
    return {
      title: '人物小传还没写完整',
      detail: '先把主角、对手和当前人物的姓名、小传、目标、优势、短板和弧光补齐，再继续往下走。',
      stage: 'character',
      actionLabel: '回人物页补齐'
    }
  }
  if (code === 'detailed_outline_anchor_roster_missing') {
    return {
      title: '还不能直接生成详细大纲',
      detail: '人物名册还没把关键关系接住，先回人物页补齐再来生成详细大纲。',
      stage: 'character',
      actionLabel: '回人物页补齐'
    }
  }
  if (code === 'script_segment_missing' || code === 'script_segment_structure_weak') {
    return {
      title: '现在还不能直接生成剧本',
      detail: '当前详细大纲还不够完整，先把这一版详细大纲补齐，再开始写剧本。',
      stage: 'detailed_outline',
      actionLabel: '回详细大纲'
    }
  }
  if (code === 'script_character_missing') {
    return {
      title: '现在还不能直接生成剧本',
      detail: '关键人物还没准备好，先回人物页补齐，再开始写剧本。',
      stage: 'character',
      actionLabel: '回人物页补齐'
    }
  }
  if (code === 'script_anchor_roster_missing' || code === 'script_heroine_anchor_missing') {
    return {
      title: '现在还不能直接生成剧本',
      detail: '角色关系和主线推进还没完全对上，先回人物页或详细大纲页补齐。',
      stage: 'detailed_outline',
      actionLabel: '回详细大纲'
    }
  }

  return message
    ? {
        title: '现在还不能继续这一页',
        detail: message,
        stage: 'outline',
        actionLabel: '回上一页检查'
      }
    : undefined
}

export function createInputContractIssue(
  code: string,
  message: string
): InputContractIssueDto & { display?: InputContractIssueDisplayDto } {
  return {
    code,
    message,
    display: resolveIssueDisplay(code, message)
  }
}
