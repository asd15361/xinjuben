/**
 * 本地内容存储模块
 *
 * 将剧本正文、进度板、失败历史、ledger 统一落到本地文件
 * 路径：userData/workspace/content/{userId}/{projectId}/content.json
 * 保证原子写入（先写 tmp，再 rename）
 */

import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import { writeJsonAtomic } from './project-files/write-shard'
import type { ProjectScriptShard } from './project-files/write-shard'
import type { ScriptSegmentDto } from '../../../shared/contracts/workflow'
import type {
  ScriptGenerationProgressBoardDto,
  ScriptGenerationFailureResolutionDto
} from '../../../shared/contracts/script-generation'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'

/**
 * 本地内容存储结构
 * 复用 ProjectScriptShard 的剧本相关字段
 */
export interface LocalProjectContent extends ProjectScriptShard {
  projectId: string
  userId: string
  updatedAt: string
}

/**
 * 获取内容存储根目录
 */
function getContentRoot(userId: string, projectId: string): string {
  return join(app.getPath('userData'), 'workspace', 'content', userId, projectId)
}

/**
 * 获取内容文件路径
 */
function getContentFilePath(userId: string, projectId: string): string {
  return join(getContentRoot(userId, projectId), 'content.json')
}


/**
 * 读取本地项目内容
 *
 * @returns 如果不存在则返回 null
 */
export async function readLocalContent(
  userId: string,
  projectId: string
): Promise<LocalProjectContent | null> {
  const contentPath = getContentFilePath(userId, projectId)

  try {
    const content = await readFile(contentPath, 'utf8')
    return JSON.parse(content) as LocalProjectContent
  } catch (err) {
    // 文件不存在或解析失败，返回 null
    return null
  }
}

/**
 * 读取剧本草稿
 */
export async function readScriptDraft(
  userId: string,
  projectId: string
): Promise<ScriptSegmentDto[] | null> {
  const content = await readLocalContent(userId, projectId)
  return content?.scriptDraft ?? null
}

/**
 * 读取运行时状态
 */
export async function readRuntimeState(
  userId: string,
  projectId: string
): Promise<{
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptStateLedger: ScriptStateLedgerDto | null
} | null> {
  const content = await readLocalContent(userId, projectId)
  if (!content) return null

  return {
    scriptProgressBoard: content.scriptProgressBoard,
    scriptFailureResolution: content.scriptFailureResolution,
    scriptStateLedger: content.scriptStateLedger
  }
}

/**
 * 写入本地项目内容（原子写入）
 *
 * 复用 writeJsonAtomic：先写 tmp，再 rename，失败则 copy + unlink
 */
export async function writeLocalContent(
  userId: string,
  projectId: string,
  content: Partial<LocalProjectContent>
): Promise<void> {
  const root = getContentRoot(userId, projectId)
  const contentPath = getContentFilePath(userId, projectId)

  // 确保目录存在
  await mkdir(root, { recursive: true })

  // 读取现有内容（用于合并）
  let existing: LocalProjectContent | null = null
  try {
    existing = await readLocalContent(userId, projectId)
  } catch {
    // 不存在则忽略
  }

  // 合并内容
  const now = new Date().toISOString()
  const merged: LocalProjectContent = {
    projectId,
    userId,
    scriptDraft: content.scriptDraft ?? existing?.scriptDraft ?? [],
    scriptProgressBoard: content.scriptProgressBoard ?? existing?.scriptProgressBoard ?? null,
    scriptFailureResolution:
      content.scriptFailureResolution ?? existing?.scriptFailureResolution ?? null,
    scriptRuntimeFailureHistory:
      content.scriptRuntimeFailureHistory ?? existing?.scriptRuntimeFailureHistory ?? [],
    scriptStateLedger: content.scriptStateLedger ?? existing?.scriptStateLedger ?? null,
    updatedAt: content.updatedAt ?? now
  }

  // 复用现有的原子写入工具
  await writeJsonAtomic(contentPath, merged)
}

/**
 * 保存剧本草稿
 */
export async function saveScriptDraft(
  userId: string,
  projectId: string,
  scriptDraft: ScriptSegmentDto[]
): Promise<void> {
  await writeLocalContent(userId, projectId, { scriptDraft })
}

/**
 * 保存运行时状态（进度板、失败解决、ledger）
 */
export async function saveRuntimeState(
  userId: string,
  projectId: string,
  state: {
    scriptProgressBoard?: ScriptGenerationProgressBoardDto | null
    scriptFailureResolution?: ScriptGenerationFailureResolutionDto | null
    scriptStateLedger?: ScriptStateLedgerDto | null
    scriptRuntimeFailureHistory?: string[]
  }
): Promise<void> {
  await writeLocalContent(userId, projectId, {
    scriptProgressBoard: state.scriptProgressBoard ?? null,
    scriptFailureResolution: state.scriptFailureResolution ?? null,
    scriptStateLedger: state.scriptStateLedger ?? null,
    scriptRuntimeFailureHistory: state.scriptRuntimeFailureHistory
  })
}

/**
 * 保存完整剧本生成结果（一次性写入所有内容）
 */
export async function saveScriptGenerationResult(
  userId: string,
  projectId: string,
  result: {
    scriptDraft: ScriptSegmentDto[]
    scriptProgressBoard: ScriptGenerationProgressBoardDto | null
    scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
    scriptStateLedger: ScriptStateLedgerDto | null
    scriptRuntimeFailureHistory?: string[]
  }
): Promise<void> {
  await writeLocalContent(userId, projectId, {
    scriptDraft: result.scriptDraft,
    scriptProgressBoard: result.scriptProgressBoard,
    scriptFailureResolution: result.scriptFailureResolution,
    scriptStateLedger: result.scriptStateLedger,
    scriptRuntimeFailureHistory: result.scriptRuntimeFailureHistory ?? []
  })
}

/**
 * 清理运行时状态（保留剧本正文，清空临时状态）
 */
export async function clearRuntimeState(
  userId: string,
  projectId: string
): Promise<void> {
  await writeLocalContent(userId, projectId, {
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptStateLedger: null,
    scriptRuntimeFailureHistory: []
  })
}

/**
 * 删除项目内容
 */
export async function deleteLocalContent(
  userId: string,
  projectId: string
): Promise<void> {
  const root = getContentRoot(userId, projectId)
  const { rm } = await import('fs/promises')
  await rm(root, { recursive: true, force: true })
}
