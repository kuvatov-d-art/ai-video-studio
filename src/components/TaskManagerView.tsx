import React, { useMemo, useState } from 'react';
import { CheckSquare, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { TaskItem, TaskPriority, TaskStatus } from '../types/studio';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONE,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
} from '../utils/labels';

export const TaskManagerView: React.FC = () => {
  const { workspace, createTask, updateTask, updateTaskStatus, deleteTask } =
    useStudioStore();

  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [assigneeLabel, setAssigneeLabel] = useState('Режиссёр монтажа');

  const counts = useMemo(() => {
    return {
      all: workspace.tasks.length,
      pending: workspace.tasks.filter((t) => t.status === 'pending').length,
      in_progress: workspace.tasks.filter((t) => t.status === 'in_progress').length,
      review: workspace.tasks.filter((t) => t.status === 'review').length,
      completed: workspace.tasks.filter((t) => t.status === 'completed').length,
    };
  }, [workspace.tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspace.tasks.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assigneeLabel.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [workspace.tasks, statusFilter, search]);

  const openCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setProjectId(workspace.projects[0]?.id || '');
    setStatus('pending');
    setPriority('medium');
    setDueDate(new Date().toISOString().slice(0, 10));
    setAssigneeLabel('Режиссёр монтажа');
    setModalOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setProjectId(task.projectId || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setAssigneeLabel(task.assigneeLabel);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim(),
        projectId: projectId || null,
        status,
        priority,
        dueDate,
        assigneeLabel: assigneeLabel.trim() || 'Команда студии',
      });
    } else {
      createTask({
        title: title.trim(),
        description: description.trim(),
        projectId: projectId || null,
        status,
        priority,
        dueDate,
        assigneeLabel: assigneeLabel.trim() || 'Команда студии',
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Status summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
          <div className="text-xs text-slate-400">Ожидает</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold text-slate-200">
            {counts.pending}
          </div>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
          <div className="text-xs text-slate-400">В работе</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold text-violet-300">
            {counts.in_progress}
          </div>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
          <div className="text-xs text-slate-400">На проверке</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold text-amber-300">
            {counts.review}
          </div>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
          <div className="text-xs text-slate-400">Завершено</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-300">
            {counts.completed}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задачи..."
              className="w-60 rounded-lg border border-[#1E293B] bg-[#0B1120] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#1E293B] bg-[#0B1120] p-1">
            {(
              [
                { id: 'all', label: `Все (${counts.all})` },
                { id: 'pending', label: 'Ожидает' },
                { id: 'in_progress', label: 'В работе' },
                { id: 'review', label: 'На проверке' },
                { id: 'completed', label: 'Завершено' },
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
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Новая задача</span>
        </button>
      </div>

      {/* Tasks Table */}
      <div className="overflow-hidden rounded-xl border border-[#1E293B] bg-[#0B1120]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <CheckSquare className="h-10 w-10 text-slate-500" />
            <h3 className="mt-3 text-base font-semibold text-white">Задач не найдено</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Создайте новую производственную задачу или измените параметры фильтрации.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1E293B] text-xs font-medium text-slate-400">
                  <th className="px-5 py-3">Задача</th>
                  <th className="px-4 py-3">Проект</th>
                  <th className="px-4 py-3">Приоритет</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Срок</th>
                  <th className="px-5 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {filtered.map((task) => {
                  const linkedProject = workspace.projects.find(
                    (p) => p.id === task.projectId
                  );
                  return (
                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-[#111827]/70"
                    >
                      <td className="px-5 py-3.5 max-w-md">
                        <div className="font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {task.description}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-500">
                          {task.assigneeLabel} {task.isDemo ? '· Демо' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {linkedProject ? linkedProject.title : 'Общая задача'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium whitespace-nowrap">
                        <span className={TASK_PRIORITY_TONE[task.priority]}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            updateTaskStatus(task.id, e.target.value as TaskStatus)
                          }
                          aria-label={`Статус задачи ${task.title}`}
                          className={`rounded-lg border border-[#1E293B] bg-[#060913] px-2.5 py-1 text-xs font-medium focus:border-[#8B5CF6] focus:outline-none ${
                            TASK_STATUS_TONE[task.status]
                          }`}
                        >
                          {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((st) => (
                            <option key={st} value={st} className="text-white">
                              {TASK_STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                        {task.dueDate}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-white"
                            aria-label={`Редактировать ${task.title}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-rose-400"
                            aria-label={`Удалить ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Task Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">
                {editingTask ? 'Редактировать задачу' : 'Новая задача'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Название задачи
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Проверить цветокоррекцию в сцене 2"
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Проект
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="">Без привязки к проекту</option>
                    {workspace.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ответственный / Роль
                  </label>
                  <input
                    type="text"
                    value={assigneeLabel}
                    onChange={(e) => setAssigneeLabel(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Статус
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="pending">Ожидает</option>
                    <option value="in_progress">В работе</option>
                    <option value="review">На проверке</option>
                    <option value="completed">Завершено</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Приоритет
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Срок
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  {editingTask ? 'Сохранить' : 'Создать задачу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
