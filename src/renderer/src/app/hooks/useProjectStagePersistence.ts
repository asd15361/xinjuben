import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useStageStore } from '../../store/useStageStore'

export function useProjectStagePersistence() {
  const projectId = useWorkflowStore((s) => s.projectId)
  const chatMessages = useWorkflowStore((s) => s.chatMessages)
  const generationStatus = useWorkflowStore((s) => s.generationStatus)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)

  const lastOutlineRef = useRef('')
  const lastChatMessagesRef = useRef('')
  const lastGenerationStatusRef = useRef('')
  const lastCharactersRef = useRef('')
  const lastSegmentsRef = useRef('')
  const lastScriptRef = useRef('')

  useEffect(() => {
    if (!projectId) {
      lastChatMessagesRef.current = ''
      lastGenerationStatusRef.current = ''
      lastOutlineRef.current = ''
      lastCharactersRef.current = ''
      lastSegmentsRef.current = ''
      lastScriptRef.current = ''
      return
    }

    // 项目刚被打开时先对齐当前草稿，避免初始自动保存把旧状态覆盖回去。
    lastChatMessagesRef.current = JSON.stringify(chatMessages)
    lastGenerationStatusRef.current = JSON.stringify(generationStatus)
    lastOutlineRef.current = JSON.stringify(outline)
    lastCharactersRef.current = JSON.stringify(characters)
    lastSegmentsRef.current = JSON.stringify(segments)
    lastScriptRef.current = JSON.stringify(script)
  }, [characters, chatMessages, generationStatus, outline, projectId, script, segments])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(chatMessages)
    if (payload === lastChatMessagesRef.current) return

    const timer = window.setTimeout(() => {
      lastChatMessagesRef.current = payload
      void window.api.workspace.saveChatMessages({ projectId, chatMessages })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [chatMessages, projectId])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(generationStatus)
    if (payload === lastGenerationStatusRef.current) return

    const timer = window.setTimeout(() => {
      lastGenerationStatusRef.current = payload
      void window.api.workspace.saveGenerationStatus({ projectId, generationStatus })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [generationStatus, projectId])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(outline)
    if (payload === lastOutlineRef.current) return

    const timer = window.setTimeout(() => {
      lastOutlineRef.current = payload
      void window.api.workspace.saveOutlineDraft({ projectId, outlineDraft: outline })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [outline, projectId])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(characters)
    if (payload === lastCharactersRef.current) return

    const timer = window.setTimeout(() => {
      lastCharactersRef.current = payload
      void window.api.workspace.saveCharacterDrafts({ projectId, characterDrafts: characters })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [characters, projectId])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(segments)
    if (payload === lastSegmentsRef.current) return

    const timer = window.setTimeout(() => {
      lastSegmentsRef.current = payload
      void window.api.workspace.saveDetailedOutlineSegments({
        projectId,
        detailedOutlineSegments: segments
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [projectId, segments])

  useEffect(() => {
    if (!projectId) return
    const payload = JSON.stringify(script)
    if (payload === lastScriptRef.current) return

    const timer = window.setTimeout(() => {
      lastScriptRef.current = payload
      void window.api.workspace.saveScriptDraft({ projectId, scriptDraft: script })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [projectId, script])
}
