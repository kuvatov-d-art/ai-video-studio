import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createEmptyAgentSlots,
  createEmptyWorkspace,
  createInitialDemoWorkspace,
} from '../data/demoData';
import {
  AgentSlot,
  MediaItem,
  ModelConnection,
  NavSection,
  Project,
  ProjectWorkflow,
  StudioSettings,
  TaskItem,
  TaskStatus,
  TimelineClip,
  WorkflowConnection,
  WorkflowNode,
  WorkspaceData,
} from '../types/studio';

const STORAGE_KEY = 'ai_video_studio_workspace_v1';

interface StudioContextValue {
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  workspace: WorkspaceData;
  // Projects
  createProject: (input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  // Workflows
  getProjectWorkflow: (projectId: string) => ProjectWorkflow;
  saveProjectWorkflow: (projectId: string, workflow: ProjectWorkflow) => void;
  addWorkflowNode: (projectId: string, node: WorkflowNode) => void;
  updateWorkflowNode: (projectId: string, nodeId: string, patch: Partial<WorkflowNode>) => void;
  deleteWorkflowNode: (projectId: string, nodeId: string) => void;
  addWorkflowConnection: (projectId: string, conn: Omit<WorkflowConnection, 'id'>) => void;
  deleteWorkflowConnection: (projectId: string, connId: string) => void;
  // Agent Slots (10 slots)
  updateAgentSlot: (slotNumber: number, patch: Partial<AgentSlot>) => void;
  clearAgentSlot: (slotNumber: number) => void;
  // Model Connections
  updateModelConnection: (id: string, patch: Partial<ModelConnection>) => void;
  addModelConnection: (conn: Omit<ModelConnection, 'id'>) => void;
  deleteModelConnection: (id: string) => void;
  // Media Library
  addMediaItem: (item: Omit<MediaItem, 'id' | 'createdAt'>) => MediaItem;
  deleteMediaItem: (id: string) => void;
  // Video Studio Timeline
  addTimelineClip: (clip: Omit<TimelineClip, 'id'>) => TimelineClip;
  updateTimelineClip: (id: string, patch: Partial<TimelineClip>) => void;
  deleteTimelineClip: (id: string) => void;
  // Tasks
  createTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => TaskItem;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  // Settings & Persistence
  updateSettings: (patch: Partial<StudioSettings>) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importWorkspaceJson: (raw: string) => { ok: boolean; error?: string };
}

const StudioContext = createContext<StudioContextValue | null>(null);

function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialDemoWorkspace();
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
    const fallback = createInitialDemoWorkspace();
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
      activeProjectId:
        typeof parsed.activeProjectId === 'string'
          ? parsed.activeProjectId
          : fallback.activeProjectId,
      workflows: parsed.workflows && typeof parsed.workflows === 'object' ? parsed.workflows : fallback.workflows,
      agentSlots:
        Array.isArray(parsed.agentSlots) && parsed.agentSlots.length === 10
          ? parsed.agentSlots
          : createEmptyAgentSlots(),
      modelConnections: Array.isArray(parsed.modelConnections)
        ? parsed.modelConnections
        : fallback.modelConnections,
      mediaItems: Array.isArray(parsed.mediaItems) ? parsed.mediaItems : fallback.mediaItems,
      timelineClips: Array.isArray(parsed.timelineClips)
        ? parsed.timelineClips
        : fallback.timelineClips,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fallback.tasks,
      settings: parsed.settings ? { ...fallback.settings, ...parsed.settings } : fallback.settings,
    };
  } catch {
    return createInitialDemoWorkspace();
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => loadWorkspace());

  useEffect(() => {
    if (!workspace.settings.autosave) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore quota errors cleanly
    }
  }, [workspace]);

  const createProject = (input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const id = `proj-${Date.now()}`;
    const now = todayISO();
    const project: Project = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
      isDemo: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
      activeProjectId: prev.activeProjectId || id,
      workflows: {
        ...prev.workflows,
        [id]: {
          projectId: id,
          nodes: [
            {
              id: `node-${Date.now()}-1`,
              type: 'script',
              title: 'Сценарий проекта',
              subtitle: input.title,
              x: 80,
              y: 120,
              notes: input.description || 'Начальный узел сценария.',
              targetSlot: 'Ручной ввод',
            },
            {
              id: `node-${Date.now()}-2`,
              type: 'export',
              title: 'Сборка и экспорт',
              subtitle: `${input.resolution} · ${input.fps} fps`,
              x: 420,
              y: 120,
              notes: 'Финальный узел таймлайна.',
              targetSlot: 'Видеостудия',
            },
          ],
          connections: [],
        },
      },
    }));
    return project;
  };

  const updateProject = (id: string, patch: Partial<Project>) => {
    setWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: todayISO() } : p
      ),
    }));
  };

  const deleteProject = (id: string) => {
    setWorkspace((prev) => {
      const remaining = prev.projects.filter((p) => p.id !== id);
      const nextWorkflows = { ...prev.workflows };
      delete nextWorkflows[id];
      return {
        ...prev,
        projects: remaining,
        activeProjectId:
          prev.activeProjectId === id ? remaining[0]?.id ?? '' : prev.activeProjectId,
        workflows: nextWorkflows,
        timelineClips: prev.timelineClips.filter((c) => c.projectId !== id),
        tasks: prev.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      };
    });
  };

  const setActiveProjectId = (id: string) => {
    setWorkspace((prev) => ({ ...prev, activeProjectId: id }));
  };

  const getProjectWorkflow = (projectId: string): ProjectWorkflow => {
    return (
      workspace.workflows[projectId] || {
        projectId,
        nodes: [],
        connections: [],
      }
    );
  };

  const saveProjectWorkflow = (projectId: string, workflow: ProjectWorkflow) => {
    setWorkspace((prev) => ({
      ...prev,
      workflows: {
        ...prev.workflows,
        [projectId]: workflow,
      },
    }));
  };

  const addWorkflowNode = (projectId: string, node: WorkflowNode) => {
    setWorkspace((prev) => {
      const current = prev.workflows[projectId] || { projectId, nodes: [], connections: [] };
      return {
        ...prev,
        workflows: {
          ...prev.workflows,
          [projectId]: {
            ...current,
            nodes: [...current.nodes, node],
          },
        },
      };
    });
  };

  const updateWorkflowNode = (
    projectId: string,
    nodeId: string,
    patch: Partial<WorkflowNode>
  ) => {
    setWorkspace((prev) => {
      const current = prev.workflows[projectId];
      if (!current) return prev;
      return {
        ...prev,
        workflows: {
          ...prev.workflows,
          [projectId]: {
            ...current,
            nodes: current.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
          },
        },
      };
    });
  };

  const deleteWorkflowNode = (projectId: string, nodeId: string) => {
    setWorkspace((prev) => {
      const current = prev.workflows[projectId];
      if (!current) return prev;
      return {
        ...prev,
        workflows: {
          ...prev.workflows,
          [projectId]: {
            ...current,
            nodes: current.nodes.filter((n) => n.id !== nodeId),
            connections: current.connections.filter(
              (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
            ),
          },
        },
      };
    });
  };

  const addWorkflowConnection = (
    projectId: string,
    conn: Omit<WorkflowConnection, 'id'>
  ) => {
    if (conn.fromNodeId === conn.toNodeId) return;
    setWorkspace((prev) => {
      const current = prev.workflows[projectId] || { projectId, nodes: [], connections: [] };
      const duplicate = current.connections.some(
        (c) => c.fromNodeId === conn.fromNodeId && c.toNodeId === conn.toNodeId
      );
      if (duplicate) return prev;
      const newConn: WorkflowConnection = {
        ...conn,
        id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      return {
        ...prev,
        workflows: {
          ...prev.workflows,
          [projectId]: {
            ...current,
            connections: [...current.connections, newConn],
          },
        },
      };
    });
  };

  const deleteWorkflowConnection = (projectId: string, connId: string) => {
    setWorkspace((prev) => {
      const current = prev.workflows[projectId];
      if (!current) return prev;
      return {
        ...prev,
        workflows: {
          ...prev.workflows,
          [projectId]: {
            ...current,
            connections: current.connections.filter((c) => c.id !== connId),
          },
        },
      };
    });
  };

  const updateAgentSlot = (slotNumber: number, patch: Partial<AgentSlot>) => {
    setWorkspace((prev) => ({
      ...prev,
      agentSlots: prev.agentSlots.map((slot) =>
        slot.slotNumber === slotNumber
          ? {
              ...slot,
              ...patch,
              updatedAt: todayISO(),
            }
          : slot
      ),
    }));
  };

  const clearAgentSlot = (slotNumber: number) => {
    setWorkspace((prev) => ({
      ...prev,
      agentSlots: prev.agentSlots.map((slot) =>
        slot.slotNumber === slotNumber
          ? {
              slotNumber,
              status: 'empty',
              name: '',
              role: '',
              targetModelCategory: 'Не выбрано',
              notes: '',
              updatedAt: null,
            }
          : slot
      ),
    }));
  };

  const updateModelConnection = (id: string, patch: Partial<ModelConnection>) => {
    setWorkspace((prev) => ({
      ...prev,
      modelConnections: prev.modelConnections.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    }));
  };

  const addModelConnection = (conn: Omit<ModelConnection, 'id'>) => {
    const newConn: ModelConnection = {
      ...conn,
      id: `mod-${Date.now()}`,
      isDemo: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      modelConnections: [...prev.modelConnections, newConn],
    }));
  };

  const deleteModelConnection = (id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      modelConnections: prev.modelConnections.filter((m) => m.id !== id),
    }));
  };

  const addMediaItem = (item: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const newItem: MediaItem = {
      ...item,
      id: `media-${Date.now()}`,
      createdAt: todayISO(),
      isDemo: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      mediaItems: [newItem, ...prev.mediaItems],
    }));
    return newItem;
  };

  const deleteMediaItem = (id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      mediaItems: prev.mediaItems.filter((m) => m.id !== id),
    }));
  };

  const addTimelineClip = (clip: Omit<TimelineClip, 'id'>): TimelineClip => {
    const newClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      isDemo: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      timelineClips: [...prev.timelineClips, newClip],
    }));
    return newClip;
  };

  const updateTimelineClip = (id: string, patch: Partial<TimelineClip>) => {
    setWorkspace((prev) => ({
      ...prev,
      timelineClips: prev.timelineClips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const deleteTimelineClip = (id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      timelineClips: prev.timelineClips.filter((c) => c.id !== id),
    }));
  };

  const createTask = (task: Omit<TaskItem, 'id' | 'createdAt'>): TaskItem => {
    const newTask: TaskItem = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: todayISO(),
      isDemo: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    return newTask;
  };

  const updateTask = (id: string, patch: Partial<TaskItem>) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    updateTask(id, { status });
  };

  const deleteTask = (id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const updateSettings = (patch: Partial<StudioSettings>) => {
    setWorkspace((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const resetToDemoData = () => {
    const fresh = createInitialDemoWorkspace();
    setWorkspace(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  const clearAllData = () => {
    const empty = createEmptyWorkspace();
    setWorkspace(empty);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
  };

  const importWorkspaceJson = (raw: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
      if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
        return { ok: false, error: 'Неверная структура файла резервной копии.' };
      }
      const fallback = createEmptyWorkspace();
      const next: WorkspaceData = {
        ...fallback,
        ...parsed,
        agentSlots:
          Array.isArray(parsed.agentSlots) && parsed.agentSlots.length === 10
            ? parsed.agentSlots
            : createEmptyAgentSlots(),
        settings: parsed.settings ? { ...fallback.settings, ...parsed.settings } : fallback.settings,
      };
      setWorkspace(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка чтения JSON-файла.' };
    }
  };

  return (
    <StudioContext.Provider
      value={{
        activeSection,
        setActiveSection,
        workspace,
        createProject,
        updateProject,
        deleteProject,
        setActiveProjectId,
        getProjectWorkflow,
        saveProjectWorkflow,
        addWorkflowNode,
        updateWorkflowNode,
        deleteWorkflowNode,
        addWorkflowConnection,
        deleteWorkflowConnection,
        updateAgentSlot,
        clearAgentSlot,
        updateModelConnection,
        addModelConnection,
        deleteModelConnection,
        addMediaItem,
        deleteMediaItem,
        addTimelineClip,
        updateTimelineClip,
        deleteTimelineClip,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        updateSettings,
        resetToDemoData,
        clearAllData,
        importWorkspaceJson,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudioStore() {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error('useStudioStore must be used inside StudioProvider');
  }
  return ctx;
}
