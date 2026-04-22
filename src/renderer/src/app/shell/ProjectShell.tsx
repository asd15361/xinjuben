import { AppBackdrop } from './AppBackdrop'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { StageViewport } from './StageViewport'

export function ProjectShell(): JSX.Element {
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: '#050505', color: '#f8fafc' }}
    >
      <AppSidebar />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AppBackdrop />
        <AppHeader />

        <div className="flex-1 p-3 lg:p-5 xl:p-8 overflow-hidden relative z-10">
          <div className="h-full">
            <StageViewport />
          </div>
        </div>
      </main>
    </div>
  )
}
