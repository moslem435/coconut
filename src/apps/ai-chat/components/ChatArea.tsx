import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useWebLLM, AVAILABLE_MODELS } from '../hooks/useWebLLM';
import { useWindowStore } from '@/os/kernel/useWindowStore';
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
    Pencil
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ChatArea() {
    const { 
        currentSessionId, 
        sessions, 
        addMessage, 
        updateLastMessage,
        updateSessionTitle,
        modelSettings,
        isSidebarOpen,
        toggleSidebar
    } = useChatStore();
    
    // Window management for detach
    const updateWindow = useWindowStore(state => state.updateWindow);
    const windowState = useWindowStore(state => state.windows['ai-chat']);
    const isSidebar = windowState?.isSidebar;
    
    // Handle toggle sidebar with window resize
    const handleToggleSidebar = () => {
        toggleSidebar();
        if (windowState && !windowState.isMaximized) {
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
        currentModelId
    } = useWebLLM();

    const [input, setInput] = useState('');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposing, setIsComposing] = useState(false);
    
    // Copy state
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Title editing state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);

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

        const userContent = input;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        
        // 1. Add user message
        addMessage(currentSessionId, 'user', userContent);
        
        // 2. Add placeholder assistant message
        addMessage(currentSessionId, 'assistant', '');

        // 3. Generate
        const history = currentSession ? currentSession.messages : [];
        const messagesForEngine = [
            ...history, 
            { id: 'temp-user', role: 'user' as const, content: userContent, timestamp: Date.now() }
        ];
        
        await generateResponse(
            messagesForEngine,
            (content) => updateLastMessage(currentSessionId, content),
            () => {}, // onFinish
            (err) => updateLastMessage(currentSessionId, `Error: ${err.message || 'Unknown error'}`),
            modelSettings.systemPrompt
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
        initEngine(modelId || 'Llama-3-8B-Instruct-q4f32_1-MLC');
    };

    if (!currentSession) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-zinc-500 select-none">
                <p className="text-sm font-medium">Select or create a chat to begin</p>
            </div>
        );
    }

    const currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'No Model Loaded';

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
                                {currentSession?.title || 'New Chat'}
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
                            title="Detach to Window"
                        >
                            <ArrowUpRightFromSquare size={16} />
                        </button>
                    )}
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all"
                        >
                            <Settings size={14} />
                            <span>Models</span>
                        </button>
                    
                    {isModelMenuOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsModelMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 max-h-[400px] overflow-y-auto custom-scrollbar ring-1 ring-black/50">
                                <div className="text-[10px] font-bold text-zinc-600 px-3 py-2 uppercase tracking-widest">Select Model</div>
                                {AVAILABLE_MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            handleInitModel(model.id);
                                            setIsModelMenuOpen(false);
                                        }}
                                        disabled={isLoading}
                                        className={cn(
                                            "w-full text-left px-3 py-3 rounded-lg text-xs transition-all mb-1 group border",
                                            currentModelId === model.id 
                                                ? "bg-white/10 border-white/10 text-zinc-200" 
                                                : "border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-sm">{model.name}</span>
                                            {model.recommended && (
                                                <span className="text-[9px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Rec</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] opacity-60">
                                            <span className="px-1.5 py-0.5 rounded bg-white/5">{model.vram} VRAM</span>
                                            <span className="px-1.5 py-0.5 rounded bg-white/5">{model.size}</span>
                                        </div>
                                    </button>
                                ))}
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
                        {/* Loading State - Center Prominent */}
                        {isLoading && !isModelLoaded && (
                            <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-in fade-in duration-500">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                                    <div 
                                        className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" 
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-mono text-zinc-500">{Math.round(progressValue * 100)}%</span>
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-medium text-zinc-200">Initializing AI Model</h3>
                                    <p className="text-sm text-zinc-500 max-w-[280px]">
                                        Downloading and compiling WebGPU shaders. This happens locally on your device.
                                    </p>
                                    {downloadStats && (
                                        <p className="text-xs font-mono text-zinc-600 pt-2">
                                            {downloadStats.downloaded} / {downloadStats.total} ({downloadStats.speed})
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={cancelLoading}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Cancel
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
                                        Local AI Assistant
                                    </h2>
                                    <p className="text-zinc-500 leading-relaxed">
                                        This AI runs entirely in your browser using WebGPU. <br/>
                                        Your data never leaves your device.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                    <button
                                        onClick={() => handleInitModel()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl transition-all shadow-lg shadow-white/5 font-medium text-sm group"
                                    >
                                        <Download size={16} className="text-zinc-600 group-hover:text-zinc-900" />
                                        <span>Load Default Model</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => setIsModelMenuOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition-all border border-white/5 hover:border-white/10 font-medium text-sm"
                                    >
                                        <Settings size={16} className="text-zinc-500" />
                                        <span>Choose Model...</span>
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
                                    How can I help you today?
                                </h2>
                                
                                <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg w-full px-4">
                                    {[
                                        { icon: Code2, label: "Write Code", desc: "Generate a React component" },
                                        { icon: PenTool, label: "Creative Writing", desc: "Draft a blog post" },
                                        { icon: BrainCircuit, label: "Explain Concept", desc: "How does quantum computing work?" },
                                        { icon: Zap, label: "Brainstorm", desc: "Ideas for a marketing campaign" }
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

                {currentSession.messages.map((msg) => (
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
                                : "text-zinc-300 pl-0"
                        )}>
                            <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                        code({node, inline, className, children, ...props}: any) {
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
                                    {msg.content || (msg.role === 'assistant' && isLoading ? '...' : '')}
                                </ReactMarkdown>
                            </div>

                            {/* Copy Button for AI Messages */}
                            {msg.role === 'assistant' && !isLoading && (
                                <div className="absolute -bottom-6 left-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                                        title="Copy message"
                                    >
                                        {copiedMessageId === msg.id ? (
                                            <>
                                                <Check size={14} className="text-emerald-500" />
                                                <span className="text-[10px] text-emerald-500">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                <span className="text-[10px]">Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {/* Loading Indicator / Progress - REMOVED, now in center */}
                
                {/* Engine Error */}
                {engineError && (
                    <div className="max-w-xl mx-auto bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200 backdrop-blur-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                        <div className="flex-1">
                            <h3 className="font-medium text-sm mb-1 text-red-400">Engine Error</h3>
                            <p className="text-xs opacity-80">{engineError}</p>
                            <button 
                                onClick={() => handleInitModel()}
                                className="mt-3 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors"
                            >
                                Retry Initialization
                            </button>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 pointer-events-none">
                <div className="max-w-3xl mx-auto relative pointer-events-auto">
                    {/* Old button removed */}

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
                            placeholder={isModelLoaded ? "Message AI..." : "Please load a model to start chatting"}
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
                                    title="Stop generation"
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
                            AI can make mistakes. Check important info.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
