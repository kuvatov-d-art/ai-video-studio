import React, { useState } from 'react';
import { Cpu, Plus, Settings2, Trash2, X } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { ModelCategory, ModelConnection } from '../types/studio';
import { CONNECTION_STATUS_LABELS, MODEL_CATEGORY_LABELS } from '../utils/labels';

export const ModelConnectionsView: React.FC = () => {
  const { workspace, updateModelConnection, addModelConnection, deleteModelConnection } =
    useStudioStore();

  const [editingConn, setEditingConn] = useState<ModelConnection | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Edit / New form fields (no API keys!)
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ModelCategory>('video');
  const [protocol, setProtocol] = useState('REST / JSON');
  const [endpointDraft, setEndpointDraft] = useState('');
  const [timeoutSec, setTimeoutSec] = useState(60);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const openEdit = (conn: ModelConnection) => {
    setEditingConn(conn);
    setName(conn.name);
    setCategory(conn.category);
    setProtocol(conn.protocol);
    setEndpointDraft(conn.endpointDraft);
    setTimeoutSec(conn.timeoutSec);
    setDescription(conn.description);
    setNotes(conn.notes);
  };

  const openNew = () => {
    setIsNewModalOpen(true);
    setName('');
    setCategory('video');
    setProtocol('REST / JSON');
    setEndpointDraft('');
    setTimeoutSec(60);
    setDescription('');
    setNotes('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConn) return;
    const trimmedUrl = endpointDraft.trim();
    updateModelConnection(editingConn.id, {
      name: name.trim() || editingConn.name,
      category,
      protocol: protocol.trim() || 'REST / JSON',
      endpointDraft: trimmedUrl,
      timeoutSec: Math.max(5, Number(timeoutSec) || 60),
      description: description.trim(),
      notes: notes.trim(),
      status: trimmedUrl ? 'draft_configured' : 'not_connected',
    });
    setEditingConn(null);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const trimmedUrl = endpointDraft.trim();
    addModelConnection({
      name: name.trim(),
      category,
      protocol: protocol.trim() || 'REST / JSON',
      endpointDraft: trimmedUrl,
      timeoutSec: Math.max(5, Number(timeoutSec) || 60),
      status: trimmedUrl ? 'draft_configured' : 'not_connected',
      description:
        description.trim() || 'Пользовательский слот для будущей интеграции модели.',
      capabilities: ['Пользовательский профиль'],
      notes: notes.trim(),
    });
    setIsNewModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            Подключения моделей и будущие API
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Архитектура интеграций. Внешние API-ключи не запрашиваются и не хранятся — вы можете заранее описать конечные точки (URL-черновики) и протоколы для следующего этапа разработки.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить слот API</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {workspace.modelConnections.map((conn) => {
          const isConfigured = conn.status === 'draft_configured';
          return (
            <article
              key={conn.id}
              className="flex flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0B1120] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E293B] bg-[#060913] text-[#A78BFA]">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{conn.name}</h3>
                      <div className="text-xs text-slate-400">
                        {MODEL_CATEGORY_LABELS[conn.category]} · {conn.protocol}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                      isConfigured ? 'text-violet-300' : 'text-slate-500'
                    }`}
                  >
                    {CONNECTION_STATUS_LABELS[conn.status]}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {conn.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#1E293B] pt-3 text-xs">
                  <div>
                    <div className="text-slate-500">URL-черновик</div>
                    <div className="mt-0.5 truncate font-mono-tabular text-slate-200">
                      {conn.endpointDraft || 'Не указан'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Таймаут ожидания</div>
                    <div className="mt-0.5 font-mono-tabular text-slate-200">
                      {conn.timeoutSec} сек
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Возможности: {conn.capabilities.join(' · ')}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#1E293B] pt-3.5">
                <span className="text-[11px] text-slate-500 truncate max-w-[240px]">
                  {conn.notes || 'Без примечаний'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(conn)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Настроить черновик</span>
                  </button>
                  {!conn.isDemo && (
                    <button
                      type="button"
                      onClick={() => deleteModelConnection(conn.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-rose-400"
                      aria-label={`Удалить ${conn.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Edit or New Modal */}
      {(editingConn || isNewModalOpen) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">
                {editingConn
                  ? 'Черновик подключения модели'
                  : 'Новый слот подключения API'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingConn(null);
                  setIsNewModalOpen(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={editingConn ? handleSaveEdit : handleCreateNew}
              className="mt-4 space-y-4"
            >
              <p className="text-xs text-slate-400">
                Сетевые запросы и хранение секретных API-ключей на данном этапе отключены.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Название интеграции
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Локальный сервер рендера"
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ModelCategory)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="video">Видео-генерация</option>
                    <option value="image">Изображения</option>
                    <option value="audio">Аудио и голос</option>
                    <option value="llm">Текст и сценарии</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Протокол
                  </label>
                  <input
                    type="text"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    URL-адрес шлюза (черновик)
                  </label>
                  <input
                    type="text"
                    value={endpointDraft}
                    onChange={(e) => setEndpointDraft(e.target.value)}
                    placeholder="https://api.example.local/v1"
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Таймаут (с)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Описание назначения
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Примечания для разработчика
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingConn(null);
                    setIsNewModalOpen(false);
                  }}
                  className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Сохранить конфигурацию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
