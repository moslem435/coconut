import { useState, useMemo, useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useLanguageStore } from '@/os/kernel/useLanguageStore';
import { 
    Plus, 
    Trash2, 
    MessageSquare, 
    Search, 
    Settings, 
    MoreHorizontal, 
    PanelLeftClose, 
    LogOut,
    Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import { getRelativeDateGroup } from '../utils/date';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
    const { t } = useLanguageStore();
    const { 
        sessions, 
        currentSessionId, 
        isSidebarOpen, 
        createSession, 
        selectSession, 
        deleteSession,
        toggleSidebar
    } = useChatStore();

    const { updateWindow, windows } = useWindowStore();
    const appWindow = windows['ai-chat'];
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

    // Sidebar resize state
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!isResizing) return;
            e.preventDefault();
            
            // Calculate new width relative to sidebar left edge (assuming sidebar is on left)
            // Since sidebar is in a flex container, we can just use clientX if it's on the left of screen/window
            // But this is inside a window which might be moved.
            // We should use the delta or get the sidebar's bounding rect.
            
            if (sidebarRef.current) {
                const rect = sidebarRef.current.getBoundingClientRect();
                const newWidth = e.clientX - rect.left;
                // Clamp width
                const clampedWidth = Math.min(Math.max(newWidth, 240), 480);
                setSidebarWidth(clampedWidth);
            }
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            document.body.style.cursor = 'ew-resize';
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            document.body.style.cursor = 'default';
        };
    }, [isResizing]);

    const handleToggle = () => {
        toggleSidebar();
        if (appWindow && !appWindow.isMaximized) {
            updateWindow('ai-chat', {
                size: { 
                    ...appWindow.size, 
                    width: appWindow.size.width - sidebarWidth // Use current width
                }
            });
        }
    };

    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        return sessions.filter(s => 
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [sessions, searchQuery]);

    const groupedSessions = useMemo(() => {
        const groups: Record<string, typeof sessions> = {};
        
        filteredSessions.forEach(session => {
            const groupKey = getRelativeDateGroup(session.updatedAt);
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(session);
        });
        
        // Sort order for keys
        const order = ['ai.date.today', 'ai.date.yesterday', 'ai.date.previous_7_days', 'ai.date.previous_30_days', 'ai.date.older'];
        
        return order
            .filter(key => groups[key] && groups[key].length > 0)
            .map(key => ({
                title: key,
                items: groups[key].sort((a, b) => b.updatedAt - a.updatedAt)
            }));
    }, [filteredSessions]);

    return (
        <div 
            ref={sidebarRef}
            className={cn(
                "relative flex flex-col h-full bg-transparent ease-in-out overflow-hidden z-20",
                isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
            )}
            style={{ 
                width: isSidebarOpen ? sidebarWidth : 0,
                transition: isResizing ? 'none' : 'width 300ms ease-in-out, opacity 300ms ease-in-out, transform 300ms ease-in-out'
            }}
        >
            {/* Header Area */}
            <div className="p-4 space-y-4" style={{ minWidth: sidebarWidth }}>
                {/* Logo / Title Area */}
                <div className="flex items-center justify-between px-1">
                     <div className="flex items-center gap-2 text-zinc-100">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <Sparkles size={18} className="text-zinc-100" />
                        </div>
                        <span className="font-medium tracking-wide text-sm">{t('app.ai-chat')}</span>
                     </div>
                     <button 
                        onClick={handleToggle}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title={t('ai.sidebar.close')}
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>

                {/* New Chat Button */}
                <button 
                    onClick={() => createSession()}
                    className="group w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-lg transition-all border border-white/5 hover:border-white/10 font-medium text-sm"
                >
                    <Plus size={16} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                    <span>{t('ai.sidebar.new_chat')}</span>
                </button>

                {/* Search */}
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                    <input 
                        type="text"
                        placeholder={t('ai.sidebar.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-white/20 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar" style={{ minWidth: sidebarWidth }}>
                {groupedSessions.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-xs text-zinc-700">{t('ai.sidebar.no_chats')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedSessions.map((group) => (
                            <div key={group.title} className="space-y-1">
                                <h3 className="px-3 text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2 sticky top-0 py-1 z-10">
                                    {t(group.title as any)}
                                </h3>
                                {group.items.map(session => (
                                    <div 
                                        key={session.id}
                                        onMouseEnter={() => setHoveredSessionId(session.id)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        onClick={() => selectSession(session.id)}
                                        className={cn(
                                            "group/item relative flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all text-sm",
                                            currentSessionId === session.id 
                                                ? "bg-white/10 text-zinc-100 font-medium" 
                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        )}
                                    >
                                        {currentSessionId === session.id && (
                                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-zinc-100 rounded-full" />
                                        )}
                                        <MessageSquare size={14} className={cn(
                                            "shrink-0 transition-opacity",
                                            currentSessionId === session.id ? "opacity-100 text-zinc-100" : "opacity-50"
                                        )} />
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate text-[13px]">{session.title}</div>
                                        </div>

                                        {/* Actions - Visible on Hover or Active */}
                                        {(hoveredSessionId === session.id || currentSessionId === session.id) && (
                                            <div className="absolute right-2 flex items-center gap-1">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteSession(session.id);
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100"
                                                    title={t('ai.sidebar.delete')}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom User / Settings Area - REMOVED */}
            {/* <div className="p-3 border-t border-white/5 bg-transparent" style={{ minWidth: sidebarWidth }}>...</div> */}

            {/* Resize Handle / Border */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-50 group/handle flex justify-end"
                onPointerDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
            >
                 <div className={cn(
                     "w-[1px] h-full transition-colors duration-200",
                     isResizing ? "bg-white/40" : "bg-white/5 group-hover/handle:bg-white/20"
                 )} />
            </div>
        </div>
    );
}
