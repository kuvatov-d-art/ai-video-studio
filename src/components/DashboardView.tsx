import React from 'react';
import {
  ArrowRight,
  Clapperboard,
  FolderKanban,
  GitBranch,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
} from '../utils/labels';

interface DashboardViewProps {
  onOpenNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewProject }) => {
  const { workspace, setActiveSection, setActiveProjectId } = useStudioStore();

  const totalProjects = workspace.projects.length;
  const activeProjectsCount = workspace.projects.filter(
    (p) => p.status === 'in_progress' || p.status === 'review'
  ).length;
  const totalMedia = workspace.mediaItems.length;
  const openTasksCount = workspace.tasks.filter((t) => t.status !== 'completed').length;
  const completedTasksCount = workspace.tasks.filter((t) => t.status === 'completed').length;
  const reservedAgents = workspace.agentSlots.filter((s) => s.status === 'reserved').length;
  const configuredModels = workspace.modelConnections.filter(
    (m) => m.status === 'draft_configured'
  ).length;

  const totalWorkflowNodes = Object.values(workspace.workflows).reduce(
    (sum, wf) => sum + wf.nodes.length,
    0
  );

  const openProjectInStudio = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveSection('studio');
  };

  const openProjectInWorkflow = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveSection('workflow');
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {workspace.settings.showDemoNotices && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1E293B] bg-[#0B1120] px-5 py-3.5">
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-white">Базовая архитектура платформы.</span>{' '}
            Демонстрационные проекты, медиафайлы и задачи хранятся локально в браузере. Внешние ИИ-агенты и API-ключи не подключены.
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('settings')}
            className="text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Управление данными
          </button>
        </div>
      )}

      {/* 4-column KPI strip */}
      <section aria-label="Ключевые показатели">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
            <div className="text-xs font-medium text-slate-400">Всего проектов</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono-tabular text-3xl font-bold text-white">
                {totalProjects}
              </span>
              <span className="text-xs text-slate-400">
                {activeProjectsCount} в производстве
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
            <div className="text-xs font-medium text-slate-400">Медиатека</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono-tabular text-3xl font-bold text-white">
                {totalMedia}
              </span>
              <span className="text-xs text-slate-400">
                {workspace.timelineClips.length} клипов на таймлайне
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
            <div className="text-xs font-medium text-slate-400">Задачи</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono-tabular text-3xl font-bold text-white">
                {openTasksCount}
              </span>
              <span className="text-xs text-slate-400">
                {completedTasksCount} завершено
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
            <div className="text-xs font-medium text-slate-400">Слоты агентов</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono-tabular text-3xl font-bold text-white">
                {reservedAgents} / 10
              </span>
              <span className="text-xs text-slate-400">
                {configuredModels} черновиков API
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Projects Table */}
        <section className="xl:col-span-2 rounded-xl border border-[#1E293B] bg-[#0B1120]">
          <div className="flex items-center justify-between border-b border-[#1E293B] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">Проекты студии</h2>
              <p className="text-xs text-slate-400">
                Выберите проект для перехода к монтажу или схеме сценария
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenNewProject}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Создать</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('projects')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#A78BFA] hover:text-white whitespace-nowrap shrink-0"
              >
                <span>Все проекты</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {workspace.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <FolderKanban className="h-8 w-8 text-slate-500" />
              <h3 className="mt-3 text-sm font-semibold text-white">Проектов пока нет</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Создайте первый видеопроект, чтобы настроить воркфлоу и собрать таймлайн.
              </p>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="mt-4 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
              >
                Создать первый проект
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B] text-xs font-medium text-slate-400">
                    <th className="px-5 py-3">Проект</th>
                    <th className="px-4 py-3">Параметры</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Длит.</th>
                    <th className="px-5 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {workspace.projects.slice(0, 5).map((project) => (
                    <tr
                      key={project.id}
                      className="transition-colors hover:bg-[#111827]/70"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={project.thumbnail}
                            alt={project.title}
                            referrerPolicy="no-referrer"
                            className="h-10 w-16 shrink-0 rounded-md object-cover border border-[#1E293B] bg-[#060913]"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white max-w-[240px]">
                              {project.title}
                            </div>
                            <div className="text-xs text-slate-500">
                              {project.isDemo ? 'Демо-проект' : 'Пользовательский'} · {project.updatedAt}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300 font-mono-tabular whitespace-nowrap">
                        {project.format} · {project.resolution} · {project.fps} fps
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium whitespace-nowrap">
                        <span className={PROJECT_STATUS_TONE[project.status]}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                        {project.durationSec} с
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openProjectInWorkflow(project.id)}
                            className="rounded-md border border-[#1E293B] px-2.5 py-1 text-xs text-slate-300 hover:border-[#7C3AED] hover:text-white"
                          >
                            Схема
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectInStudio(project.id)}
                            className="rounded-md bg-[#7C3AED]/15 border border-[#7C3AED]/40 px-2.5 py-1 text-xs font-medium text-[#C4B5FD] hover:bg-[#7C3AED] hover:text-white"
                          >
                            Студия
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Column: Tasks + Architecture Quick Links */}
        <div className="space-y-6">
          <section className="rounded-xl border border-[#1E293B] bg-[#0B1120]">
            <div className="flex items-center justify-between border-b border-[#1E293B] px-5 py-4">
              <h2 className="text-base font-semibold text-white">Текущие задачи</h2>
              <button
                type="button"
                onClick={() => setActiveSection('tasks')}
                className="text-xs font-medium text-[#A78BFA] hover:text-white whitespace-nowrap"
              >
                Все задачи
              </button>
            </div>
            <div className="divide-y divide-[#1E293B]">
              {workspace.tasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-400">
                  Активных задач нет.
                </div>
              ) : (
                workspace.tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-100 leading-snug">
                        {task.title}
                      </div>
                      <span
                        className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                          TASK_STATUS_TONE[task.status]
                        }`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{task.assigneeLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{task.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
            <h2 className="text-base font-semibold text-white">Быстрый переход по модулям</h2>
            <p className="mt-1 text-xs text-slate-400">
              Узлов воркфлоу в проектах: <span className="font-mono-tabular text-slate-200">{totalWorkflowNodes}</span>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSection('workflow')}
                className="flex items-center justify-between rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-left text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <GitBranch className="h-4 w-4 text-[#A78BFA]" />
                  <span>Конструктор воркфлоу</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('studio')}
                className="flex items-center justify-between rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-left text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Clapperboard className="h-4 w-4 text-[#A78BFA]" />
                  <span>Видеостудия и таймлайн</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('media')}
                className="flex items-center justify-between rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-left text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4 text-[#A78BFA]" />
                  <span>Медиатека</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
