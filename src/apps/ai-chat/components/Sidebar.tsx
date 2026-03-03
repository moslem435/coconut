import { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from '../store/useChatStore';
import { useTranslation, useWindow } from '@/os/sdk';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import {
    Plus,
    Trash2,
    MessageSquare,
    Search,
    Settings,
    MoreHorizontal,
    PanelLeftClose,
    LogOut,
    Sparkles,
    Sliders
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getRelativeDateGroup } from '../utils/date';
import { AVAILABLE_MODELS } from '../hooks/useWebLLM';
import { CLOUD_MODELS, testCloudConnection } from '../hooks/useCloudLLM';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const { t } = useTranslation();
    const {
        sessions,
        currentSessionId,
        isSidebarOpen,
        createSession,
        selectSession,
        deleteSession,
        toggleSidebar,
        aiProvider,
        setAiProvider,
        cloudConfig,
        updateCloudConfig,
        customModels,
        addCustomModel,
        removeCustomModel,
        currentLocalModelId
    } = useChatStore();

    const deleteModel = async (modelId: string) => {
        try {
            if ('caches' in window) {
                await caches.delete(`webllm/model/${modelId}`);
                await caches.delete(`webllm/wasm/${modelId}`);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to delete model:", e);
            return false;
        }
    };

    const { update: updateWindow } = useWindow();
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
    const [sidebarMode, setSidebarMode] = useState<'chat' | 'settings'>('chat');

    // Model Manager State
    const [modelTab, setModelTab] = useState<'all' | 'downloaded' | 'cloud'>('all');
    const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
    const [cloudTestState, setCloudTestState] = useState<{ loading: boolean; message: string; ok: boolean | null }>({ loading: false, message: '', ok: null });
    const [showApiKey, setShowApiKey] = useState(false);
    
    // Preset saving state
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [presetName, setPresetName] = useState('');

    const handleSavePreset = () => {
        if (presetName.trim()) {
            addCustomModel({
                id: uuidv4(),
                name: presetName.trim(),
                provider: 'openai',
                modelId: cloudConfig.modelId,
                baseUrl: cloudConfig.baseUrl,
                apiKey: cloudConfig.apiKey
            });
            setIsSavingPreset(false);
            setPresetName('');
        }
    };

    // Check for cached models on mount and when menu opens
    useEffect(() => {
        const checkCachedModels = async () => {
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    const cachedIds = new Set<string>();

                    // Strategy 1: Check cache names (WebLLM often uses 'webllm/model' or 'webllm/wasm')
                    // But importantly, we need to inspect the CONTENTS of 'webllm/model'

                    let modelCache: Cache | null = null;
                    if (keys.includes('webllm/model')) {
                        modelCache = await caches.open('webllm/model');
                    } else if (keys.includes('webllm/config')) { // Newer versions might use config
                        modelCache = await caches.open('webllm/config');
                    }

                    if (modelCache) {
                        const requests = await modelCache.keys();
                        // The URLs usually contain the model ID or parts of it.
                        // e.g. https://.../Llama-3-8B-Instruct-q4f32_1-MLC/params_shard_0.bin

                        AVAILABLE_MODELS.forEach(model => {
                            // Check if ANY file related to this model exists in the cache
                            const hasFile = requests.some(req => req.url.includes(model.id));
                            if (hasFile) {
                                cachedIds.add(model.id);
                            }
                        });
                    }

                    // Fallback: Check for individual cache keys if strategy changed
                    keys.forEach(key => {
                        AVAILABLE_MODELS.forEach(model => {
                            if (key.includes(model.id)) {
                                cachedIds.add(model.id);
                            }
                        });
                    });

                    setCachedModels(cachedIds);
                } catch (e) {
                    console.error("Failed to check cache:", e);
                }
            }
        };

        if (sidebarMode === 'settings') {
            checkCachedModels();
        }
    }, [sidebarMode]);

    // Filter models based on tab
    const visibleModels = useMemo(() => AVAILABLE_MODELS.filter(m => {
        if (modelTab === 'downloaded') {
            return cachedModels.has(m.id);
        }
        return true;
    }), [modelTab, cachedModels]);

    const handleInitModel = (modelId: string) => {
        // This just sets the provider, actual loading happens in ChatArea via useWebLLM
        // But we need to signal intent. For now, let's assume selecting it is enough if we use currentLocalModelId store
        // However, useWebLLM handles initEngine. We might need to expose that or just rely on ChatArea to pick up changes?
        // Actually, initEngine is imperative.
        // For this refactor, we'll update the config in store if we had one, or just let the user know.
        // Since we can't easily call initEngine from here without moving useWebLLM up or using a global event,
        // we might need a way to trigger it.
        // A simple way is to use the existing `updateCloudConfig` or similar for local models?
        // Wait, `currentLocalModelId` in store is just state? No, it's from useWebLLM hook usually.
        // Let's look at useChatStore... it doesn't store currentLocalModelId for local.
        // We might need to dispatch an event or use a store field that ChatArea reacts to.
        
        // For now, let's just select it in UI and maybe emit an event or update a store value?
        // The original code called `initEngine(modelId)` directly in ChatArea.
        // We can use the EventBus or just add `selectedLocalModelId` to store and have ChatArea useEffect on it.
        
        // Let's use a custom event for now to keep it simple without changing store schema too much yet
        // Or better, just close the sidebar and let ChatArea handle it? No, we want it in sidebar.
        
        // Actually, we can just trigger a window event that ChatArea listens to?
        window.dispatchEvent(new CustomEvent('ai-chat:load-model', { detail: { modelId } }));
    };

    const handleDeleteModel = async (e: React.MouseEvent, modelId: string) => {
        e.stopPropagation();
        if (window.confirm(t('ai.model.delete_confirm').replace('{modelId}', modelId))) {
            const success = await deleteModel(modelId);
            if (success) {
                setCachedModels(prev => {
                    const next = new Set(prev);
                    next.delete(modelId);
                    return next;
                });
            }
        }
    };

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
        const appWindow = useWindowStore.getState().windows['ai-chat'];
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
                items: (groups[key] || []).sort((a, b) => b.updatedAt - a.updatedAt)
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

                {/* Mode Switcher */}
                <div className="flex p-1 bg-white/5 rounded-lg border border-white/5">
                    <button
                        onClick={() => setSidebarMode('chat')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all",
                            sidebarMode === 'chat'
                                ? "bg-white/10 text-zinc-100 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <MessageSquare size={14} />
                        {t('ai.sidebar.chats')}
                    </button>
                    <button
                        onClick={() => setSidebarMode('settings')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all",
                            sidebarMode === 'settings'
                                ? "bg-white/10 text-zinc-100 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Sliders size={14} />
                        {t('ai.header.models')}
                    </button>
                </div>

                {sidebarMode === 'chat' && (
                    <>
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
                    </>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar" style={{ minWidth: sidebarWidth }}>
                {sidebarMode === 'chat' ? (
                    /* ── Chat List ── */
                    groupedSessions.length === 0 ? (
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
                    )
                ) : (
                    /* ── Settings / Model Panel ── */
                    <div className="space-y-6 pb-10">
                        {/* Tabs */}
                        <div className="flex border-b border-white/5 pb-1">
                            <button
                                onClick={() => { setModelTab('all'); setAiProvider('local'); }}
                                className={cn(
                                    "flex-1 pb-2 text-[11px] font-medium transition-colors relative",
                                    modelTab === 'all' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {t('ai.model.tab.all')}
                                {modelTab === 'all' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                                )}
                            </button>
                            <button
                                onClick={() => { setModelTab('downloaded'); setAiProvider('local'); }}
                                className={cn(
                                    "flex-1 pb-2 text-[11px] font-medium transition-colors relative",
                                    modelTab === 'downloaded' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {t('ai.model.tab.downloaded')}
                                {modelTab === 'downloaded' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                                )}
                            </button>
                            <button
                                onClick={() => { setModelTab('cloud'); setAiProvider('cloud'); }}
                                className={cn(
                                    "flex-1 pb-2 text-[11px] font-medium transition-colors relative",
                                    modelTab === 'cloud' ? "text-amber-300" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Cloud
                                {modelTab === 'cloud' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                                )}
                            </button>
                        </div>

                        {modelTab === 'cloud' ? (
                            /* ── Cloud Config Panel ── */
                            <div className="space-y-4">
                                {/* Provider selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('ai.cloud.service')}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['gemini', 'openai'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => updateCloudConfig({ provider: p, modelId: CLOUD_MODELS[p][0]!.id })}
                                                className={cn(
                                                    "py-2 rounded-lg text-xs font-medium border transition-all text-center",
                                                    cloudConfig.provider === p
                                                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                                        : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                {p === 'gemini' ? t('ai.cloud.gemini') : t('ai.cloud.openai')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Model selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('ai.cloud.model_preset')}</label>
                                    <div className="space-y-1">
                                        {CLOUD_MODELS[cloudConfig.provider].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => updateCloudConfig({ modelId: m.id })}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all text-left",
                                                    cloudConfig.modelId === m.id
                                                        ? "bg-amber-500/10 text-amber-200 border-amber-500/20"
                                                        : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                <span className="font-medium truncate">{m.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Model & Base URL (OpenAI only) */}
                                {cloudConfig.provider === 'openai' && (
                                    <>
                                        {/* Saved Custom Models */}
                                        {customModels.filter(m => m.provider === 'openai').length > 0 && (
                                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('ai.cloud.saved_models')}</label>
                                                <div className="space-y-1">
                                                    {customModels.filter(m => m.provider === 'openai').map(m => (
                                                        <div key={m.id} className="flex items-center gap-2 group/model">
                                                            <button
                                                                onClick={() => updateCloudConfig({
                                                                    modelId: m.modelId,
                                                                    baseUrl: m.baseUrl || 'https://api.openai.com/v1',
                                                                    apiKey: m.apiKey || cloudConfig.apiKey
                                                                })}
                                                                className={cn(
                                                                    "flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all text-left",
                                                                    cloudConfig.modelId === m.modelId && (cloudConfig.baseUrl || 'https://api.openai.com/v1') === (m.baseUrl || 'https://api.openai.com/v1')
                                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                        : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10"
                                                                )}
                                                            >
                                                                <span className="font-medium truncate">{m.name}</span>
                                                                <span className="text-[9px] opacity-50 ml-2 font-mono">{m.modelId}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => removeCustomModel(m.id)}
                                                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors border border-white/5 opacity-0 group-hover/model:opacity-100"
                                                                title={t('ai.cloud.delete_preset')}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('ai.cloud.custom_config')}</label>
                                                {!isSavingPreset && (
                                                    <button
                                                        onClick={() => {
                                                            setPresetName(cloudConfig.modelId);
                                                            setIsSavingPreset(true);
                                                        }}
                                                        disabled={!cloudConfig.modelId}
                                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 hover:bg-indigo-500/20 disabled:opacity-50"
                                                    >
                                                        <Plus size={10} />
                                                        {t('ai.cloud.save_preset')}
                                                    </button>
                                                )}
                                            </div>

                                            {isSavingPreset && (
                                                <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] text-zinc-400">Preset Name</label>
                                                        <input
                                                            type="text"
                                                            value={presetName}
                                                            onChange={(e) => setPresetName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSavePreset();
                                                                if (e.key === 'Escape') setIsSavingPreset(false);
                                                            }}
                                                            placeholder="e.g. My Custom Model"
                                                            autoFocus
                                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/50 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 mt-1">
                                                        <button
                                                            onClick={() => setIsSavingPreset(false)}
                                                            className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-300 hover:bg-white/5 rounded transition-colors"
                                                        >
                                                            {t('common.cancel')}
                                                        </button>
                                                        <button
                                                            onClick={handleSavePreset}
                                                            disabled={!presetName.trim()}
                                                            className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {t('common.confirm')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-600">{t('ai.cloud.model_id')}</label>
                                                <input
                                                    type="text"
                                                    value={cloudConfig.modelId}
                                                    onChange={e => updateCloudConfig({ modelId: e.target.value })}
                                                    placeholder="e.g. deepseek-chat"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500/40 transition-colors font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] text-zinc-600">{t('ai.cloud.base_url')}</label>
                                            <input
                                                type="text"
                                                value={cloudConfig.baseUrl || ''}
                                                onChange={e => updateCloudConfig({ baseUrl: e.target.value })}
                                                placeholder="https://api.openai.com/v1"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500/40 transition-colors font-mono"
                                            />
                                            <p className="text-[9px] text-zinc-600">{t('ai.cloud.base_url_default')}</p>
                                        </div>
                                    </>
                                )}

                                {/* API Key */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('ai.cloud.api_key')}</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={cloudConfig.apiKey}
                                            onChange={e => updateCloudConfig({ apiKey: e.target.value })}
                                            placeholder={cloudConfig.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500/40 transition-colors font-mono"
                                        />
                                        <button
                                            onClick={() => setShowApiKey(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors text-[10px]"
                                        >
                                            {showApiKey ? t('ai.cloud.hide') : t('ai.cloud.show')}
                                        </button>
                                    </div>
                                </div>

                                {/* Test + Activate */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={async () => {
                                            setCloudTestState({ loading: true, message: t('ai.cloud.testing'), ok: null });
                                            const result = await testCloudConnection(cloudConfig, t);
                                            setCloudTestState({ loading: false, message: result.message, ok: result.ok });
                                        }}
                                        disabled={!cloudConfig.apiKey || cloudTestState.loading}
                                        className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-colors disabled:opacity-40"
                                    >
                                        {cloudTestState.loading ? t('ai.cloud.testing') : t('ai.cloud.test_connection')}
                                    </button>
                                    <button
                                        onClick={() => { setAiProvider('cloud'); }}
                                        disabled={!cloudConfig.apiKey}
                                        className="w-full py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-medium transition-colors disabled:opacity-40"
                                    >
                                        {aiProvider === 'cloud' ? t('ai.cloud.active') : t('ai.cloud.activate')}
                                    </button>
                                </div>

                                {/* Test result */}
                                {cloudTestState.message && (
                                    <div className={cn(
                                        "px-3 py-2 rounded-lg text-xs font-medium break-words",
                                        cloudTestState.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {cloudTestState.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── Local Model List ── */
                            <div className="space-y-2">
                                {visibleModels.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500">
                                        <p className="text-xs">{t('ai.model.no_models')}</p>
                                    </div>
                                ) : (
                                    visibleModels.map(model => {
                                        const isDownloaded = cachedModels.has(model.id);
                                        const isActive = currentLocalModelId === model.id;

                                        return (
                                            <div
                                                key={model.id}
                                                className={cn(
                                                    "group relative flex flex-col gap-2 p-3 rounded-xl transition-all border",
                                                    isActive
                                                        ? "bg-indigo-500/10 border-indigo-500/20"
                                                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                                                )}
                                            >
                                                {/* Selection Indicator */}
                                                {isActive && (
                                                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-indigo-500 rounded-r-full" />
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn(
                                                            "font-medium text-xs truncate",
                                                            isActive ? "text-indigo-200" : "text-zinc-200"
                                                        )}>
                                                            {model.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[9px] font-mono opacity-60 mb-2">
                                                        <span>{model.vram} {t('ai.model.vram')}</span>
                                                        <span>•</span>
                                                        <span>{model.size}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleInitModel(model.id)}
                                                        disabled={false} // Todo: check loading
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-md text-[10px] font-medium transition-colors border",
                                                            isActive
                                                                ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                                                                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {isActive ? t('ai.model.active') : (isDownloaded ? t('ai.model.switch') : t('ai.model.download'))}
                                                    </button>

                                                    {isDownloaded && !isActive && (
                                                        <button
                                                            onClick={(e) => handleDeleteModel(e, model.id)}
                                                            className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            title={t('ai.model.delete')}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

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
