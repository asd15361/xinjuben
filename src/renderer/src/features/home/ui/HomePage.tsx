import { HomeHeroPanel } from './HomeHeroPanel'
import { ProjectListPanel } from './ProjectListPanel'
import { useHomePageActions } from './useHomePageActions'
import { MarketPlaybookWorkbench } from '../../market-playbook/ui/MarketPlaybookWorkbench'

export function HomePage(): JSX.Element {
  const {
    busy,
    canCreate,
    projectName,
    audienceLane,
    subgenre,
    projects,
    query,
    status,
    visibleProjects,
    setProjectName,
    setAudienceLane,
    setSubgenre,
    setQuery,
    createProject,
    openProject,
    reload,
    removeProject
  } = useHomePageActions()

  return (
    <div className="min-h-full flex flex-col">
      <HomeHeroPanel
        status={status}
        busy={busy}
        projectName={projectName}
        canCreate={canCreate}
        audienceLane={audienceLane}
        subgenre={subgenre}
        onProjectNameChange={setProjectName}
        onAudienceLaneChange={setAudienceLane}
        onSubgenreChange={setSubgenre}
        onCreate={() => void createProject()}
      />

      <MarketPlaybookWorkbench />

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
