import React from 'react';
import {
  Bot,
  CheckSquare,
  Clapperboard,
  Cpu,
  FolderKanban,
  GitBranch,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import { DEMO_ASSETS } from '../data/demoData';
import { useStudioStore } from '../store/useStudioStore';
import { NavSection } from '../types/studio';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: 'Производство',
    items: [
      { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { id: 'projects', label: 'Проекты', icon: FolderKanban },
      { id: 'studio', label: 'Видеостудия', icon: Clapperboard },
      { id: 'media', label: 'Медиатека', icon: ImageIcon },
    ],
  },
  {
    label: 'Архитектура',
    items: [
      { id: 'workflow', label: 'Воркфлоу', icon: GitBranch },
      { id: 'agents', label: 'Агенты (10)', icon: Bot },
      { id: 'models', label: 'Модели API', icon: Cpu },
    ],
  },
  {
    label: 'Управление',
    items: [
      { id: 'tasks', label: 'Задачи', icon: CheckSquare },
      { id: 'settings', label: 'Настройки', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeSection, setActiveSection, workspace } = useStudioStore();
  const occupiedSlots = workspace.agentSlots.filter((s) => s.status === 'reserved').length;

  const handleSelect = (id: NavSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#1E293B] bg-[#080D1A] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#1E293B] px-5">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#8B5CF6]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] text-white">
              <Clapperboard className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              {workspace.settings.studioName || 'AI VIDEO STUDIO'}
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-400 hover:bg-[#111827] hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Основная навигация">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500">
                {group.label}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#8B5CF6] ${
                          isActive
                            ? 'bg-[#7C3AED]/15 text-white border border-[#7C3AED]/40'
                            : 'text-slate-400 border border-transparent hover:bg-[#111827] hover:text-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? 'text-[#A78BFA]' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.id === 'agents' && (
                          <span className="font-mono-tabular text-xs text-slate-500">
                            {occupiedSlots}/10
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#1E293B] p-4">
          <div className="flex items-center gap-3">
            <img
              src={DEMO_ASSETS.avatar}
              alt="Профиль студии"
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-lg object-cover border border-[#1E293B]"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">
                Режиссёр студии
              </div>
              <div className="truncate text-xs text-slate-500">
                Локальное рабочее пространство
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
