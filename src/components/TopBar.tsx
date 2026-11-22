import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { SECTION_META } from '../utils/labels';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onQuickCreateProject: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  onQuickCreateProject,
}) => {
  const { activeSection, workspace, setActiveSection } = useStudioStore();
  const meta = SECTION_META[activeSection];
  const hasDemoItems =
    workspace.projects.some((p) => p.isDemo) ||
    workspace.mediaItems.some((m) => m.isDemo) ||
    workspace.tasks.some((t) => t.isDemo);

  const renderPrimaryAction = () => {
    if (activeSection === 'studio') {
      return (
        <button
          type="button"
          onClick={() => setActiveSection('media')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
        >
          Открыть медиатеку
        </button>
      );
    }
    if (activeSection === 'tasks') {
      return (
        <button
          type="button"
          onClick={() => setActiveSection('projects')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
        >
          К проектам
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onQuickCreateProject}
        className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
      >
        <Plus className="h-4 w-4" />
        <span>Новый проект</span>
      </button>
    );
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-[#1E293B] bg-[#080D1A] px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-400 hover:bg-[#111827] hover:text-white lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white truncate">
            <span>{meta.title}</span>
          </div>
          <p className="hidden sm:block truncate text-xs text-slate-400">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {workspace.settings.showDemoNotices && hasDemoItems && (
          <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
            Базовая версия · Демо-данные
          </span>
        )}
        {renderPrimaryAction()}
      </div>
    </header>
  );
};
