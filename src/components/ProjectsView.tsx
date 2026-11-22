import React, { useMemo, useState } from 'react';
import {
  Clapperboard,
  Edit3,
  FolderKanban,
  GitBranch,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { Project, ProjectStatus } from '../types/studio';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from '../utils/labels';

interface ProjectsViewProps {
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onCreateProject,
  onEditProject,
}) => {
  const { workspace, deleteProject, setActiveProjectId, setActiveSection } = useStudioStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspace.projects.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [workspace.projects, search, statusFilter]);

  const openInStudio = (id: string) => {
    setActiveProjectId(id);
    setActiveSection('studio');
  };

  const openInWorkflow = (id: string) => {
    setActiveProjectId(id);
    setActiveSection('workflow');
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск проекта..."
              className="w-64 rounded-lg border border-[#1E293B] bg-[#0B1120] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#1E293B] bg-[#0B1120] p-1">
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'draft', label: 'Черновики' },
                { id: 'in_progress', label: 'В работе' },
                { id: 'review', label: 'На проверке' },
                { id: 'completed', label: 'Завершены' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateProject}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Создать проект</span>
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E293B] bg-[#0B1120] px-6 py-16 text-center">
          <FolderKanban className="h-10 w-10 text-slate-500" />
          <h3 className="mt-3 text-base font-semibold text-white">Проекты не найдены</h3>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            {workspace.projects.length === 0
              ? 'Создайте новый проект или восстановите демонстрационный набор в настройках.'
              : 'Попробуйте изменить параметры поиска или фильтр статуса.'}
          </p>
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
          >
            Создать проект
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const workflowNodesCount = workspace.workflows[project.id]?.nodes.length ?? 0;
            const clipsCount = workspace.timelineClips.filter(
              (c) => c.projectId === project.id
            ).length;

            return (
              <article
                key={project.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#1E293B] bg-[#0B1120]"
              >
                <div className="relative aspect-video w-full overflow-hidden border-b border-[#1E293B] bg-[#060913]">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#060913]/90 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200 font-mono-tabular">
                    <span>
                      {project.format} · {project.resolution}
                    </span>
                    <span>{project.durationSec} с</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-white leading-snug">
                      {project.title}
                    </h3>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        PROJECT_STATUS_TONE[project.status]
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {project.description || 'Описание проекта не заполнено.'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                    <span>{project.isDemo ? 'Демо' : 'Проект'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.fps} fps</span>
                    <span aria-hidden="true">·</span>
                    <span>Узлов: {workflowNodesCount}</span>
                    <span aria-hidden="true">·</span>
                    <span>Клипов: {clipsCount}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#1E293B] pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openInStudio(project.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9] whitespace-nowrap"
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        <span>Студия</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openInWorkflow(project.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#7C3AED] hover:text-white whitespace-nowrap"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>Воркфлоу</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-[#111827] hover:text-white"
                        aria-label={`Редактировать ${project.title}`}
                        title="Редактировать"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(project.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-[#111827] hover:text-rose-400"
                        aria-label={`Удалить ${project.title}`}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <h3 className="text-base font-semibold text-white">Удалить проект?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Проект, его схема воркфлоу и клипы на таймлайне будут удалены из локального хранилища.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
