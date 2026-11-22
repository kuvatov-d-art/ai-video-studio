import React, { useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Eye,
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DEMO_ASSETS } from '../data/demoData';
import { useStudioStore } from '../store/useStudioStore';
import { MediaItem, MediaType } from '../types/studio';
import { formatShortDuration, MEDIA_TYPE_LABELS } from '../utils/labels';

export const MediaLibraryView: React.FC = () => {
  const { workspace, addMediaItem, deleteMediaItem, addTimelineClip, setActiveSection } =
    useStudioStore();

  const [filterType, setFilterType] = useState<'all' | MediaType>('all');
  const [search, setSearch] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add manual media form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('image');
  const [format, setFormat] = useState('JPG');
  const [durationSec, setDurationSec] = useState(10);
  const [resolution, setResolution] = useState('1920x1080');
  const [sizeLabel, setSizeLabel] = useState('2.0 МБ');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspace.mediaItems.filter((item) => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [workspace.mediaItems, filterType, search]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType: MediaType = 'image';
    if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    const finalize = (url: string) => {
      addMediaItem({
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: detectedType,
        format: ext,
        durationSec: detectedType === 'image' ? null : 12,
        sizeLabel: `${sizeMb} МБ`,
        resolution: detectedType === 'audio' ? '48 kHz' : '1920x1080',
        url,
        projectId: workspace.activeProjectId || null,
      });
      showToast(`Файл «${file.name}» добавлен в медиатеку.`);
    };

    if (detectedType === 'image' && file.size < 1.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => finalize(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
    } else {
      finalize(URL.createObjectURL(file));
    }

    e.target.value = '';
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addMediaItem({
      title: title.trim(),
      type,
      format: format.trim() || 'MP4',
      durationSec: type === 'image' ? null : Math.max(1, Number(durationSec) || 10),
      sizeLabel: sizeLabel.trim() || '1.5 МБ',
      resolution: resolution.trim() || '1920x1080',
      url: type === 'audio' ? '' : DEMO_ASSETS.cybercity,
      projectId: workspace.activeProjectId || null,
    });
    setIsAddModalOpen(false);
    setTitle('');
    showToast('Медиазапись добавлена.');
  };

  const handleSendToTimeline = (item: MediaItem) => {
    const targetProjectId = workspace.activeProjectId || workspace.projects[0]?.id;
    if (!targetProjectId) {
      showToast('Сначала создайте проект для добавления на таймлайн.');
      return;
    }

    const trackId = item.type === 'audio' ? 'a1' : 'v1';
    const existingOnTrack = workspace.timelineClips.filter(
      (c) => c.projectId === targetProjectId && c.trackId === trackId
    );
    const maxEnd = existingOnTrack.reduce(
      (acc, c) => Math.max(acc, c.startSec + c.durationSec),
      0
    );

    addTimelineClip({
      projectId: targetProjectId,
      trackId,
      title: item.title,
      mediaId: item.id,
      startSec: Math.round(maxEnd),
      durationSec: item.durationSec || 6,
      opacity: 100,
      volume: item.type === 'audio' ? 80 : 0,
      thumbnail: item.type === 'audio' ? undefined : item.url,
    });

    showToast(`Добавлено на дорожку ${trackId.toUpperCase()} в Видеостудии.`);
  };

  const renderIcon = (itemType: MediaType) => {
    if (itemType === 'video') return <Film className="h-4 w-4 text-[#A78BFA]" />;
    if (itemType === 'audio') return <Music className="h-4 w-4 text-[#A78BFA]" />;
    return <ImageIcon className="h-4 w-4 text-[#A78BFA]" />;
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {toastMsg && (
        <div className="rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/15 px-4 py-2.5 text-xs font-medium text-white">
          {toastMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск медиафайлов..."
              className="w-60 rounded-lg border border-[#1E293B] bg-[#0B1120] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#1E293B] bg-[#0B1120] p-1">
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'image', label: 'Изображения' },
                { id: 'video', label: 'Видео' },
                { id: 'audio', label: 'Аудио' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterType === tab.id
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E293B] bg-[#0B1120] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#7C3AED] hover:text-white whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" />
            <span>Загрузить файл</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить запись</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E293B] bg-[#0B1120] px-6 py-16 text-center">
          <ImageIcon className="h-10 w-10 text-slate-500" />
          <h3 className="mt-3 text-base font-semibold text-white">Медиафайлы не найдены</h3>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            Загрузите локальные изображения, видео или аудио, либо измените фильтр.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[#1E293B] bg-[#0B1120]"
            >
              <div className="relative aspect-video w-full overflow-hidden border-b border-[#1E293B] bg-[#060913]">
                {item.type === 'audio' || !item.url ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#080D1A] px-4">
                    <Music className="h-8 w-8 text-[#A78BFA]" />
                    {/* Subtle static waveform bars */}
                    <div className="mt-3 flex h-6 items-end gap-1" aria-hidden="true">
                      {[35, 70, 50, 90, 40, 80, 60, 95, 45, 75, 55, 65].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}%` }}
                          className="w-1 rounded-sm bg-[#7C3AED]/70"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white line-clamp-1">
                      {item.title}
                    </h3>
                    {renderIcon(item.type)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-mono-tabular">
                    <span>{MEDIA_TYPE_LABELS[item.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.format}</span>
                    {item.durationSec !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDuration(item.durationSec)}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 font-mono-tabular">
                    {item.resolution} · {item.sizeLabel} {item.isDemo ? '· Демо' : ''}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#1E293B] pt-3">
                  <button
                    type="button"
                    onClick={() => handleSendToTimeline(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/40 px-2.5 py-1.5 text-xs font-medium text-[#C4B5FD] hover:bg-[#7C3AED] hover:text-white whitespace-nowrap"
                  >
                    <Clapperboard className="h-3.5 w-3.5" />
                    <span>На таймлайн</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-white"
                      aria-label={`Предпросмотр ${item.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMediaItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111827] hover:text-rose-400"
                      aria-label={`Удалить ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">{previewItem.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-[#1E293B] bg-[#060913]">
              {previewItem.type === 'audio' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <Music className="h-12 w-12 text-[#A78BFA]" />
                  <p className="mt-3 text-xs text-slate-300">
                    Аудиофайл · {previewItem.format} · {formatShortDuration(previewItem.durationSec)}
                  </p>
                  {previewItem.url && previewItem.url.startsWith('blob:') && (
                    <audio controls src={previewItem.url} className="mt-4 w-full max-w-md" />
                  )}
                </div>
              ) : previewItem.url.startsWith('blob:') && previewItem.type === 'video' ? (
                <video controls src={previewItem.url} className="w-full max-h-[400px]" />
              ) : (
                <img
                  src={previewItem.url || DEMO_ASSETS.cybercity}
                  alt={previewItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[400px] object-contain"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="font-mono-tabular">
                {MEDIA_TYPE_LABELS[previewItem.type]} · {previewItem.format} ·{' '}
                {previewItem.resolution} · {previewItem.sizeLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSendToTimeline(previewItem);
                    setPreviewItem(null);
                    setActiveSection('studio');
                  }}
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Добавить и открыть студию
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">Новая медиазапись</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleManualAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Футаж закатного неба"
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Тип</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const t = e.target.value as MediaType;
                      setType(t);
                      setFormat(t === 'image' ? 'JPG' : t === 'video' ? 'MP4' : 'WAV');
                    }}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="image">Изображение</option>
                    <option value="video">Видео</option>
                    <option value="audio">Аудио</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Формат</label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Длит. (сек)
                  </label>
                  <input
                    type="number"
                    disabled={type === 'image'}
                    min={1}
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular disabled:opacity-40 focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Параметры
                  </label>
                  <input
                    type="text"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Размер</label>
                  <input
                    type="text"
                    value={sizeLabel}
                    onChange={(e) => setSizeLabel(e.target.value)}
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
