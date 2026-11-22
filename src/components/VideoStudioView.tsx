import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DEMO_ASSETS } from '../data/demoData';
import { useStudioStore } from '../store/useStudioStore';
import { TimelineClip, TimelineTrackId } from '../types/studio';
import { formatTimecode } from '../utils/labels';

const TRACKS: Array<{
  id: TimelineTrackId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'v1', label: 'V1', sublabel: 'Видео и кадры', icon: Film },
  { id: 'v2', label: 'V2', sublabel: 'Графика и титры', icon: Type },
  { id: 'a1', label: 'A1', sublabel: 'Фоновая музыка', icon: Music },
  { id: 'a2', label: 'A2', sublabel: 'Диктор / Аудио', icon: Mic },
];

export const VideoStudioView: React.FC = () => {
  const {
    workspace,
    setActiveProjectId,
    addTimelineClip,
    updateTimelineClip,
    deleteTimelineClip,
    createTask,
  } = useStudioStore();

  const currentProject =
    workspace.projects.find((p) => p.id === workspace.activeProjectId) ||
    workspace.projects[0] ||
    null;

  const projectId = currentProject?.id || 'standalone';
  const projectClips = useMemo(
    () => workspace.timelineClips.filter((c) => c.projectId === projectId),
    [workspace.timelineClips, projectId]
  );

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(
    currentProject?.format || '16:9'
  );
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(28);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isAddClipOpen, setIsAddClipOpen] = useState(false);

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const dragClipRef = useRef<{
    clipId: string;
    startX: number;
    initialStartSec: number;
  } | null>(null);

  const totalTimelineDuration = useMemo(() => {
    const maxEnd = projectClips.reduce(
      (acc, c) => Math.max(acc, c.startSec + c.durationSec),
      30
    );
    return Math.max(40, Math.ceil(maxEnd + 10));
  }, [projectClips]);

  const selectedClip = projectClips.find((c) => c.id === selectedClipId) || null;

  useEffect(() => {
    if (currentProject) {
      setAspectRatio(currentProject.format);
    }
    setPlayheadSec(0);
    setIsPlaying(false);
    setSelectedClipId(null);
  }, [projectId, currentProject]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadSec((prev) => {
        const next = prev + 0.1;
        if (next >= totalTimelineDuration) {
          setIsPlaying(false);
          return 0;
        }
        return Number(next.toFixed(2));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, totalTimelineDuration]);

  // Active clips under playhead
  const activeVisualClip = projectClips.find(
    (c) =>
      c.trackId === 'v1' &&
      playheadSec >= c.startSec &&
      playheadSec < c.startSec + c.durationSec
  );
  const activeOverlayClip = projectClips.find(
    (c) =>
      c.trackId === 'v2' &&
      playheadSec >= c.startSec &&
      playheadSec < c.startSec + c.durationSec
  );

  const handleRulerSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const sec = Math.min(totalTimelineDuration, Number((x / pxPerSec).toFixed(2)));
    setPlayheadSec(sec);
  };

  const handleClipPointerDown = (e: React.PointerEvent, clip: TimelineClip) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    dragClipRef.current = {
      clipId: clip.id,
      startX: e.clientX,
      initialStartSec: clip.startSec,
    };
  };

  const handleTimelinePointerMove = (e: React.PointerEvent) => {
    if (!dragClipRef.current) return;
    const deltaPx = e.clientX - dragClipRef.current.startX;
    const deltaSec = deltaPx / pxPerSec;
    const nextStart = Math.max(
      0,
      Number((dragClipRef.current.initialStartSec + deltaSec).toFixed(1))
    );
    updateTimelineClip(dragClipRef.current.clipId, { startSec: nextStart });
  };

  const handleTimelinePointerUp = () => {
    dragClipRef.current = null;
  };

  const handleAddTextOverlay = () => {
    const created = addTimelineClip({
      projectId,
      trackId: 'v2',
      title: 'Титр сцены',
      mediaId: null,
      startSec: Number(playheadSec.toFixed(1)),
      durationSec: 5,
      opacity: 100,
      volume: 0,
      overlayText: 'НОВЫЙ ЗАГОЛОВОК',
    });
    setSelectedClipId(created.id);
  };

  const handleCreateRenderTask = () => {
    if (!currentProject) return;
    createTask({
      title: `Черновой экспорт: ${currentProject.title}`,
      description: `Подготовлен монтажный лист (${projectClips.length} клипов, ${aspectRatio}, ${currentProject.fps} fps).`,
      projectId: currentProject.id,
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeLabel: 'Монтажный отдел',
    });
    setExportNotice('Задача на рендер добавлена в Менеджер задач.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const monitorContainerClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[290px]'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[290px]'
      : 'aspect-video max-h-[290px] w-full max-w-[520px]';

  const rulerMarkers = Array.from(
    { length: Math.floor(totalTimelineDuration / 5) + 1 },
    (_, i) => i * 5
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] min-h-[650px] max-w-[1600px] flex-col gap-4">
      {/* Studio Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E293B] bg-[#0B1120] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-400">Проект:</span>
          <select
            value={projectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-1.5 text-xs font-medium text-white focus:border-[#8B5CF6] focus:outline-none"
          >
            {workspace.projects.length === 0 ? (
              <option value="standalone">Автономный таймлайн</option>
            ) : (
              workspace.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))
            )}
          </select>

          <div className="flex items-center gap-1 rounded-lg border border-[#1E293B] bg-[#060913] p-0.5">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-mono-tabular font-medium transition-colors ${
                  aspectRatio === ratio
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {exportNotice && (
            <span className="text-xs font-medium text-[#C4B5FD]">{exportNotice}</span>
          )}
          <button
            type="button"
            onClick={() => setIsAddClipOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Из медиатеки</span>
          </button>
          <button
            type="button"
            onClick={handleAddTextOverlay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white whitespace-nowrap"
          >
            <Type className="h-3.5 w-3.5" />
            <span>Титр V2</span>
          </button>
          <button
            type="button"
            onClick={handleCreateRenderTask}
            disabled={!currentProject}
            className="rounded-lg bg-[#7C3AED] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-40 whitespace-nowrap"
          >
            Создать задачу рендера
          </button>
        </div>
      </div>

      {/* Upper Area: Monitor + Clip Inspector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Monitor */}
        <div className="lg:col-span-8 flex flex-col items-center justify-between rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
          <div className="flex flex-1 w-full items-center justify-center py-2">
            <div
              className={`relative overflow-hidden rounded-lg border border-[#1E293B] bg-[#03050A] flex items-center justify-center ${monitorContainerClass}`}
            >
              {activeVisualClip ? (
                <img
                  src={activeVisualClip.thumbnail || DEMO_ASSETS.cybercity}
                  alt={activeVisualClip.title}
                  referrerPolicy="no-referrer"
                  style={{ opacity: activeVisualClip.opacity / 100 }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <Film className="h-8 w-8 text-slate-600" />
                  <span className="mt-2 text-xs text-slate-500">
                    Нет видеоклипа в точке курсора
                  </span>
                </div>
              )}

              {activeOverlayClip && (
                <div
                  style={{ opacity: activeOverlayClip.opacity / 100 }}
                  className="absolute inset-x-4 bottom-6 flex justify-center"
                >
                  <div className="rounded-md bg-black/75 px-4 py-2 text-center text-sm font-semibold tracking-wide text-white border border-white/10">
                    {activeOverlayClip.overlayText || activeOverlayClip.title}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transport Controls */}
          <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-4 border-t border-[#1E293B] pt-3">
            <div className="font-mono-tabular text-sm font-semibold text-white">
              {formatTimecode(playheadSec, currentProject?.fps || 24)}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlayheadSec((p) => Math.max(0, Number((p - 1).toFixed(1))))}
                className="rounded-lg border border-[#1E293B] p-2 text-slate-300 hover:bg-[#111827] hover:text-white"
                aria-label="Назад на 1 секунду"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Пауза</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Воспроизвести</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setPlayheadSec(0);
                }}
                className="rounded-lg border border-[#1E293B] p-2 text-slate-300 hover:bg-[#111827] hover:text-white"
                aria-label="Стоп и в начало"
              >
                <Square className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPlayheadSec((p) =>
                    Math.min(totalTimelineDuration, Number((p + 1).toFixed(1)))
                  )
                }
                className="rounded-lg border border-[#1E293B] p-2 text-slate-300 hover:bg-[#111827] hover:text-white"
                aria-label="Вперёд на 1 секунду"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="font-mono-tabular text-xs text-slate-400">
              {currentProject ? `${currentProject.resolution} · ${currentProject.fps} fps` : '1920x1080 · 24 fps'}
            </div>
          </div>
        </div>

        {/* Clip Inspector */}
        <aside className="lg:col-span-4 rounded-xl border border-[#1E293B] bg-[#0B1120] p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white border-b border-[#1E293B] pb-3">
              Параметры клипа
            </h3>

            {selectedClip ? (
              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Название фрагмента
                  </label>
                  <input
                    type="text"
                    value={selectedClip.title}
                    onChange={(e) =>
                      updateTimelineClip(selectedClip.id, { title: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Начало (сек)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={selectedClip.startSec}
                      onChange={(e) =>
                        updateTimelineClip(selectedClip.id, {
                          startSec: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Длительность (сек)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={selectedClip.durationSec}
                      onChange={(e) =>
                        updateTimelineClip(selectedClip.id, {
                          durationSec: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white font-mono-tabular focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                </div>

                {selectedClip.trackId === 'v2' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Текст титра в кадре
                    </label>
                    <input
                      type="text"
                      value={selectedClip.overlayText || ''}
                      onChange={(e) =>
                        updateTimelineClip(selectedClip.id, { overlayText: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                )}

                {(selectedClip.trackId === 'v1' || selectedClip.trackId === 'v2') && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Непрозрачность</span>
                      <span className="font-mono-tabular">{selectedClip.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={selectedClip.opacity}
                      onChange={(e) =>
                        updateTimelineClip(selectedClip.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full accent-[#7C3AED]"
                    />
                  </div>
                )}

                {(selectedClip.trackId === 'a1' || selectedClip.trackId === 'a2') && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Громкость дорожки</span>
                      <span className="font-mono-tabular">{selectedClip.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selectedClip.volume}
                      onChange={(e) =>
                        updateTimelineClip(selectedClip.id, { volume: Number(e.target.value) })
                      }
                      className="w-full accent-[#7C3AED]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 text-xs leading-relaxed text-slate-400">
                Нажмите на любой клип на дорожках ниже, чтобы настроить его длительность, позицию или параметры слоя. Перетаскивайте клипы по горизонтали для сдвига по времени.
              </div>
            )}
          </div>

          {selectedClip && (
            <button
              type="button"
              onClick={() => {
                deleteTimelineClip(selectedClip.id);
                setSelectedClipId(null);
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Удалить с таймлайна</span>
            </button>
          )}
        </aside>
      </div>

      {/* Bottom Visual Timeline */}
      <section
        aria-label="Монтажный таймлайн"
        className="flex flex-1 min-h-[250px] flex-col overflow-hidden rounded-xl border border-[#1E293B] bg-[#0B1120]"
      >
        {/* Timeline Controls */}
        <div className="flex items-center justify-between border-b border-[#1E293B] px-4 py-2">
          <div className="text-xs font-semibold text-slate-200">
            Визуальный таймлайн ({projectClips.length} клипов)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPxPerSec((z) => Math.max(14, z - 6))}
              className="rounded p-1 text-slate-400 hover:bg-[#111827] hover:text-white"
              aria-label="Уменьшить масштаб"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono-tabular text-[11px] text-slate-400">
              {pxPerSec}px/с
            </span>
            <button
              type="button"
              onClick={() => setPxPerSec((z) => Math.min(64, z + 6))}
              className="rounded p-1 text-slate-400 hover:bg-[#111827] hover:text-white"
              aria-label="Увеличить масштаб"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tracks + Ruler */}
        <div
          className="flex flex-1 overflow-auto select-none"
          ref={timelineScrollRef}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
        >
          {/* Fixed Track Headers */}
          <div className="w-44 shrink-0 border-r border-[#1E293B] bg-[#080D1A]">
            <div className="h-8 border-b border-[#1E293B] px-3 flex items-center text-[11px] font-medium text-slate-500">
              Дорожки
            </div>
            {TRACKS.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.id}
                  className="flex h-12 items-center gap-2.5 border-b border-[#1E293B] px-3"
                >
                  <Icon className="h-3.5 w-3.5 text-[#A78BFA] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono-tabular text-xs font-semibold text-white">
                      {track.label}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">{track.sublabel}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable Track Grid */}
          <div
            className="relative flex-1 bg-[#060913]"
            style={{ minWidth: `${totalTimelineDuration * pxPerSec}px` }}
          >
            {/* Time Ruler */}
            <div
              onClick={handleRulerSeek}
              className="relative h-8 cursor-pointer border-b border-[#1E293B] bg-[#080D1A]"
            >
              {rulerMarkers.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 border-l border-[#1E293B] pl-1.5 pt-1 font-mono-tabular text-[10px] text-slate-500"
                >
                  {sec}s
                </div>
              ))}
            </div>

            {/* Track Rows */}
            {TRACKS.map((track) => {
              const trackClips = projectClips.filter((c) => c.trackId === track.id);
              const isAudio = track.id.startsWith('a');
              return (
                <div
                  key={track.id}
                  className="relative h-12 border-b border-[#1E293B]"
                >
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => handleClipPointerDown(e, clip)}
                        style={{
                          left: `${clip.startSec * pxPerSec}px`,
                          width: `${Math.max(28, clip.durationSec * pxPerSec)}px`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 flex items-center gap-2 overflow-hidden rounded-md border px-2 cursor-grab active:cursor-grabbing ${
                          isSelected
                            ? 'border-white bg-[#7C3AED] text-white'
                            : isAudio
                            ? 'border-indigo-500/40 bg-indigo-950/80 text-indigo-100 hover:border-indigo-400'
                            : 'border-[#7C3AED]/50 bg-[#1E1B4B] text-slate-100 hover:border-[#8B5CF6]'
                        }`}
                      >
                        {clip.thumbnail && (
                          <img
                            src={clip.thumbnail}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-6 w-9 shrink-0 rounded-sm object-cover"
                          />
                        )}
                        <span className="truncate text-[11px] font-medium">
                          {clip.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              style={{ left: `${playheadSec * pxPerSec}px` }}
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-[#A78BFA]"
            >
              <div className="h-3 w-3 -translate-x-1.5 bg-[#8B5CF6] rotate-45" />
            </div>
          </div>
        </div>
      </section>

      {/* Pick from Media Library Modal */}
      {isAddClipOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">
                Добавить материал на таймлайн
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClipOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {workspace.mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const trackId: TimelineTrackId = item.type === 'audio' ? 'a1' : 'v1';
                    const created = addTimelineClip({
                      projectId,
                      trackId,
                      title: item.title,
                      mediaId: item.id,
                      startSec: Number(playheadSec.toFixed(1)),
                      durationSec: item.durationSec || 6,
                      opacity: 100,
                      volume: item.type === 'audio' ? 80 : 0,
                      thumbnail: item.type === 'audio' ? undefined : item.url,
                    });
                    setSelectedClipId(created.id);
                    setIsAddClipOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-[#1E293B] bg-[#060913] px-3.5 py-2.5 text-left hover:border-[#7C3AED]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      {item.format} · {item.durationSec ? `${item.durationSec} с` : '6 с (кадр)'}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#A78BFA] shrink-0">
                    + Вставить
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
