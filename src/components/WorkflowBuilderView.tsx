import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  Plus,
  RotateCcw,
  Share2,
  Subtitles,
  Trash2,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { WorkflowNode, WorkflowNodeType } from '../types/studio';
import { NODE_TYPE_LABELS } from '../utils/labels';

const NODE_WIDTH = 224;
const NODE_HEIGHT = 104;

const NODE_PALETTE: Array<{
  type: WorkflowNodeType;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'script', label: 'Сценарий', subtitle: 'Текст и структура', icon: FileText },
  { type: 'storyboard', label: 'Раскадровка', subtitle: 'Планы и сцены', icon: Layers },
  { type: 'image_gen', label: 'Кадр / Изображение', subtitle: 'Слот генерации', icon: ImageIcon },
  { type: 'video_gen', label: 'Видеогенерация', subtitle: 'Слот видео-модели', icon: Film },
  { type: 'voiceover', label: 'Озвучка / TTS', subtitle: 'Дикторская дорожка', icon: Mic },
  { type: 'subtitles', label: 'Субтитры', subtitle: 'Текстовый слой', icon: Subtitles },
  { type: 'export', label: 'Рендер / Экспорт', subtitle: 'Финальная сборка', icon: Share2 },
];

export const WorkflowBuilderView: React.FC = () => {
  const {
    workspace,
    setActiveProjectId,
    getProjectWorkflow,
    addWorkflowNode,
    updateWorkflowNode,
    deleteWorkflowNode,
    addWorkflowConnection,
    deleteWorkflowConnection,
    saveProjectWorkflow,
  } = useStudioStore();

  const currentProjectId =
    workspace.activeProjectId || workspace.projects[0]?.id || 'standalone';
  const workflow = getProjectWorkflow(currentProjectId);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [linkingFromNodeId, setLinkingFromNodeId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) || null;

  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedConnId(null);
    setLinkingFromNodeId(null);
  }, [currentProjectId]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    return {
      x: clientX - rect.left + scrollLeft,
      y: clientY - rect.top + scrollTop,
    };
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: WorkflowNode) => {
    if ((e.target as HTMLElement).closest('button[data-port="true"]')) return;
    e.stopPropagation();
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setSelectedNodeId(node.id);
    setSelectedConnId(null);
    setDragState({
      nodeId: node.id,
      offsetX: coords.x - node.x,
      offsetY: coords.y - node.y,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (dragState) {
      const nextX = Math.max(16, Math.round(coords.x - dragState.offsetX));
      const nextY = Math.max(16, Math.round(coords.y - dragState.offsetY));
      updateWorkflowNode(currentProjectId, dragState.nodeId, { x: nextX, y: nextY });
    } else if (linkingFromNodeId) {
      setPointerPos(coords);
    }
  };

  const handleCanvasPointerUp = () => {
    setDragState(null);
  };

  const handleOutputPortClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFromNodeId === nodeId) {
      setLinkingFromNodeId(null);
      setPointerPos(null);
      return;
    }
    const node = workflow.nodes.find((n) => n.id === nodeId);
    setLinkingFromNodeId(nodeId);
    if (node) {
      setPointerPos({ x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 });
    }
  };

  const handleInputPortClick = (e: React.MouseEvent, targetNodeId: string) => {
    e.stopPropagation();
    if (linkingFromNodeId && linkingFromNodeId !== targetNodeId) {
      addWorkflowConnection(currentProjectId, {
        fromNodeId: linkingFromNodeId,
        toNodeId: targetNodeId,
      });
      setLinkingFromNodeId(null);
      setPointerPos(null);
    }
  };

  const handleAddNode = (type: WorkflowNodeType) => {
    const template = NODE_PALETTE.find((p) => p.type === type);
    const count = workflow.nodes.length;
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type,
      title: template?.label || NODE_TYPE_LABELS[type],
      subtitle: template?.subtitle || 'Этап обработки',
      x: 80 + (count % 4) * 260,
      y: 80 + Math.floor(count / 4) * 150,
      notes: 'Узел подготовлен. Настройте параметры в правой панели.',
      targetSlot: 'Не назначен',
      isDemo: false,
    };
    addWorkflowNode(currentProjectId, newNode);
    setSelectedNodeId(newNode.id);
    setSelectedConnId(null);
  };

  const handleClearCanvas = () => {
    saveProjectWorkflow(currentProjectId, {
      projectId: currentProjectId,
      nodes: [],
      connections: [],
    });
    setSelectedNodeId(null);
    setSelectedConnId(null);
    setLinkingFromNodeId(null);
  };

  const renderBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const linkingSourceNode = workflow.nodes.find((n) => n.id === linkingFromNodeId);

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] min-h-[600px] max-w-[1600px] flex-col gap-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E293B] bg-[#0B1120] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-slate-400">Проект:</label>
          <select
            value={currentProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-1.5 text-xs font-medium text-white focus:border-[#8B5CF6] focus:outline-none"
          >
            {workspace.projects.length === 0 ? (
              <option value="standalone">Автономная схема</option>
            ) : (
              workspace.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))
            )}
          </select>

          <span className="hidden sm:inline text-xs text-slate-500 font-mono-tabular">
            Узлов: {workflow.nodes.length} · Связей: {workflow.connections.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {linkingFromNodeId ? (
            <button
              type="button"
              onClick={() => {
                setLinkingFromNodeId(null);
                setPointerPos(null);
              }}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 whitespace-nowrap"
            >
              Выберите входной порт узла (или нажмите для отмены)
            </button>
          ) : (
            <span className="hidden md:inline text-xs text-slate-400">
              Перетаскивайте узлы · Нажмите выходной порт справа → входной порт слева для связи
            </span>
          )}

          <button
            type="button"
            onClick={handleClearCanvas}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-300 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Очистить холст</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Builder */}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Palette */}
        <aside className="lg:col-span-2 flex flex-col rounded-xl border border-[#1E293B] bg-[#0B1120] p-3 overflow-y-auto">
          <div className="px-2 pb-2 text-xs font-semibold text-slate-300">Добавить узел</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
            {NODE_PALETTE.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddNode(item.type)}
                  className="flex items-center gap-2.5 rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2.5 text-left transition-colors hover:border-[#7C3AED] hover:bg-[#111827]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-white">{item.label}</div>
                    <div className="truncate text-[11px] text-slate-500">{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Interactive Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onClick={() => {
            setSelectedNodeId(null);
            setSelectedConnId(null);
            setLinkingFromNodeId(null);
            setPointerPos(null);
          }}
          className="lg:col-span-7 relative overflow-auto rounded-xl border border-[#1E293B] bg-[#060913] select-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="relative min-h-[640px] min-w-[1160px]">
            {/* SVG Connections */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {workflow.connections.map((conn) => {
                const from = workflow.nodes.find((n) => n.id === conn.fromNodeId);
                const to = workflow.nodes.find((n) => n.id === conn.toNodeId);
                if (!from || !to) return null;
                const x1 = from.x + NODE_WIDTH;
                const y1 = from.y + NODE_HEIGHT / 2;
                const x2 = to.x;
                const y2 = to.y + NODE_HEIGHT / 2;
                const d = renderBezierPath(x1, y1, x2, y2);
                const isSelected = selectedConnId === conn.id;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer">
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnId(conn.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={isSelected ? '#F43F5E' : '#8B5CF6'}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeOpacity={isSelected ? 1 : 0.75}
                    />
                  </g>
                );
              })}

              {linkingSourceNode && pointerPos && (
                <path
                  d={renderBezierPath(
                    linkingSourceNode.x + NODE_WIDTH,
                    linkingSourceNode.y + NODE_HEIGHT / 2,
                    pointerPos.x,
                    pointerPos.y
                  )}
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              )}
            </svg>

            {/* Draggable Nodes */}
            {workflow.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isSource = linkingFromNodeId === node.id;
              const paletteItem = NODE_PALETTE.find((p) => p.type === node.type);
              const Icon = paletteItem?.icon || Layers;

              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkingFromNodeId && linkingFromNodeId !== node.id) {
                      addWorkflowConnection(currentProjectId, {
                        fromNodeId: linkingFromNodeId,
                        toNodeId: node.id,
                      });
                      setLinkingFromNodeId(null);
                      setPointerPos(null);
                    } else {
                      setSelectedNodeId(node.id);
                      setSelectedConnId(null);
                    }
                  }}
                  style={{
                    transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                    width: `${NODE_WIDTH}px`,
                    height: `${NODE_HEIGHT}px`,
                  }}
                  className={`absolute top-0 left-0 flex flex-col justify-between rounded-xl border bg-[#0B1120] p-3.5 cursor-grab active:cursor-grabbing transition-colors ${
                    isSelected
                      ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6]/50'
                      : 'border-[#1E293B] hover:border-slate-600'
                  }`}
                >
                  {/* Input port */}
                  <button
                    type="button"
                    data-port="true"
                    onClick={(e) => handleInputPortClick(e, node.id)}
                    title="Входной порт (принять связь)"
                    className={`absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      linkingFromNodeId && linkingFromNodeId !== node.id
                        ? 'border-[#8B5CF6] bg-[#7C3AED] scale-110'
                        : 'border-slate-600 bg-[#060913] hover:border-[#8B5CF6]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </button>

                  {/* Output port */}
                  <button
                    type="button"
                    data-port="true"
                    onClick={(e) => handleOutputPortClick(e, node.id)}
                    title="Выходной порт (создать связь)"
                    className={`absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSource
                        ? 'border-white bg-[#7C3AED]'
                        : 'border-[#7C3AED] bg-[#060913] hover:bg-[#7C3AED]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </button>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                      <span className="truncate text-xs font-semibold text-white">
                        {node.title}
                      </span>
                    </div>
                  </div>

                  <div className="truncate text-[11px] text-slate-400">{node.subtitle}</div>

                  <div className="flex items-center justify-between border-t border-[#1E293B] pt-2 text-[11px] text-slate-500">
                    <span className="truncate">{node.targetSlot}</span>
                    <span className="font-mono-tabular shrink-0">
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                  </div>
                </div>
              );
            })}

            {workflow.nodes.length === 0 && (
              <div className="flex h-[500px] flex-col items-center justify-center text-center px-6">
                <GitBranchIcon />
                <h3 className="mt-3 text-sm font-semibold text-white">Холст воркфлоу пуст</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Выберите этап в левой панели, чтобы добавить первый узел и построить схему видеопроизводства.
                </p>
                <button
                  type="button"
                  onClick={() => handleAddNode('script')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Добавить узел «Сценарий»</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Inspector Panel */}
        <aside className="lg:col-span-3 flex flex-col rounded-xl border border-[#1E293B] bg-[#0B1120] p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white border-b border-[#1E293B] pb-3">
            Инспектор схемы
          </h3>

          {selectedConnId ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-300">Выбрана связь между узлами.</p>
              <button
                type="button"
                onClick={() => {
                  deleteWorkflowConnection(currentProjectId, selectedConnId);
                  setSelectedConnId(null);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Удалить связь</span>
              </button>
            </div>
          ) : selectedNode ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Название</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    updateWorkflowNode(currentProjectId, selectedNode.id, {
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Подзаголовок</label>
                <input
                  type="text"
                  value={selectedNode.subtitle}
                  onChange={(e) =>
                    updateWorkflowNode(currentProjectId, selectedNode.id, {
                      subtitle: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Назначенный слот (резерв)
                </label>
                <input
                  type="text"
                  value={selectedNode.targetSlot}
                  onChange={(e) =>
                    updateWorkflowNode(currentProjectId, selectedNode.id, {
                      targetSlot: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Заметки этапа</label>
                <textarea
                  rows={4}
                  value={selectedNode.notes}
                  onChange={(e) =>
                    updateWorkflowNode(currentProjectId, selectedNode.id, {
                      notes: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono-tabular pt-1">
                <span>Позиция X: {selectedNode.x}</span>
                <span>Y: {selectedNode.y}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  deleteWorkflowNode(currentProjectId, selectedNode.id);
                  setSelectedNodeId(null);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Удалить узел</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 text-xs leading-relaxed text-slate-400">
              <p>Выберите узел на холсте, чтобы отредактировать его название, параметры или заметки.</p>
              <p className="mt-3">
                Чтобы соединить два узла, нажмите на фиолетовый выходной порт справа от узла-источника, а затем на левый порт целевого узла.
              </p>
              <p className="mt-3">
                Нажмите на линию связи, чтобы выделить и удалить её.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

function GitBranchIcon() {
  return <Layers className="h-8 w-8 text-slate-500" />;
}
