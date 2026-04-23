import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'
import { isCharacterStageReady } from '../../../../shared/domain/workflow/character-contract.ts'
import {
  apiSaveChatMessages,
  apiSaveOutlineDraft,
  apiSaveCharacterDrafts,
  apiSaveDetailedOutlineSegments
} from '../../services/api-client.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

export function useProjectStagePersistence(): void {
  const projectId = useWorkflowStore((s) => s.projectId)
  const chatMessages = useWorkflowStore((s) => s.chatMessages)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const setGenerationNotice = useWorkflowStore((s) => s.setGenerationNotice)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)

  const lastOutlineRef = useRef('')
  const lastChatMessagesRef = useRef('')
  const lastCharactersRef = useRef('')
  const lastSegmentsRef = useRef('')
  const lastScriptRef = useRef('')

  useEffect(() => {
    if (!projectId) {
      lastChatMessagesRef.current = ''
      lastOutlineRef.current = ''
      lastCharactersRef.current = ''
      lastSegmentsRef.current = ''
      lastScriptRef.current = ''
      return
    }

    // 项目刚被打开时先对齐当前草稿，避免初始自动保存把旧状态覆盖回去。
    lastChatMessagesRef.current = JSON.stringify(chatMessages)
    lastOutlineRef.current = JSON.stringify(outline)
    lastCharactersRef.current = JSON.stringify(characters)
    lastSegmentsRef.current = JSON.stringify(segments)
    lastScriptRef.current = JSON.stringify(script)
  }, [characters, chatMessages, outline, projectId, script, segments])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(chatMessages)
    if (payload === lastChatMessagesRef.current) return

    const timer = window.setTimeout(() => {
      lastChatMessagesRef.current = payload
      void apiSaveChatMessages({ projectId, chatMessages })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [chatMessages, projectId])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(outline)
    if (payload === lastOutlineRef.current) return

    const timer = window.setTimeout(() => {
      lastOutlineRef.current = payload
      void apiSaveOutlineDraft({ projectId, outlineDraft: outline })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [outline, projectId])

  useEffect(() => {
    if (!projectId) return
    if (
      !isCharacterStageReady({
        outline,
        characters,
        storyIntent
      })
    )
      return
    const payload = JSON.stringify(characters)
    if (payload === lastCharactersRef.current) return

    const timer = window.setTimeout(() => {
      lastCharactersRef.current = payload
      void apiSaveCharacterDrafts({ projectId, characterDrafts: characters }).catch(
        (error: unknown) => {
          console.warn('[stage-persistence] apiSaveCharacterDrafts rejected', error)
        }
      )
    }, 400)

    return () => window.clearTimeout(timer)
  }, [characters, outline, projectId, storyIntent])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(segments)
    if (payload === lastSegmentsRef.current) return

    const timer = window.setTimeout(() => {
      lastSegmentsRef.current = payload
      void apiSaveDetailedOutlineSegments({ projectId, detailedOutlineSegments: segments })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [projectId, segments])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(script)
    if (payload === lastScriptRef.current) return

    const timer = window.setTimeout(() => {
      lastScriptRef.current = payload
      const userId = useAuthStore.getState().user?.id
      if (!userId) return
      void window.api.workspace
        .saveScriptDraft(userId, projectId, script)
        .catch((error: unknown) => {
          console.error('[stage-persistence] saveScriptDraft failed', error)
          setGenerationNotice({
            kind: 'error',
            title: '剧本草稿保存失败',
            detail:
              '本地自动保存剧本草稿时出错，修改可能丢失。请勿刷新页面，可尝试手动保存。'
          })
        })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [projectId, script])
}
