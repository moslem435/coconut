
import { PanelLeft, Pencil, ArrowUpRightFromSquare, Minus, Maximize2, Minimize2, X, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/os/sdk';
import { useChatStore } from '../../store/useChatStore';

interface ChatHeaderProps {
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    isEditingTitle: boolean;
    titleInput: string;
    onTitleChange: (value: string) => void;
    onTitleSubmit: () => void;
    onTitleKeyDown: (e: React.KeyboardEvent) => void;
    onStartEditTitle: () => void;
    currentSessionTitle: string;
    isModelLoaded: boolean;
    currentModelName: string;
    aiProvider: string;
    isSidebar: boolean;
    isMaximized: boolean;
    onDetach: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
    onDragStart: (e: React.PointerEvent) => void;
}

export function ChatHeader({
    isSidebarOpen,
    onToggleSidebar,
    isEditingTitle,
    titleInput,
    onTitleChange,
    onTitleSubmit,
    onTitleKeyDown,
    onStartEditTitle,
    currentSessionTitle,
    isModelLoaded,
    currentModelName,
    aiProvider,
    isSidebar,
    isMaximized,
    onDetach,
    onMinimize,
    onMaximize,
    onClose,
    onDragStart
}: ChatHeaderProps) {
    const { t } = useTranslation();

    return (
        <header
            onPointerDown={onDragStart}
            className={cn(
                "h-16 flex items-center justify-between px-6 z-10 shrink-0 select-none",
                isSidebar && "pt-0",
                !isSidebar && "pt-0"
            )}>
            <div className="flex items-center gap-3 min-w-0 px-1 py-1.5" onPointerDown={(e) => e.stopPropagation()}>
                {/* Show sidebar toggle button if sidebar is closed */}
                {!isSidebarOpen && (
                    <button
                        onClick={onToggleSidebar}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                        <PanelLeft size={16} />
                    </button>
                )}
                {isEditingTitle ? (
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <input
                            autoFocus
                            value={titleInput}
                            onChange={(e) => onTitleChange(e.target.value)}
                            onBlur={onTitleSubmit}
                            onKeyDown={onTitleKeyDown}
                            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-0.5 text-sm text-zinc-900 dark:text-zinc-200 outline-none w-full"
                        />
                    </div>
                ) : (
                    <div
                        className="group flex items-center gap-2 cursor-pointer"
                        onDoubleClick={onStartEditTitle}
                    >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] text-sm select-none">
                            {currentSessionTitle || t('ai.sidebar.new_chat')}
                        </span>
                        <Pencil size={12} className="text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* Status Badge */}
                <div
                    className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 cursor-default select-none",
                        !isModelLoaded ? "text-amber-600 dark:text-amber-500/90 bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/10" : "text-zinc-500 dark:text-zinc-400"
                    )}
                >
                    {!isModelLoaded && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                    {aiProvider === 'cloud' && <Cloud size={12} className="text-indigo-500 dark:text-indigo-400" />}
                    {currentModelName}
                </div>
            </div>

            <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                {isSidebar && (
                    <button
                        onClick={onDetach}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                        title={t('ai.header.detach')}
                    >
                        <ArrowUpRightFromSquare size={16} />
                    </button>
                )}

                {!isSidebar && (
                    <div className="flex items-center h-8 ml-2 border-l border-black/10 dark:border-white/10 pl-2 gap-1">
                        <button
                            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            onClick={onMinimize}
                            title={t('menu.minimize')}
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            onClick={onMaximize}
                            title={isMaximized ? t('menu.restore') : t('menu.maximize')}
                        >
                            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button
                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
                            onClick={onClose}
                            title={t('menu.close')}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
