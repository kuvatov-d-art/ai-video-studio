export type NavSection =
  | 'dashboard'
  | 'projects'
  | 'workflow'
  | 'agents'
  | 'models'
  | 'media'
  | 'studio'
  | 'tasks'
  | 'settings';

export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'completed';

export interface Project {
  id: string;
  title: string;
  description: string;
  format: '16:9' | '9:16' | '1:1';
  resolution: '1920x1080' | '3840x2160' | '1080x1920' | '1080x1080';
  fps: 24 | 30 | 60;
  status: ProjectStatus;
  durationSec: number;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type WorkflowNodeType =
  | 'script'
  | 'storyboard'
  | 'video_gen'
  | 'image_gen'
  | 'voiceover'
  | 'subtitles'
  | 'export';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  notes: string;
  targetSlot: string;
  isDemo?: boolean;
}

export interface WorkflowConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface ProjectWorkflow {
  projectId: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export type AgentSlotStatus = 'empty' | 'reserved';

export interface AgentSlot {
  slotNumber: number;
  status: AgentSlotStatus;
  name: string;
  role: string;
  targetModelCategory: string;
  notes: string;
  updatedAt: string | null;
}

export type ModelCategory = 'video' | 'image' | 'audio' | 'llm';
export type ConnectionStatus = 'not_connected' | 'draft_configured';

export interface ModelConnection {
  id: string;
  name: string;
  category: ModelCategory;
  protocol: string;
  endpointDraft: string;
  timeoutSec: number;
  status: ConnectionStatus;
  description: string;
  capabilities: string[];
  notes: string;
  isDemo?: boolean;
}

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  format: string;
  durationSec: number | null;
  sizeLabel: string;
  resolution: string;
  url: string;
  projectId: string | null;
  createdAt: string;
  isDemo?: boolean;
}

export type TimelineTrackId = 'v1' | 'v2' | 'a1' | 'a2';

export interface TimelineClip {
  id: string;
  projectId: string;
  trackId: TimelineTrackId;
  title: string;
  mediaId: string | null;
  startSec: number;
  durationSec: number;
  opacity: number;
  volume: number;
  thumbnail?: string;
  overlayText?: string;
  isDemo?: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeLabel: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface StudioSettings {
  studioName: string;
  defaultResolution: '1920x1080' | '3840x2160' | '1080x1920';
  defaultFps: 24 | 30 | 60;
  autosave: boolean;
  showDemoNotices: boolean;
  compactTables: boolean;
}

export interface WorkspaceData {
  projects: Project[];
  activeProjectId: string;
  workflows: Record<string, ProjectWorkflow>;
  agentSlots: AgentSlot[];
  modelConnections: ModelConnection[];
  mediaItems: MediaItem[];
  timelineClips: TimelineClip[];
  tasks: TaskItem[];
  settings: StudioSettings;
}
