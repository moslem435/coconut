import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useTranslation, useWindow } from '@/os/sdk';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import { useShallow } from 'zustand/react/shallow';
import { useWindowContext } from '@/os/kernel/WindowContext';
import { useWebLLM, AVAILABLE_MODELS } from '../hooks/useWebLLM';
import { useCloudLLM, CLOUD_MODELS, testCloudConnection } from '../hooks/useCloudLLM';
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
    Minus,
    Maximize2,
    Minimize2,
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
    const { t } = useTranslation();

    return (
        <div className="my-2 rounded-lg border border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/20 overflow-hidden">
            <div
                className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Terminal size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 flex-1">
                    {toolName}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                    {isExpanded ? t('ai.cloud.hide') : t('ai.cloud.show')}
                </span>
            </div>

            {isExpanded && (
                <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-2">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{t('ai.tool.arguments')}</div>
                        <pre className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-black/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(args, null, 2)}
                        </pre>
                    </div>
                    {result && (
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{t('ai.tool.result')}</div>
                            <pre className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-black/30 p-2 rounded overflow-x-auto max-h-32">
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
    const { t } = useTranslation();

    return (
        <div className="mb-4 rounded-lg border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Lightbulb size={14} className={cn("text-amber-600/80 dark:text-amber-500/80", isExpanded && "text-amber-500 dark:text-amber-400")} />
                <span>{t('ai.msg.thinking')}</span>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 border-t border-black/5 dark:border-white/5 font-mono leading-relaxed bg-black/5 dark:bg-black/20 whitespace-pre-wrap">
                    {content.trim()}
                </div>
            )}
        </div>
    );
}

export function ChatArea() {
    const { t } = useTranslation();
    const {
        currentSessionId,
        sessions,
        createSession,
        addMessage,
        updateLastMessage,
        updateSessionTitle,
        modelSettings,
        isSidebarOpen,
        toggleSidebar,
        aiProvider,
        cloudConfig,
        setAiProvider,
        updateCloudConfig,
        setCurrentLocalModelId
    } = useChatStore();

    // Window management
    const { update: updateWindow, launch: launchApp, minimize, maximize, close } = useWindow();
    const windowContext = useWindowContext();
    const { isSidebar, isMaximized } = useWindowStore(useShallow(state => ({
        isSidebar: state.windows['ai-chat']?.isSidebar,
        isMaximized: state.windows['ai-chat']?.isMaximized
    })));

    // ... (keep existing detach logic)

    const handleRunApp = async (code: string, language: string) => {
        const supportedLangs = ['tsx', 'jsx', 'javascript', 'typescript', 'js', 'ts', 'html'];
        if (!supportedLangs.includes(language)) {
            return;
        }

        const timestamp = Date.now();

        try {
            launchApp(
                `code-runner-${timestamp}`,
                'AI App Preview',
                'code-runner',
                undefined,
                { code, language }
            );
        } catch (e) {
            console.error("Failed to run app:", e);
        }
    };

    const handleToggleSidebar = () => {
        toggleSidebar();
        const windowState = useWindowStore.getState().windows['ai-chat'];
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

    const webLLM = useWebLLM();
    const cloudLLM = useCloudLLM();
    const activeLLM = aiProvider === 'cloud' ? cloudLLM : webLLM;

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
    } = activeLLM as typeof webLLM;

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposing, setIsComposing] = useState(false);

    // Sync local model ID to global store for Sidebar
    useEffect(() => {
        if (activeLLM.currentModelId) {
            setCurrentLocalModelId(activeLLM.currentModelId);
        }
    }, [activeLLM.currentModelId, setCurrentLocalModelId]);

    // Listen for model load requests from Sidebar
    useEffect(() => {
        const handleLoadModel = (e: CustomEvent<{ modelId: string }>) => {
            if (e.detail?.modelId) {
                initEngine(e.detail.modelId);
            }
        };
        window.addEventListener('ai-chat:load-model', handleLoadModel as EventListener);
        return () => window.removeEventListener('ai-chat:load-model', handleLoadModel as EventListener);
    }, [initEngine]);

    // --- Streaming isolation from Zustand ---
    // During generation, content lives ONLY in local state (no Zustand writes).
    // This prevents any OS component from re-rendering while the LLM is streaming.
    const [streamingMessage, setStreamingMessage] = useState<Partial<any> | null>(null);
    const streamingMessageRef = useRef<Partial<any> | null>(null);

    // Copy state
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Title editing state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Chat Mode State
    const [chatMode, setChatMode] = useState<'chat' | 'control' | 'builder'>('chat');

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
        streamingMessageRef.current = { content: '' };

        await generateResponse(
            messagesForEngine,
            // onUpdate: ONLY update local state — zero Zustand writes during streaming
            (updates) => {
                const patch = typeof updates === 'string' ? { content: updates } : updates;
                streamingMessageRef.current = { ...(streamingMessageRef.current ?? {}), ...patch };
                setStreamingMessage(prev => ({ ...(prev ?? {}), ...patch }));
            },
            // onNewMessage: tool results and intermediate assistant turns go to store
            (msg) => addMessage(currentSessionId, msg.role, msg.content, chatMode, msg.tool_calls, msg.tool_call_id),
            // onFinish: write final content to store ONCE, then clear local state
            () => {
                const finalMessage = streamingMessageRef.current;
                if (finalMessage) {
                    updateLastMessage(currentSessionId, finalMessage);
                }
                streamingMessageRef.current = null;
                setStreamingMessage(null);
            },
            // onError: write error to store, clear local state
            (err) => {
                streamingMessageRef.current = null;
                setStreamingMessage(null);
                updateLastMessage(currentSessionId, { content: `Error: ${err.message || 'Unknown error'}` });
            },
            modelSettings.systemPrompt,
            chatMode,
            aiProvider === 'cloud' ? cloudConfig : undefined
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
                <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                    <Bot size={32} className="text-zinc-500 dark:text-zinc-400" />
                </div>
                <p className="text-sm font-medium">{t('ai.msg.select_to_begin')}</p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => createSession((aiProvider === 'cloud' ? cloudConfig.modelId : currentModelId) || undefined)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <MessageSquare size={16} />
                        {t('ai.sidebar.new_chat')}
                    </button>
                    {!isSidebarOpen && (
                        <button
                            onClick={handleToggleSidebar}
                            className="px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-black/5 dark:border-white/5"
                        >
                            <PanelLeft size={16} />
                            {t('ai.sidebar.open')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const currentModelName = (() => {
        if (aiProvider === 'cloud') {
            const id = cloudConfig.modelId;
            for (const provider of Object.values(CLOUD_MODELS)) {
                const model = provider.find(m => m.id === id);
                if (model) return model.name;
            }
            return id || 'Cloud Model';
        }
        return AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || t('ai.header.no_model_loaded');
    })();

    // Filter models based on tab
    // Removed local filtering logic as it's now in Sidebar

    return (
        <div className={cn(
            "flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ease-in-out bg-transparent"
        )}>
            {/* Header */}
            <header
                onPointerDown={(e) => {
                    if (windowContext?.dragControls) {
                        windowContext.dragControls.start(e);
                    }
                }}
                className={cn(
                    "h-16 flex items-center justify-between px-6 z-10 shrink-0 select-none",
                    isSidebar && "pt-0",
                    !isSidebar && "pt-0"
                )}>
                <div className="flex items-center gap-3 min-w-0 px-1 py-1.5" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Show sidebar toggle button if sidebar is closed */}
                    {!isSidebarOpen && (
                        <button
                            onClick={handleToggleSidebar}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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
                                className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-0.5 text-sm text-zinc-900 dark:text-zinc-200 outline-none w-full"
                            />
                        </div>
                    ) : (
                        <div
                            className="group flex items-center gap-2 cursor-pointer"
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] text-sm select-none">
                                {currentSession?.title || t('ai.sidebar.new_chat')}
                            </span>
                            <Pencil size={12} className="text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    {/* Clickable Model Name */}
                    {/* Status Badge - Not Clickable */}
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
                            onClick={handleDetach}
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
                                onClick={() => minimize('ai-chat')}
                                title={t('menu.minimize')}
                            >
                                <Minus size={14} />
                            </button>
                            <button
                                className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                onClick={() => maximize('ai-chat')}
                                title={isMaximized ? t('menu.restore') : t('menu.maximize')}
                            >
                                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                            <button
                                className="p-1.5 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
                                onClick={() => close('ai-chat')}
                                title={t('menu.close')}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar pb-64">
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
                                            className="text-zinc-200 dark:text-zinc-800"
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
                                        <span className="text-3xl font-light text-zinc-900 dark:text-zinc-200">
                                            {Math.round(progressValue * 100)}
                                            <span className="text-sm font-normal text-zinc-500 ml-0.5">%</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">
                                        {progressValue === 1 ? t('ai.loading.finalizing') : t('ai.loading.downloading')}
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-[280px]">
                                        {/* If downloading, show generic 'Downloading' message instead of technical progress */}
                                        {(progress && (progress.startsWith('Fetching') || progress.includes('param cache')))
                                            ? t('ai.loading.downloading')
                                            : (progress || t('ai.loading.init'))
                                        }
                                    </p>
                                    {downloadStats && (
                                        <div className="flex items-center justify-center gap-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-black/5 dark:bg-white/5 py-1.5 px-3 rounded-full">
                                            <span>{downloadStats.downloaded} / {downloadStats.total}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                                            <span>{downloadStats.speed}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={cancelLoading}
                                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors px-4 py-2 hover:bg-red-500/10 rounded-lg"
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
                                        className="w-24 h-24 text-zinc-400 dark:text-zinc-600 relative z-10 opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
                                        {t('ai.welcome.title')}
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed whitespace-pre-line">
                                        {t('ai.welcome.subtitle')}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                    <button
                                        onClick={() => handleInitModel()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-900 rounded-xl transition-all shadow-lg shadow-black/5 dark:shadow-white/5 font-medium text-sm group"
                                    >
                                        <Download size={16} className="text-zinc-400 group-hover:text-zinc-200 dark:text-zinc-600 dark:group-hover:text-zinc-900" />
                                        <span>{t('ai.welcome.load_default')}</span>
                                    </button>

                                    <button
                                        onClick={() => toggleSidebar()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 font-medium text-sm"
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
                                        <Sparkles size={24} className="text-zinc-400 dark:text-zinc-600" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-medium mb-2 text-zinc-900 dark:text-zinc-200">
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
                                            className="flex flex-col items-start p-4 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-xl transition-all text-left group backdrop-blur-sm shadow-sm dark:shadow-none"
                                        >
                                            <item.icon size={18} className="mb-3 text-zinc-600 dark:text-zinc-600 group-hover:text-zinc-800 dark:group-hover:text-zinc-400 transition-colors" />
                                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-300">{item.label}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{item.desc}</span>
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

                    // Find the last assistant message index (not just last message,
                    // since tool messages may follow it during agentic loops)
                    let lastAssistantIdx = -1;
                    for (let i = msgs.length - 1; i >= 0; i--) {
                        if (msgs[i]!.role === 'assistant') { lastAssistantIdx = i; break; }
                    }

                    const displayMessages = streamingMessage !== null && lastAssistantIdx !== -1
                        ? msgs.map((m, i) =>
                            i === lastAssistantIdx ? { ...m, ...streamingMessage } : m
                        )
                        : msgs;

                    return displayMessages.map((msg, index) => {
                        // ── Tool operation card (Builder / Control results) ──
                        if (msg.role === 'tool') {
                            const isError = msg.content?.includes('Error');
                            // Strip [Builder] / [Control] prefix for display
                            const displayText = msg.content?.replace(/^\[(?:Builder|Control)\]\s*/, '') || '';
                            const isLastMsg = index === displayMessages.length - 1;
                            return (
                                <div key={msg.id} className="max-w-4xl mx-auto w-full pl-12 animate-in fade-in duration-200">
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono",
                                        isError
                                            ? "text-red-400 bg-red-500/5 border border-red-500/10"
                                            : "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                                    )}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isError ? "bg-red-400" : "bg-emerald-400")} />
                                        <span className="truncate">{displayText}</span>
                                    </div>
                                    {isLastMsg && isLoading && (
                                        <div className="flex items-center gap-2 mt-1.5 px-1 text-xs text-zinc-400 dark:text-zinc-500">
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            <span>正在生成内容…</span>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-1">
                                        <Sparkles size={18} className="text-zinc-500 dark:text-zinc-400" />
                                    </div>
                                )}

                                <div className={cn(
                                    "flex-1 min-w-0 px-5 py-3 max-w-[85%] group/msg relative",
                                    msg.role === 'user'
                                        ? cn(
                                            "rounded-2xl rounded-tr-sm border",
                                            (!msg.mode || msg.mode === 'chat') && "bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 border-indigo-500/20",
                                            msg.mode === 'control' && "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 border-emerald-500/20",
                                            msg.mode === 'builder' && "bg-amber-500/10 text-amber-900 dark:text-amber-100 border-amber-500/20"
                                        )
                                        : "text-zinc-800 dark:text-zinc-300 pl-0 rounded-2xl rounded-tl-sm border bg-transparent border-transparent"
                                )}>
                                    <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
                                        {msg.role === 'assistant' && msg.content && (
                                            (() => {
                                                // Check for thinking tags
                                                const thinkMatch = msg.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                                                const thinkContent = thinkMatch ? thinkMatch[1] : null;
                                                const rawContent = thinkMatch
                                                    ? msg.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim()
                                                    : msg.content;

                                                // Determine if we should show cursor
                                                const isGenerating = isLoading && index === lastAssistantIdx;

                                                // Filter out empty JSON arrays or null content
                                                if (rawContent === '[]' || rawContent === '[""]' || !rawContent) {
                                                    if (msg.tool_calls && msg.tool_calls.length > 0) {
                                                        // Only show tool calls if main content is empty
                                                    } else {
                                                        return isGenerating ? (
                                                            <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse align-middle" />
                                                        ) : (isLoading ? '...' : null);
                                                    }
                                                }

                                                // Append cursor to content for typing effect
                                                const contentWithCursor = isGenerating ? rawContent + ' ▍' : rawContent;

                                                return (
                                                    <>
                                                        {thinkContent && <ThinkingProcess content={thinkContent} />}

                                                        {/* Tool Calls Visualization */}
                                                        {msg.tool_calls && msg.tool_calls.map((toolCall: any, toolIndex: number) => {
                                                            // Find corresponding tool result if available (usually in next messages)
                                                            // For simplicity in this view, we might not link them perfectly yet
                                                            // But we can show the call itself
                                                            return (
                                                                <ToolCallCard
                                                                    key={toolCall.id || toolIndex}
                                                                    toolName={toolCall.function.name}
                                                                    args={(() => { try { return JSON.parse(toolCall.function.arguments || '{}'); } catch { return {}; } })()}
                                                                />
                                                            );
                                                        })}

                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeHighlight]}
                                                            components={{
                                                                code({ node, inline, className, children, ...props }: any) {
                                                                    const match = /language-(\w+)/.exec(className || '')
                                                                    // Recursively extract plain text from React node tree
                                                                    // (needed because rehype-highlight converts code to styled spans)
                                                                    const extractText = (node: any): string => {
                                                                        if (typeof node === 'string') return node;
                                                                        if (Array.isArray(node)) return node.map(extractText).join('');
                                                                        if (node?.props?.children) return extractText(node.props.children);
                                                                        return '';
                                                                    };
                                                                    const codeContent = extractText(children).replace(/\n$/, '');
                                                                    // Check if it's runnable code (React/JS/TS)
                                                                    const isRunable = match && match[1] && (['tsx', 'jsx', 'javascript', 'typescript', 'js', 'ts', 'html'].includes(match[1]));

                                                                    return !inline && match ? (
                                                                        <div className="relative group my-4 rounded-lg overflow-hidden border border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/40">
                                                                            <div className="flex items-center justify-between px-4 py-1.5 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                                                                <span className="text-[10px] text-zinc-500 font-mono uppercase">{match[1]}</span>
                                                                                {isRunable && (
                                                                                    <button
                                                                                        onClick={() => handleRunApp(codeContent, match[1] || '')}
                                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-[10px] font-medium transition-colors border border-emerald-500/20"
                                                                                        title={t('ai.tool.run_app_desc')}
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
                                                                        <code className={cn(className, "bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-inherit font-normal border border-black/5 dark:border-white/5")} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    )
                                                                }
                                                            }}
                                                        >
                                                            {contentWithCursor || (isLoading ? '...' : '')}
                                                        </ReactMarkdown>
                                                    </>
                                                );
                                            })()
                                        )}
                                        {msg.role === 'user' && (
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
                        );
                    });
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
            <div className="absolute bottom-0 left-0 right-0 p-6 pt-20 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 z-10">
                <div className="max-w-3xl mx-auto relative pointer-events-auto">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                        <button
                            onClick={() => setChatMode('chat')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                chatMode === 'chat'
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                                    : "bg-white/50 dark:bg-black/20 text-zinc-600 dark:text-zinc-500 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-300 hover:border-black/10 dark:hover:border-white/10"
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
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                    : "bg-white/50 dark:bg-black/20 text-zinc-600 dark:text-zinc-500 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-300 hover:border-black/10 dark:hover:border-white/10"
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
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 shadow-lg shadow-amber-500/5"
                                    : "bg-white/50 dark:bg-black/20 text-zinc-600 dark:text-zinc-500 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-300 hover:border-black/10 dark:hover:border-white/10"
                            )}
                        >
                            <Hammer size={13} />
                            <span>{t('ai.mode.builder') || 'Builder'}</span>
                        </button>
                    </div>

                    <div className={cn(
                        "relative bg-white/90 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 focus-within:bg-white dark:focus-within:bg-black/60 backdrop-blur-xl rounded-2xl border border-black/10 dark:border-white/10 transition-all duration-300 shadow-sm dark:shadow-none",
                        isComposing ? "ring-1 ring-black/5 dark:ring-white/10" : ""
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
                                "w-full bg-transparent text-zinc-900 dark:text-zinc-100 pl-5 pr-14 py-4 max-h-[200px] min-h-[56px] resize-none outline-none custom-scrollbar text-[15px] leading-relaxed transition-colors",
                                !isModelLoaded ? "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 cursor-not-allowed" : "placeholder:text-zinc-500 dark:placeholder:text-zinc-600"
                            )}
                            rows={1}
                        />

                        <div className="absolute right-2 bottom-2">
                            {isLoading && !isModelLoaded ? (
                                <button
                                    onClick={cancelLoading}
                                    className="p-2 rounded-lg text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
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
                                            ? "text-zinc-900 dark:text-zinc-100 hover:bg-black/10 dark:hover:bg-white/10"
                                            : "text-zinc-400 dark:text-zinc-700 cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <Send size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-3">
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 font-medium">
                            {t('ai.input.footer')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
