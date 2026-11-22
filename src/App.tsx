import React, { useState } from 'react';
import { AgentManagerView } from './components/AgentManagerView';
import { DashboardView } from './components/DashboardView';
import { MediaLibraryView } from './components/MediaLibraryView';
import { ModelConnectionsView } from './components/ModelConnectionsView';
import { ProjectModal } from './components/ProjectModal';
import { ProjectsView } from './components/ProjectsView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TaskManagerView } from './components/TaskManagerView';
import { TopBar } from './components/TopBar';
import { VideoStudioView } from './components/VideoStudioView';
import { WorkflowBuilderView } from './components/WorkflowBuilderView';
import { StudioProvider, useStudioStore } from './store/useStudioStore';
import { Project } from './types/studio';

function StudioShell() {
  const { activeSection } = useStudioStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const openNewProject = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView onOpenNewProject={openNewProject} />;
      case 'projects':
        return (
          <ProjectsView
            onCreateProject={openNewProject}
            onEditProject={openEditProject}
          />
        );
      case 'workflow':
        return <WorkflowBuilderView />;
      case 'agents':
        return <AgentManagerView />;
      case 'models':
        return <ModelConnectionsView />;
      case 'media':
        return <MediaLibraryView />;
      case 'studio':
        return <VideoStudioView />;
      case 'tasks':
        return <TaskManagerView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onOpenNewProject={openNewProject} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060913] text-[#F1F5F9]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickCreateProject={openNewProject}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderSection()}
        </main>
      </div>

      <ProjectModal
        isOpen={projectModalOpen}
        editingProject={editingProject}
        onClose={() => setProjectModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
