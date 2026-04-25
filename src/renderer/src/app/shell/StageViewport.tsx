import { lazy, type ReactNode, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useDynamicImportRecoverySuccessAck } from '../utils/dynamic-import-recovery'

const ChatStage = lazy(async () =>
  import('../../features/chat/ui/ChatStage').then((module) => ({ default: module.ChatStage }))
)
const OutlineStage = lazy(async () =>
  import('../../features/outline/ui/OutlineStage').then((module) => ({
    default: module.OutlineStage
  }))
)
const CharacterStage = lazy(async () =>
  import('../../features/character/ui/CharacterStage').then((module) => ({
    default: module.CharacterStage
  }))
)
const DetailedOutlineStage = lazy(async () =>
  import('../../features/detailed-outline/ui/DetailedOutlineStage').then((module) => ({
    default: module.DetailedOutlineStage
  }))
)
const ScriptStage = lazy(async () =>
  import('../../features/script/ui/ScriptStage').then((module) => ({ default: module.ScriptStage }))
)

function StageViewportFallback(): JSX.Element {
  return (
    <div className="h-full rounded-[24px] border border-white/8 bg-white/3 px-6 py-5">
      <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">正在切换页面</p>
      <p className="mt-3 text-sm text-white/55">正在载入这一页的内容，请稍等一下。</p>
    </div>
  )
}

function DynamicImportRecoverySuccessAck({
  ackKey,
  children
}: {
  ackKey: string
  children: ReactNode
}): JSX.Element {
  useDynamicImportRecoverySuccessAck(ackKey)
  return <>{children}</>
}

function renderActiveStage(currentStage: string): ReactNode {
  switch (currentStage) {
    case 'chat':
      return <ChatStage />
    case 'seven_questions':
      return <CharacterStage />
    case 'outline':
      return <OutlineStage />
    case 'character':
      return <CharacterStage />
    case 'detailed_outline':
      return <DetailedOutlineStage />
    case 'script':
      return <ScriptStage />
    default:
      return null
  }
}

export function StageViewport(): JSX.Element {
  const currentStage = useWorkflowStore((state) => state.currentStage)
  const activeStage = renderActiveStage(currentStage)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStage}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="glass-panel rounded-[24px] p-4 lg:p-6 xl:p-8 h-full overflow-hidden"
      >
        <Suspense fallback={<StageViewportFallback />}>
          {activeStage ? (
            <DynamicImportRecoverySuccessAck ackKey={`stage:${currentStage}`}>
              {activeStage}
            </DynamicImportRecoverySuccessAck>
          ) : null}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
