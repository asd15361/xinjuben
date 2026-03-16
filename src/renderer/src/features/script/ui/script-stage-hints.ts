import type { Hint } from '../../../components/WorkspaceCommons'

export const SCRIPT_HINTS: Hint[] = [
  {
    type: 'market',
    title: '台词"钉子句"设计',
    body: '每场关键戏必须有1句"钉子句"——即观众划完就想截图发朋友圈的台词。钉子句应直接命中正式事实的核心矛盾，让人记住角色的同时记住事件。',
    confidence: 'high'
  },
  {
    type: 'market',
    title: '镜头动作赋能',
    body: '剧本中的动作描写应具象化：不要"她很愤怒"，要"她把文件摔在桌上，却始终没有抬头"。具体动作能让拍摄导演直接还原情感，不需再发挥。',
    confidence: 'high'
  },
  {
    type: 'logic',
    title: '情感闭环提示',
    body: '每场戏结束时主角的情感状态应与开场时不同。如果开场是"恐惧"，结束应该是"决意"。静态情感的场景是推进链断点，需要优化。',
    confidence: 'mid'
  }
]
