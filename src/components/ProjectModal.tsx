import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { DEMO_ASSETS } from '../data/demoData';
import { useStudioStore } from '../store/useStudioStore';
import { Project, ProjectStatus } from '../types/studio';

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  onClose: () => void;
}

const THUMBNAIL_OPTIONS = [
  { label: 'Ночной мегаполис', value: DEMO_ASSETS.cybercity },
  { label: 'Альпийский хребет', value: DEMO_ASSETS.alpine },
  { label: 'Студийная оптика', value: DEMO_ASSETS.product },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  editingProject,
  onClose,
}) => {
  const { createProject, updateProject, workspace } = useStudioStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [resolution, setResolution] = useState<Project['resolution']>('1920x1080');
  const [fps, setFps] = useState<24 | 30 | 60>(24);
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [durationSec, setDurationSec] = useState(30);
  const [thumbnail, setThumbnail] = useState<string>(DEMO_ASSETS.cybercity);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description);
      setFormat(editingProject.format);
      setResolution(editingProject.resolution);
      setFps(editingProject.fps);
      setStatus(editingProject.status);
      setDurationSec(editingProject.durationSec);
      setThumbnail(editingProject.thumbnail);
    } else {
      setTitle('');
      setDescription('');
      setFormat('16:9');
      setResolution(workspace.settings.defaultResolution);
      setFps(workspace.settings.defaultFps);
      setStatus('draft');
      setDurationSec(30);
      setThumbnail(DEMO_ASSETS.cybercity);
    }
    setError('');
  }, [isOpen, editingProject, workspace.settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Укажите название проекта.');
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, {
        title: trimmed,
        description: description.trim(),
        format,
        resolution,
        fps,
        status,
        durationSec: Math.max(5, Number(durationSec) || 30),
        thumbnail,
      });
    } else {
      createProject({
        title: trimmed,
        description: description.trim(),
        format,
        resolution,
        fps,
        status,
        durationSec: Math.max(5, Number(durationSec) || 30),
        thumbnail,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-[#1E293B] bg-[#0B1120] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <h2 id="project-modal-title" className="text-lg font-semibold text-white">
            {editingProject ? 'Редактировать проект' : 'Новый видеопроект'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-white"
            aria-label="Закрыть окно"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="proj-title" className="block text-xs font-medium text-slate-300 mb-1.5">
              Название проекта
            </label>
            <input
              id="proj-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Презентация нового продукта"
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="proj-desc" className="block text-xs font-medium text-slate-300 mb-1.5">
              Описание и задача ролика
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткий бриф, стиль, ключевые сцены..."
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Формат</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as '16:9' | '9:16' | '1:1')}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Разрешение</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Project['resolution'])}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="1920x1080">1920x1080</option>
                <option value="3840x2160">3840x2160</option>
                <option value="1080x1920">1080x1920</option>
                <option value="1080x1080">1080x1080</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Частота</label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value) as 24 | 30 | 60)}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Длит. (сек)</label>
              <input
                type="number"
                min={5}
                max={600}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="draft">Черновик</option>
                <option value="in_progress">В работе</option>
                <option value="review">На проверке</option>
                <option value="completed">Завершён</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Обложка</label>
              <select
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                {THUMBNAIL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-[#1E293B] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#1E293B] bg-transparent px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
            >
              {editingProject ? 'Сохранить изменения' : 'Создать проект'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
