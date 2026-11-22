import {
  ConnectionStatus,
  MediaType,
  ModelCategory,
  NavSection,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkflowNodeType,
} from '../types/studio';

export const SECTION_META: Record<
  NavSection,
  { title: string; subtitle: string; group: 'production' | 'architecture' | 'management' }
> = {
  dashboard: {
    title: 'Дашборд',
    subtitle: 'Сводка производственных показателей и активных проектов',
    group: 'production',
  },
  projects: {
    title: 'Проекты',
    subtitle: 'Управление видеопроектами, форматами и статусами',
    group: 'production',
  },
  studio: {
    title: 'Видеостудия',
    subtitle: 'Монтажный стол, многодорожечный таймлайн и предпросмотр',
    group: 'production',
  },
  media: {
    title: 'Медиатека',
    subtitle: 'Хранилище изображений, видеофрагментов и аудиодорожек',
    group: 'production',
  },
  workflow: {
    title: 'Конструктор воркфлоу',
    subtitle: 'Визуальная схема этапов производства с узлами и связями',
    group: 'architecture',
  },
  agents: {
    title: 'Менеджер агентов',
    subtitle: '10 зарезервированных слотов для будущих ИИ-агентов',
    group: 'architecture',
  },
  models: {
    title: 'Подключения моделей',
    subtitle: 'Подготовленные интерфейсы для будущей интеграции внешних API',
    group: 'architecture',
  },
  tasks: {
    title: 'Менеджер задач',
    subtitle: 'Контроль этапов, сроков и статусов производства',
    group: 'management',
  },
  settings: {
    title: 'Настройки',
    subtitle: 'Параметры студии, локальное хранилище и резервное копирование',
    group: 'management',
  },
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Черновик',
  in_progress: 'В работе',
  review: 'На проверке',
  completed: 'Завершён',
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  draft: 'text-slate-400',
  in_progress: 'text-violet-300',
  review: 'text-amber-300',
  completed: 'text-emerald-300',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  review: 'На проверке',
  completed: 'Завершено',
};

export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  pending: 'text-slate-400',
  in_progress: 'text-violet-300',
  review: 'text-amber-300',
  completed: 'text-emerald-300',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-300',
  high: 'text-rose-300',
};

export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
  video: 'Видео-генерация',
  image: 'Изображения',
  audio: 'Аудио и голос',
  llm: 'Текст и сценарии',
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  not_connected: 'Не подключено',
  draft_configured: 'Черновик настроен',
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: 'Изображение',
  video: 'Видео',
  audio: 'Аудио',
};

export const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  script: 'Сценарий',
  storyboard: 'Раскадровка',
  video_gen: 'Генерация видео',
  image_gen: 'Генерация кадра',
  voiceover: 'Озвучка / TTS',
  subtitles: 'Субтитры',
  export: 'Экспорт / Рендер',
};

export function formatTimecode(totalSeconds: number, fps = 24): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe - Math.floor(safe)) * fps);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `00:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

export function formatShortDuration(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
