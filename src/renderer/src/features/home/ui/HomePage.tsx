import { HomeHeroPanel } from './HomeHeroPanel'
import { ProjectListPanel } from './ProjectListPanel'
import { useHomePageActions } from './useHomePageActions'

export function HomePage(): JSX.Element {
  const {
    busy,
    canCreate,
    projectName,
    projects,
    query,
    status,
    visibleProjects,
    setProjectName,
    setQuery,
    createProject,
    openProject,
    reload,
    removeProject
  } = useHomePageActions()

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <HomeHeroPanel
        status={status}
        busy={busy}
        projectName={projectName}
        canCreate={canCreate}
        onProjectNameChange={setProjectName}
        onCreate={() => void createProject()}
      />

      <ProjectListPanel
        busy={busy}
        projects={projects}
        visibleProjects={visibleProjects}
        query={query}
        onQueryChange={setQuery}
        onReload={() => void reload()}
        onOpenProject={(projectId) => void openProject(projectId)}
        onRemoveProject={(projectId, name) => void removeProject(projectId, name)}
      />
    </div>
  )
}
