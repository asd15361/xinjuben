import type { ChatMessageDto } from '../../../../shared/contracts/chat'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation'
import { create } from 'zustand'
import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptRuntimeFailureHistoryCode
} from '../../../../shared/contracts/script-generation'
import type { WorkflowStage } from '../../../../shared/contracts/workflow'
import type {
  FormalReleaseState,
  VisibleResultState
} from '../../../../shared/contracts/visible-release-state'

export interface GenerationNoticeAction {
  label: string
  stage: WorkflowStage
}

export interface GenerationNotice {
  source?: 'system' | 'generation_result' | 'stage_gate'
  kind: 'success' | 'error'
  title: string
  detail: string
  primaryAction?: GenerationNoticeAction
  secondaryAction?: GenerationNoticeAction
}

interface WorkflowState {
  currentStage: WorkflowStage
  projectId: string | null
  projectName: string
  chatMessages: ChatMessageDto[]
  generationStatus: ProjectGenerationStatusDto | null
  generationNotice: GenerationNotice | null
  storyIntent: StoryIntentPackageDto | null
  scriptRuntimeFailureHistory: ScriptRuntimeFailureHistoryCode[]
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  visibleResult: VisibleResultState | null
  formalRelease: FormalReleaseState | null
  setStage: (stage: WorkflowStage) => void
  setProjectId: (id: string | null) => void
  setProjectName: (name: string) => void
  setChatMessages: (messages: ChatMessageDto[]) => void
  setGenerationStatus: (status: ProjectGenerationStatusDto | null) => void
  setGenerationNotice: (notice: GenerationNotice | null) => void
  clearGenerationNotice: () => void
  setStoryIntent: (storyIntent: StoryIntentPackageDto | null) => void
  setScriptRuntimeFailureHistory: (history: ScriptRuntimeFailureHistoryCode[]) => void
  setScriptProgressBoard: (value: ScriptGenerationProgressBoardDto | null) => void
  setScriptFailureResolution: (value: ScriptGenerationFailureResolutionDto | null) => void
  setVisibleResult: (value: VisibleResultState | null) => void
  setFormalRelease: (value: FormalReleaseState | null) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentStage: 'chat',
  projectId: null,
  projectName: '',
  chatMessages: [],
  generationStatus: null,
  generationNotice: null,
  storyIntent: null,
  scriptRuntimeFailureHistory: [],
  scriptProgressBoard: null,
  scriptFailureResolution: null,
  visibleResult: null,
  formalRelease: null,
  setStage: (stage) => set({ currentStage: stage }),
  setProjectId: (projectId) => set({ projectId }),
  setProjectName: (projectName) => set({ projectName }),
  setChatMessages: (chatMessages) => set({ chatMessages }),
  setGenerationStatus: (generationStatus) => set({ generationStatus }),
  setGenerationNotice: (generationNotice) => set({ generationNotice }),
  clearGenerationNotice: () => set({ generationNotice: null }),
  setStoryIntent: (storyIntent) => set({ storyIntent }),
  setScriptRuntimeFailureHistory: (scriptRuntimeFailureHistory) =>
    set({ scriptRuntimeFailureHistory }),
  setScriptProgressBoard: (scriptProgressBoard) => set({ scriptProgressBoard }),
  setScriptFailureResolution: (scriptFailureResolution) => set({ scriptFailureResolution }),
  setVisibleResult: (visibleResult) => set({ visibleResult }),
  setFormalRelease: (formalRelease) => set({ formalRelease }),
  reset: () =>
    set(() => ({
      currentStage: 'chat',
      projectId: null,
      projectName: '',
      chatMessages: [],
      generationStatus: null,
      generationNotice: null,
      storyIntent: null,
      scriptRuntimeFailureHistory: [],
      scriptProgressBoard: null,
      scriptFailureResolution: null,
      visibleResult: null,
      formalRelease: null
    }))
}))
