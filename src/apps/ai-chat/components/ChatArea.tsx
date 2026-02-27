import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useLanguageStore } from '@/os/kernel/useLanguageStore';
import { useWebLLM, AVAILABLE_MODELS } from '../hooks/useWebLLM';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
    Send,
    StopCircle,
    User,
    Bot,
    Loader2,
    Sparkles,
    Download,
    AlertCircle,
    Settings,
    ArrowUpRightFromSquare,
    PanelLeft,
    Code2,
    PenTool,
    BrainCircuit,
    Zap,
    Copy,
    Check,
    Pencil,
    Play,
    Trash2,
    X,
    HardDrive,
    Cloud,
    ChevronDown,
    ChevronRight,
    Lightbulb,
    MessageSquare,
    Settings2,
    Hammer,
    Terminal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Tool Call Card Component
function ToolCallCard({ toolName, args, result }: { toolName: string, args: any, result?: string }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="my-2 rounded-lg border border-white/10 bg-black/20 overflow-hidden">
            <div
                className="flex items-center gap-2 px-3 py-2 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Terminal size={14} className="text-emerald-400" />
                <span className="text-xs font-mono text-emerald-300 flex-1">
                    {toolName}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                    {isExpanded ? 'Hide' : 'Show'}
                </span>
            </div>

            {isExpanded && (
                <div className="p-3 border-t border-white/5 space-y-2">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Arguments</div>
                        <pre className="text-[10px] font-mono text-zinc-300 bg-black/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(args, null, 2)}
                        </pre>
                    </div>
                    {result && (
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Result</div>
                            <pre className="text-[10px] font-mono text-zinc-300 bg-black/30 p-2 rounded overflow-x-auto max-h-32">
                                {result}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Thinking Process Component
function ThinkingProcess({ content }: { content: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useLanguageStore();

    return (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors text-left"
            >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Lightbulb size={14} className={cn("text-amber-500/80", isExpanded && "text-amber-400")} />
                <span>{t('ai.msg.thinking')}</span>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 text-xs text-zinc-400 border-t border-white/5 font-mono leading-relaxed bg-black/20 whitespace-pre-wrap">
                    {content.trim()}
                </div>
            )}
        </div>
    );
}

export function ChatArea() {
    const { t } = useLanguageStore();
    const {
        currentSessionId,
        sessions,
        createSession,
        addMessage,
        updateLastMessage,
        updateSessionTitle,
        modelSettings,
        isSidebarOpen,
        toggleSidebar
    } = useChatStore();

    // Window management
    const updateWindow = useWindowStore(state => state.updateWindow);
    const launchApp = useWindowStore(state => state.launchApp);
    const windowState = useWindowStore(state => state.windows['ai-chat']);
    const isSidebar = windowState?.isSidebar;

    // File system for saving apps
    const createFile = useFileSystemStore(state => state.createItem);

    // ... (keep existing detach logic)

    const handleRunApp = async (code: string, language: string) => {
        if (language !== 'tsx' && language !== 'jsx' && language !== 'javascript' && language !== 'typescript' && language !== 'js' && language !== 'ts') {
            return;
        }

        // 1. Create a temporary file
        const timestamp = Date.now();
        const fileName = `ai-app-${timestamp}.tsx`;
        // const filePath = `/home/user/apps/${fileName}`;

        // Ensure directory exists (simulation for now, or assume /home/user/apps exists)
        // For MVP, we'll rely on the fact that we can create file content directly or pass it

        try {
            // Option A: Save to file then launch
            // createFile('/home/user/apps', fileName, 'file', code);

            // Option B: Launch directly with code content (Simpler for now)
            launchApp(
                `code-runner-${timestamp}`,
                'AI App Preview',
                'code-runner',
                undefined,
                { code }
            );
        } catch (e) {
            console.error("Failed to run app:", e);
        }
    };

    const handleToggleSidebar = () => {
        toggleSidebar();
        if (windowState && !windowState.isMaximized && windowState.size) {
            updateWindow('ai-chat', {
                size: {
                    ...windowState.size,
                    width: windowState.size.width + 280
                }
            });
        }
    };

    const handleDetach = () => {
        if (!isSidebar) return;

        const width = 900;
        const height = 700;
        const x = (window.innerWidth - width) / 2;
        const y = (window.innerHeight - height) / 2;

        updateWindow('ai-chat', {
            isSidebar: false,
            position: { x, y },
            size: { width, height },
            isMaximized: false
        });
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);

    const {
        generateResponse,
        isLoading,
        progress,
        progressValue,
        isModelLoaded,
        initEngine,
        cancelLoading,
        downloadStats,
        error: engineError,
        currentModelId,
        deleteModel
    } = useWebLLM();

    const [input, setInput] = useState('');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposing, setIsComposing] = useState(false);

    // --- Streaming isolation from Zustand ---
    // During generation, content lives ONLY in local state (no Zustand writes).
    // This prevents any OS component from re-rendering while the LLM is streaming.
    const [streamingMessage, setStreamingMessage] = useState<Partial<any> | null>(null);

    // Copy state
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Title editing state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Chat Mode State
    const [chatMode, setChatMode] = useState<'chat' | 'control' | 'builder'>('chat');

    // Model Manager State
    const [modelTab, setModelTab] = useState<'all' | 'downloaded'>('all');
    const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());

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

        if (isModelMenuOpen) {
            checkCachedModels();
        }
    }, [isModelMenuOpen]);

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

    useEffect(() => {
        if (currentSession) {
            setTitleInput(currentSession.title);
        }
    }, [currentSession?.id, currentSession?.title]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleCopyMessage = async (content: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleTitleSubmit = () => {
        if (currentSessionId && titleInput.trim()) {
            updateSessionTitle(currentSessionId, titleInput.trim());
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingTitle(false);
            if (currentSession) setTitleInput(currentSession.title);
        }
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentSession?.messages.length, isLoading, progress]);

    // Handle input resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || !currentSessionId || isLoading) return;

        if (!isModelLoaded) {
            // Should be handled by UI state, but just in case
            return;
        }

        let userContent = input.trim();

        // Handle Slash Commands
        if (userContent.startsWith('/')) {
            const command = userContent.split(' ')[0]!.toLowerCase();
            const rest = userContent.slice(command.length).trim();

            if (command === '/chat') {
                setChatMode('chat');
                setInput('');
                return; // Just switch mode, don't send
            } else if (command === '/control' || command === '/sys') {
                setChatMode('control');
                setInput('');
                return;
            } else if (command === '/builder' || command === '/build') {
                setChatMode('builder');
                setInput('');
                return;
            } else if (command === '/clear') {
                // Clear command logic would go here if exposed
                return;
            }
            // If it's a command with content (e.g. "/theme dark"), we might want to process it
            // For now, we'll just send it as a message if it's not a mode switch
        }

        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // 1. Add user message
        addMessage(currentSessionId, 'user', userContent, chatMode);

        // 2. Add placeholder assistant message
        addMessage(currentSessionId, 'assistant', '');

        // 3. Generate
        const history = currentSession ? currentSession.messages : [];
        const messagesForEngine = [
            ...history,
            { id: 'temp-user', role: 'user' as const, content: userContent, timestamp: Date.now() }
        ];

        // Reset streaming state for this new generation
        setStreamingMessage({ content: '' });

        await generateResponse(
            messagesForEngine,
            // onUpdate: ONLY update local state — zero Zustand writes during streaming
            (updates) => {
                const patch = typeof updates === 'string' ? { content: updates } : updates;
                setStreamingMessage(prev => ({ ...(prev ?? {}), ...patch }));
            },
            // onNewMessage: tool results and intermediate assistant turns go to store
            (msg) => addMessage(currentSessionId, msg.role, msg.content, chatMode, msg.tool_calls, msg.tool_call_id),
            // onFinish: write final content to store ONCE, then clear local state
            () => {
                setStreamingMessage(prev => {
                    if (prev) updateLastMessage(currentSessionId, prev);
                    return null;
                });
            },
            // onError: write error to store, clear local state
            (err) => {
                setStreamingMessage(null);
                updateLastMessage(currentSessionId, { content: `Error: ${err.message || 'Unknown error'}` });
            },
            modelSettings.systemPrompt,
            chatMode
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInitModel = (modelId?: string) => {
        // Default model or from settings
        initEngine(modelId || 'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC');
    };

    if (!currentSession) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-zinc-500 select-none space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                    <Bot size={32} className="text-zinc-600" />
                </div>
                <p className="text-sm font-medium">{t('ai.msg.select_to_begin')}</p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => createSession(currentModelId || undefined)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <MessageSquare size={16} />
                        {t('ai.sidebar.new_chat')}
                    </button>
                    {!isSidebarOpen && (
                        <button
                            onClick={handleToggleSidebar}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-white/5"
                        >
                            <PanelLeft size={16} />
                            Open Sidebar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || t('ai.header.no_model_loaded');

    // Filter models based on tab
    const visibleModels = AVAILABLE_MODELS.filter(m => {
        if (modelTab === 'downloaded') {
            return cachedModels.has(m.id);
        }
        return true;
    });

    return (
        <div className={cn(
            "flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ease-in-out bg-transparent"
        )}>
            {/* Header */}
            <header className={cn(
                "h-16 flex items-center justify-between px-6 z-10 shrink-0",
                isSidebar && "pt-0",
                !isSidebar && "pt-0"
            )}>
                <div className="flex items-center gap-3 min-w-0 px-1 py-1.5">
                    {/* Show sidebar toggle button if sidebar is closed */}
                    {!isSidebarOpen && (
                        <button
                            onClick={handleToggleSidebar}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                            <PanelLeft size={16} />
                        </button>
                    )}
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2 min-w-[200px]">
                            <input
                                ref={titleInputRef}
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                onBlur={handleTitleSubmit}
                                onKeyDown={handleTitleKeyDown}
                                className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-sm text-zinc-200 outline-none w-full"
                            />
                        </div>
                    ) : (
                        <div
                            className="group flex items-center gap-2 cursor-pointer"
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            <span className="font-medium text-zinc-200 truncate max-w-[200px] text-sm select-none">
                                {currentSession?.title || t('ai.sidebar.new_chat')}
                            </span>
                            <Pencil size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    {/* Clickable Model Name */}
                    {/* Status Badge - Not Clickable */}
                    <div
                        className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 cursor-default select-none",
                            !isModelLoaded ? "text-amber-500/90 bg-amber-500/5 border border-amber-500/10" : "text-zinc-400"
                        )}
                    >
                        {!isModelLoaded && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {currentModelName}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isSidebar && (
                        <button
                            onClick={handleDetach}
                            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
                            title={t('ai.header.detach')}
                        >
                            <ArrowUpRightFromSquare size={16} />
                        </button>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 text-xs font-medium transition-all",
                                isModelMenuOpen ? "bg-white/5 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            <Settings size={14} />
                            <span>{t('ai.header.models')}</span>
                        </button>

                        {isModelMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                                    onClick={() => setIsModelMenuOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-[480px] bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-0 z-50 max-h-[600px] flex flex-col overflow-hidden ring-1 ring-black/50 animate-in fade-in zoom-in-95 duration-200">
                                    {/* Header */}
                                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                                <HardDrive size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-zinc-100">{t('ai.header.model_manager')}</h3>
                                                <p className="text-[11px] text-zinc-500">{t('ai.header.manage_models')}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsModelMenuOpen(false)}
                                            className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex px-4 pt-3 gap-4 border-b border-white/5 shrink-0">
                                        <button
                                            onClick={() => setModelTab('all')}
                                            className={cn(
                                                "pb-3 text-xs font-medium transition-colors relative",
                                                modelTab === 'all' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {t('ai.model.tab.all')}
                                            {modelTab === 'all' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setModelTab('downloaded')}
                                            className={cn(
                                                "pb-3 text-xs font-medium transition-colors relative flex items-center gap-1.5",
                                                modelTab === 'downloaded' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {t('ai.model.tab.downloaded')}
                                            <span className="bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px]">{cachedModels.size}</span>
                                            {modelTab === 'downloaded' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                                            )}
                                        </button>
                                    </div>

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {visibleModels.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                                <Cloud size={32} className="mb-3 opacity-20" />
                                                <p className="text-sm">{t('ai.model.no_models')}</p>
                                            </div>
                                        ) : (
                                            visibleModels.map(model => {
                                                const isDownloaded = cachedModels.has(model.id);
                                                const isActive = currentModelId === model.id;

                                                return (
                                                    <div
                                                        key={model.id}
                                                        className={cn(
                                                            "group relative flex items-start gap-3 p-3 rounded-xl transition-all border",
                                                            isActive
                                                                ? "bg-indigo-500/10 border-indigo-500/20"
                                                                : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                                                        )}
                                                    >
                                                        {/* Selection Indicator */}
                                                        {isActive && (
                                                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full" />
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={cn(
                                                                    "font-medium text-sm truncate",
                                                                    isActive ? "text-indigo-200" : "text-zinc-200"
                                                                )}>
                                                                    {model.name}
                                                                </span>
                                                                {model.recommended && (
                                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-emerald-500/20">
                                                                        {t('ai.model.recommended')}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
                                                                {t(model.description as any)}
                                                            </p>

                                                            <div className="flex items-center gap-3 text-[10px] font-mono opacity-80">
                                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                                    <Zap size={10} />
                                                                    <span>{model.vram} {t('ai.model.vram')}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                                    <Download size={10} />
                                                                    <span>{model.size}</span>
                                                                </div>
                                                                {isDownloaded && (
                                                                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded">
                                                                        <Check size={10} />
                                                                        <span>{t('ai.model.tab.downloaded')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    handleInitModel(model.id);
                                                                    setIsModelMenuOpen(false);
                                                                }}
                                                                disabled={isLoading}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                                    isActive
                                                                        ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                                                                        : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                                                                )}
                                                            >
                                                                {isActive ? t('ai.model.active') : (isDownloaded ? t('ai.model.switch') : t('ai.model.download'))}
                                                            </button>

                                                            {isDownloaded && !isActive && (
                                                                <button
                                                                    onClick={(e) => handleDeleteModel(e, model.id)}
                                                                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors self-end"
                                                                    title={t('ai.model.delete')}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar pb-32">
                {currentSession.messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full select-none pb-20">
                        {/* Loading State - Circular Progress */}
                        {isLoading && !isModelLoaded && (
                            <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-in fade-in duration-500">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    {/* Background Circle */}
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            className="text-zinc-800"
                                        />
                                        {/* Progress Circle */}
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeDasharray={364}
                                            strokeDashoffset={364 - (364 * progressValue)}
                                            strokeLinecap="round"
                                            className="text-indigo-500 transition-all duration-300 ease-out"
                                        />
                                    </svg>

                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-light text-zinc-200">
                                            {Math.round(progressValue * 100)}
                                            <span className="text-sm font-normal text-zinc-500 ml-0.5">%</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-medium text-zinc-200">
                                        {progressValue === 1 ? t('ai.loading.finalizing') : t('ai.loading.downloading')}
                                    </h3>
                                    <p className="text-sm text-zinc-500 max-w-[280px]">
                                        {/* If downloading, show generic 'Downloading' message instead of technical progress */}
                                        {(progress && (progress.startsWith('Fetching') || progress.includes('param cache')))
                                            ? t('ai.loading.downloading')
                                            : (progress || t('ai.loading.init'))
                                        }
                                    </p>
                                    {downloadStats && (
                                        <div className="flex items-center justify-center gap-3 text-xs font-mono text-zinc-400 bg-white/5 py-1.5 px-3 rounded-full">
                                            <span>{downloadStats.downloaded} / {downloadStats.total}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                            <span>{downloadStats.speed}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={cancelLoading}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-4 py-2 hover:bg-red-500/10 rounded-lg"
                                >
                                    {t('ai.loading.cancel')}
                                </button>
                            </div>
                        )}

                        {/* Empty State - No Model Loaded */}
                        {!isModelLoaded && !isLoading && !engineError && (
                            <div className="flex flex-col items-center gap-8 max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full opacity-20" />
                                    <BrainCircuit
                                        strokeWidth={1}
                                        className="w-24 h-24 text-zinc-600 relative z-10 opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-medium text-zinc-100">
                                        {t('ai.welcome.title')}
                                    </h2>
                                    <p className="text-zinc-500 leading-relaxed whitespace-pre-line">
                                        {t('ai.welcome.subtitle')}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                    <button
                                        onClick={() => handleInitModel()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl transition-all shadow-lg shadow-white/5 font-medium text-sm group"
                                    >
                                        <Download size={16} className="text-zinc-600 group-hover:text-zinc-900" />
                                        <span>{t('ai.welcome.load_default')}</span>
                                    </button>

                                    <button
                                        onClick={() => setIsModelMenuOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition-all border border-white/5 hover:border-white/10 font-medium text-sm"
                                    >
                                        <Settings size={16} className="text-zinc-500" />
                                        <span>{t('ai.welcome.choose_model')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Ready State - Model Loaded */}
                        {isModelLoaded && !isLoading && (
                            <>
                                <div className="relative mb-6">
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <Sparkles size={24} className="text-zinc-600" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-medium mb-2 text-zinc-200">
                                    {t('ai.welcome.ready_title')}
                                </h2>

                                <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg w-full px-4">
                                    {[
                                        { icon: Code2, label: t('ai.action.write_code'), desc: t('ai.action.write_code_desc') },
                                        { icon: PenTool, label: t('ai.action.creative_writing'), desc: t('ai.action.creative_writing_desc') },
                                        { icon: BrainCircuit, label: t('ai.action.explain_concept'), desc: t('ai.action.explain_concept_desc') },
                                        { icon: Zap, label: t('ai.action.brainstorm'), desc: t('ai.action.brainstorm_desc') }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(item.desc)}
                                            className="flex flex-col items-start p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-left group"
                                        >
                                            <item.icon size={18} className="mb-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                            <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                                            <span className="text-xs text-zinc-600 mt-1">{item.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Merge store messages with live streaming content.
                    During generation the last assistant placeholder is overridden by
                    streamingMessage so Zustand is NEVER written to mid-stream. */}
                {(() => {
                    const msgs = currentSession.messages;
                    const displayMessages = streamingMessage !== null
                        ? msgs.map((m, i) =>
                            i === msgs.length - 1 && m.role === 'assistant'
                                ? { ...m, ...streamingMessage }
                                : m
                        )
                        : msgs;

                    return displayMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-1">
                                    <Sparkles size={18} className="text-zinc-400" />
                                </div>
                            )}

                            <div className={cn(
                                "flex-1 min-w-0 px-5 py-3 max-w-[85%] group/msg relative",
                                msg.role === 'user'
                                    ? "bg-white/10 text-zinc-100 rounded-2xl rounded-tr-sm border border-white/5"
                                    : "text-zinc-300 pl-0 rounded-2xl rounded-tl-sm border bg-transparent border-transparent"
                            )}>
                                <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
                                    {msg.role === 'assistant' && msg.content && (
                                        (() => {
                                            // Check for thinking tags
                                            const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
                                            const thinkContent = thinkMatch ? thinkMatch[1] : null;
                                            const mainContent = thinkMatch
                                                ? msg.content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
                                                : msg.content;

                                            // Filter out empty JSON arrays or null content
                                            if (mainContent === '[]' || mainContent === '[""]' || !mainContent) {
                                                if (msg.tool_calls && msg.tool_calls.length > 0) {
                                                    // Only show tool calls if main content is empty
                                                } else {
                                                    return isLoading ? '...' : null;
                                                }
                                            }

                                            return (
                                                <>
                                                    {thinkContent && <ThinkingProcess content={thinkContent} />}

                                                    {/* Tool Calls Visualization */}
                                                    {msg.tool_calls && msg.tool_calls.map((toolCall: any, index: number) => {
                                                        // Find corresponding tool result if available (usually in next messages)
                                                        // For simplicity in this view, we might not link them perfectly yet
                                                        // But we can show the call itself
                                                        return (
                                                            <ToolCallCard
                                                                key={toolCall.id || index}
                                                                toolName={toolCall.function.name}
                                                                args={JSON.parse(toolCall.function.arguments || '{}')}
                                                            />
                                                        );
                                                    })}

                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        rehypePlugins={[rehypeHighlight]}
                                                        components={{
                                                            code({ node, inline, className, children, ...props }: any) {
                                                                const match = /language-(\w+)/.exec(className || '')
                                                                const codeContent = String(children).replace(/\n$/, '');
                                                                // Check if it's runnable code (React/JS/TS)
                                                                const isRunable = match && match[1] && (['tsx', 'jsx', 'javascript', 'typescript', 'js', 'ts'].includes(match[1]));

                                                                return !inline && match ? (
                                                                    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                                        <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5">
                                                                            <span className="text-[10px] text-zinc-500 font-mono uppercase">{match[1]}</span>
                                                                            {isRunable && (
                                                                                <button
                                                                                    onClick={() => handleRunApp(codeContent, match[1] || '')}
                                                                                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[10px] font-medium transition-colors border border-emerald-500/20"
                                                                                    title="Run this code as an app"
                                                                                >
                                                                                    <Play size={10} className="fill-current" />
                                                                                    {t('ai.msg.run_app')}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div className="p-4 overflow-x-auto">
                                                                            <code className={className} {...props}>
                                                                                {children}
                                                                            </code>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <code className={cn(className, "bg-white/10 px-1.5 py-0.5 rounded text-inherit font-normal border border-white/5")} {...props}>
                                                                        {children}
                                                                    </code>
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        {mainContent || (isLoading ? '...' : '')}
                                                    </ReactMarkdown>
                                                </>
                                            );
                                        })()
                                    )}
                                    {msg.role !== 'assistant' && (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                code({ node, inline, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return !inline && match ? (
                                                        <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                            <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5">
                                                                <span className="text-[10px] text-zinc-500 font-mono">{match[1]}</span>
                                                            </div>
                                                            <div className="p-4 overflow-x-auto">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <code className={cn(className, "bg-white/10 px-1.5 py-0.5 rounded text-inherit font-normal border border-white/5")} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    )}
                                </div>

                                {/* Copy Button for AI Messages */}
                                {msg.role === 'assistant' && !isLoading && (
                                    <div className="absolute -bottom-6 left-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                                            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                                            title={t('ai.msg.copy')}
                                        >
                                            {copiedMessageId === msg.id ? (
                                                <>
                                                    <Check size={14} className="text-emerald-500" />
                                                    <span className="text-[10px] text-emerald-500">{t('ai.msg.copied')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    <span className="text-[10px]">{t('ai.msg.copy')}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ));
                })()}

                {/* Loading Indicator / Progress - REMOVED, now in center */}

                {/* Engine Error */}
                {engineError && (
                    <div className="max-w-xl mx-auto bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200 backdrop-blur-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                        <div className="flex-1">
                            <h3 className="font-medium text-sm mb-1 text-red-400">{t('ai.loading.engine_error')}</h3>
                            <p className="text-xs opacity-80">{engineError}</p>
                            <button
                                onClick={() => handleInitModel()}
                                className="mt-3 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors"
                            >
                                {t('ai.loading.retry')}
                            </button>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 pointer-events-none">
                <div className="max-w-3xl mx-auto relative pointer-events-auto">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                        <button
                            onClick={() => setChatMode('chat')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                chatMode === 'chat'
                                    ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                                    : "bg-black/20 text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300 hover:border-white/10"
                            )}
                        >
                            <MessageSquare size={13} />
                            <span>{t('ai.mode.chat') || 'Chat'}</span>
                        </button>
                        <button
                            onClick={() => setChatMode('control')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                chatMode === 'control'
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                    : "bg-black/20 text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300 hover:border-white/10"
                            )}
                        >
                            <Settings2 size={13} />
                            <span>{t('ai.mode.control') || 'Control'}</span>
                        </button>
                        <button
                            onClick={() => setChatMode('builder')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                chatMode === 'builder'
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-lg shadow-amber-500/5"
                                    : "bg-black/20 text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300 hover:border-white/10"
                            )}
                        >
                            <Hammer size={13} />
                            <span>{t('ai.mode.builder') || 'Builder'}</span>
                        </button>
                    </div>

                    <div className={cn(
                        "relative bg-black/40 hover:bg-black/60 focus-within:bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 transition-all duration-300",
                        isComposing ? "ring-1 ring-white/10" : ""
                    )}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsComposing(true)}
                            onBlur={() => setIsComposing(false)}
                            placeholder={isModelLoaded ? t('ai.input.placeholder') : t('ai.input.placeholder_disabled')}
                            disabled={!isModelLoaded && !isLoading}
                            className={cn(
                                "w-full bg-transparent text-zinc-100 pl-5 pr-14 py-4 max-h-[200px] min-h-[56px] resize-none outline-none custom-scrollbar text-[15px] leading-relaxed transition-colors",
                                !isModelLoaded ? "placeholder:text-zinc-500 cursor-not-allowed" : "placeholder:text-zinc-600"
                            )}
                            rows={1}
                        />

                        <div className="absolute right-2 bottom-2">
                            {isLoading && !isModelLoaded ? (
                                <button
                                    onClick={cancelLoading}
                                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-all"
                                    title={t('ai.loading.cancel')}
                                >
                                    <StopCircle size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !isModelLoaded}
                                    className={cn(
                                        "p-2 rounded-lg transition-all duration-200",
                                        input.trim() && isModelLoaded
                                            ? "text-zinc-100 hover:bg-white/10"
                                            : "text-zinc-700 cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <Send size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-3">
                        <p className="text-[10px] text-zinc-600 font-medium">
                            {t('ai.input.footer')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
