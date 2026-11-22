import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { StudioSettings } from '../types/studio';

export const SettingsView: React.FC = () => {
  const { workspace, updateSettings, resetToDemoData, clearAllData, importWorkspaceJson } =
    useStudioStore();

  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'clear' | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3200);
  };

  const storageSizeKb = Math.max(
    1,
    Math.round(new Blob([JSON.stringify(workspace)]).size / 1024)
  );

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-video-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Резервная копия рабочего пространства сохранена.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = importWorkspaceJson(reader.result);
        showNotice(
          res.ok
            ? 'Данные рабочего пространства успешно восстановлены.'
            : res.error || 'Не удалось импортировать файл.'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {notice && (
        <div className="rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/15 px-4 py-3 text-xs font-medium text-white">
          {notice}
        </div>
      )}

      {/* Studio Preferences */}
      <section className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
        <h2 className="text-base font-semibold text-white">Основные параметры студии</h2>
        <p className="mt-1 text-xs text-slate-400">
          Настройки применяются по умолчанию при создании новых видеопроектов.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Название студии
            </label>
            <input
              type="text"
              value={workspace.settings.studioName}
              onChange={(e) => updateSettings({ studioName: e.target.value })}
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Язык интерфейса
            </label>
            <input
              type="text"
              disabled
              value="Русский (основной)"
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913]/60 px-3.5 py-2 text-sm text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Разрешение по умолчанию
            </label>
            <select
              value={workspace.settings.defaultResolution}
              onChange={(e) =>
                updateSettings({
                  defaultResolution: e.target.value as StudioSettings['defaultResolution'],
                })
              }
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="3840x2160">3840x2160 (4K UHD)</option>
              <option value="1080x1920">1080x1920 (Вертикальный)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Частота кадров (FPS)
            </label>
            <select
              value={workspace.settings.defaultFps}
              onChange={(e) =>
                updateSettings({ defaultFps: Number(e.target.value) as 24 | 30 | 60 })
              }
              className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value={24}>24 fps (Кинематограф)</option>
              <option value={30}>30 fps (Стандарт)</option>
              <option value={60}>60 fps (Плавный)</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-[#1E293B] pt-5">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">
                Автосохранение в локальное хранилище
              </div>
              <div className="text-xs text-slate-400">
                Сохранять изменения проектов, воркфлоу и таймлайна в браузере
              </div>
            </div>
            <input
              type="checkbox"
              checked={workspace.settings.autosave}
              onChange={(e) => updateSettings({ autosave: e.target.checked })}
              className="h-4 w-4 accent-[#7C3AED]"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">
                Показывать пометки демонстрационных данных
              </div>
              <div className="text-xs text-slate-400">
                Отображать информационные подсказки о базовом режиме без внешних API
              </div>
            </div>
            <input
              type="checkbox"
              checked={workspace.settings.showDemoNotices}
              onChange={(e) => updateSettings({ showDemoNotices: e.target.checked })}
              className="h-4 w-4 accent-[#7C3AED]"
            />
          </label>
        </div>
      </section>

      {/* Local Storage & Backup */}
      <section className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Локальное хранилище и резервные копии
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Все данные хранятся локально без платных сервисов и внешних серверов.
            </p>
          </div>
          <div className="font-mono-tabular text-xs text-slate-300">
            Занято: {storageSizeKb} КБ
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E293B] bg-[#060913] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-[#7C3AED] hover:text-white"
          >
            <Download className="h-4 w-4" />
            <span>Экспорт в JSON</span>
          </button>

          <input
            ref={importRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E293B] bg-[#060913] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-[#7C3AED] hover:text-white"
          >
            <Upload className="h-4 w-4" />
            <span>Импорт из JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmAction('reset')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E293B] bg-[#060913] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-300"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Восстановить демо-данные</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmAction('clear')}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            <span>Очистить все данные</span>
          </button>
        </div>
      </section>

      {/* Confirm modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <h3 className="text-base font-semibold text-white">
              {confirmAction === 'reset'
                ? 'Восстановить демонстрационные данные?'
                : 'Очистить всё рабочее пространство?'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {confirmAction === 'reset'
                ? 'Текущие проекты, задачи и схемы будут заменены исходным демонстрационным набором.'
                : 'Все проекты, медиазаписи, схемы воркфлоу, задачи и резервы слотов будут удалены.'}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === 'reset') {
                    resetToDemoData();
                    showNotice('Демонстрационные данные восстановлены.');
                  } else {
                    clearAllData();
                    showNotice('Рабочее пространство очищено.');
                  }
                  setConfirmAction(null);
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                  confirmAction === 'clear'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                }`}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
