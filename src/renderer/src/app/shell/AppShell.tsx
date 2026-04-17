import { lazy, type ReactNode, Suspense } from 'react'
import { useProjectStagePersistence } from '../hooks/useProjectStagePersistence'
import { useProjectGenerationStatusBridge } from '../hooks/useProjectGenerationStatusBridge'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useDynamicImportRecoverySuccessAck } from '../utils/dynamic-import-recovery'

const HomeShell = lazy(async () =>
  import('./HomeShell').then((module) => ({ default: module.HomeShell }))
)
const ProjectShell = lazy(async () =>
  import('./ProjectShell').then((module) => ({ default: module.ProjectShell }))
)

function AppShellFallback() {
  return (
    <div
      className="flex h-screen w-full items-center justify-center"
      style={{ background: '#050505', color: '#f8fafc' }}
    >
      <div className="rounded-2xl border border-white/8 bg-white/3 px-6 py-5">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
          正在打开页面
        </p>
        <p className="mt-3 text-sm text-white/55">正在整理当前内容，马上进入你刚才的创作位置。</p>
      </div>
    </div>
  )
}

function DynamicImportRecoverySuccessAck(props: { ackKey: string; children: ReactNode }) {
  useDynamicImportRecoverySuccessAck(props.ackKey)
  return <>{props.children}</>
}

export function AppShell() {
  useProjectStagePersistence()
  useProjectGenerationStatusBridge()
  const projectId = useWorkflowStore((s) => s.projectId)

  return (
    <Suspense fallback={<AppShellFallback />}>
      {projectId ? (
        <ProjectShell />
      ) : (
        <DynamicImportRecoverySuccessAck ackKey="home-shell">
          <HomeShell />
        </DynamicImportRecoverySuccessAck>
      )}
    </Suspense>
  )
}
