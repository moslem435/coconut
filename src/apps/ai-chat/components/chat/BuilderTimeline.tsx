import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/os/sdk';
import { Loader2, Check, X, FolderPlus, FilePlus, FileEdit, FileSearch, Trash2, Move, Copy, List, Play, Settings, Info, Terminal, Zap, ChevronDown, ChevronRight, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TimelineStatus } from './TimelineNode';

export interface TimelineEvent {
    type: 'text' | 'tool';
    content?: string;
    toolCall?: any;
    result?: string;
    isError?: boolean;
    status?: TimelineStatus;
}

interface BuilderTimelineProps {
    events: TimelineEvent[];
    isLoading?: boolean;
}

// ── Tool name → icon + display label ──────────────────────────────────────────
function getToolMeta(toolName: string, args: any): { label: string; Icon: React.ElementType } {
    const s = args || {};
    const fileName = (p: string) => p?.split('/').pop() || p;

    const map: Record<string, { label: string; Icon: React.ElementType }> = {
        create_directory: { label: `新建文件夹  ${fileName(s.path) || ''}`, Icon: FolderPlus },
        create_file: { label: `创建文件  ${fileName(s.path) || ''}`, Icon: FilePlus },
        update_file: { label: `更新文件  ${fileName(s.path) || ''}`, Icon: FileEdit },
        read_file: { label: `读取文件  ${fileName(s.path) || ''}`, Icon: FileSearch },
        delete_file: { label: `删除文件  ${fileName(s.path) || ''}`, Icon: Trash2 },
        move_file: { label: `移动文件  ${fileName(s.path) || ''}`, Icon: Move },
        copy_file: { label: `复制文件  ${fileName(s.path) || ''}`, Icon: Copy },
        list_directory: { label: `列出目录  ${s.path || '/'}`, Icon: List },
        launch_app: { label: `启动应用  ${s.appId || ''}`, Icon: Play },
        close_app: { label: `关闭应用  ${s.appId || ''}`, Icon: X },
        set_theme: { label: `切换主题  ${s.mode || ''}`, Icon: Settings },
        set_volume: { label: `设置音量  ${s.level ?? ''}`, Icon: Settings },
        set_wallpaper: { label: `更换壁纸`, Icon: Settings },
        run_command: { label: `执行命令  ${s.cmd || ''} ${s.args?.join(' ') || ''}`, Icon: Terminal },
        get_system_info: { label: `获取系统信息`, Icon: Info },
        open_settings: { label: `打开设置`, Icon: Settings },
    };

    if (map[toolName]) return map[toolName];
    return {
        label: toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        Icon: Zap,
    };
}

// ── Text Step ─────────────────────────────────────────────────────────────────
function TextStep({ content }: { content: string }) {
    return (
        <div className="relative pl-4 py-0.5 border-l border-blue-400/25 dark:border-blue-500/20">
            <div className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                <MarkdownRenderer content={content} />
            </div>
        </div>
    );
}

// ── Tool Step ─────────────────────────────────────────────────────────────────
function ToolStep({ event }: { event: TimelineEvent }) {
    const { toolCall, result, isError, status } = event;
    const args = (() => { try { return JSON.parse(toolCall?.function?.arguments || '{}'); } catch { return {}; } })();
    const toolName = toolCall?.function?.name || '';
    const toolMeta = getToolMeta(toolName, args);
    
    // Determine status: explicit status > isError flag > result analysis > loading
    let currentStatus: TimelineStatus;
    if (status) {
        currentStatus = status;
    } else if (result) {
        // Check if result indicates an error
        // Only mark as error if it starts with "Error" or "Failed" or contains "Error:" pattern
        const resultTrimmed = result.trim();
        const startsWithError = resultTrimmed.startsWith('Error') || resultTrimmed.startsWith('Failed');
        const containsErrorPattern = /Error:/i.test(resultTrimmed) || /Failed:/i.test(resultTrimmed);
        const hasErrorKeyword = startsWithError || containsErrorPattern;
        currentStatus = (isError || hasErrorKeyword) ? 'error' : 'success';
    } else {
        currentStatus = 'loading';
    }
    
    // Command output streaming state
    const [streamOutput, setStreamOutput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [promptInput, setPromptInput] = useState('');
    const [waitingForInput, setWaitingForInput] = useState(false);
    const outputRef = useRef<HTMLDivElement>(null);

    // ANSI escape codes for arrow keys
    const ANSI_UP = '\x1b[A';
    const ANSI_DOWN = '\x1b[B';
    const ANSI_ENTER = '\r'; // Use CR for Enter in terminals

    // Helper to send raw input to WebContainer
    const sendRawInput = (input: string) => {
        window.dispatchEvent(new CustomEvent('webcontainer:input', {
            detail: { cmd: args.cmd, input: input }
        }));
    };

    // Listen for streaming output if this is a running command
    useEffect(() => {
        if (toolName !== 'run_command' || currentStatus !== 'loading') return;

        const outputHandler = (e: CustomEvent) => {
            if (e.detail?.cmd === args.cmd) {
                setStreamOutput(prev => prev + e.detail.output);
                if (outputRef.current) {
                    outputRef.current.scrollTop = outputRef.current.scrollHeight;
                }
            }
        };

        const promptHandler = (e: CustomEvent) => {
            if (e.detail?.cmd === args.cmd) {
                setWaitingForInput(true);
                // Ensure output is visible when prompting
                setIsExpanded(true);
            }
        };

        window.addEventListener('ai-builder:command-output', outputHandler as EventListener);
        window.addEventListener('ai-builder:interactive-prompt', promptHandler as EventListener);
        
        return () => {
            window.removeEventListener('ai-builder:command-output', outputHandler as EventListener);
            window.removeEventListener('ai-builder:interactive-prompt', promptHandler as EventListener);
        };
    }, [toolName, currentStatus, args.cmd]);

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!promptInput.trim()) return;

        // Send input to WebContainer
        window.dispatchEvent(new CustomEvent('webcontainer:input', {
            detail: { cmd: args.cmd, input: promptInput + '\n' }
        }));

        setStreamOutput(prev => prev + `\n> ${promptInput}\n`);
        setPromptInput('');
        setWaitingForInput(false);
    };

    // Compact result line — strip prefix tags like "[Builder] "
    const cleanResult = result?.replace(/^\[.*?\]\s*/, '');
    const resultLine = cleanResult && cleanResult.length < 80
        ? cleanResult
        : cleanResult ? cleanResult.slice(0, 80) + '…' : null;

    const isCommand = toolName === 'run_command';
    const hasOutput = streamOutput.length > 0 || (result && isCommand);
    const showDetails = isExpanded && (hasOutput || result || waitingForInput);
    
    // Auto-expand if loading command
    useEffect(() => {
        if (currentStatus === 'loading' && isCommand) {
            setIsExpanded(true);
        }
        if (currentStatus !== 'loading' && waitingForInput) {
            setWaitingForInput(false);
        }
    }, [currentStatus, isCommand, waitingForInput]);

    return (
        <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-start gap-2.5">
                {/* Status indicator */}
                <div className="mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center">
                    {currentStatus === 'loading' && (
                        <Loader2 size={13} className="animate-spin text-indigo-400" />
                    )}
                    {currentStatus === 'success' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                            <Check size={9} strokeWidth={3} className="text-white" />
                        </div>
                    )}
                    {currentStatus === 'error' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center shadow-sm shadow-red-500/30">
                            <X size={9} strokeWidth={3} className="text-white" />
                        </div>
                    )}
                    {currentStatus === 'pending' && (
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    )}
                </div>

                {/* Label + result */}
                <div className="flex flex-col min-w-0 flex-1">
                    <div 
                        className="flex items-center gap-1.5 cursor-pointer group select-none"
                        onClick={() => (hasOutput || waitingForInput) && setIsExpanded(!isExpanded)}
                    >
                        {React.createElement(toolMeta.Icon as any, {
                            size: 11,
                            className: cn(
                                "shrink-0",
                                currentStatus === 'loading' ? "text-indigo-400" :
                                    currentStatus === 'success' ? "text-emerald-500" :
                                        currentStatus === 'error' ? "text-red-400" :
                                            "text-zinc-400"
                            )
                        })}
                        <span className={cn(
                            "text-[13px] font-medium truncate flex-1",
                            currentStatus === 'loading' ? "text-indigo-600 dark:text-indigo-400" :
                                currentStatus === 'error' ? "text-red-600 dark:text-red-400" :
                                    "text-zinc-700 dark:text-zinc-200"
                        )}>
                            {toolMeta.label}
                        </span>
                        
                        {(hasOutput || waitingForInput) && (
                            <div className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </div>
                        )}
                    </div>
                    
                    {!isCommand && resultLine && !isError && !isExpanded && (
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate mt-0.5 pl-0.5">
                            {resultLine}
                        </span>
                    )}
                    
                    {!isCommand && isError && result && (
                        <span className="text-[11px] font-mono text-red-400 dark:text-red-500 mt-0.5 pl-0.5 line-clamp-2">
                            {cleanResult}
                        </span>
                    )}
                </div>
            </div>

            {/* Command Output / Detailed Result */}
            {showDetails && (
                <div className="ml-6 mt-1 mb-2 flex flex-col gap-2">
                    <div 
                        ref={outputRef}
                        className="bg-black/5 dark:bg-black/30 rounded border border-black/5 dark:border-white/5 p-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto scrollbar-thin"
                    >
                        {streamOutput || cleanResult || (currentStatus === 'loading' ? 'Waiting for output...' : 'No output')}
                    </div>
                    
                    {/* Interactive Input */}
                    {waitingForInput && (
                        <div className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                    Interactive Prompt
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => sendRawInput(ANSI_UP)}
                                        className="p-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400 transition-colors"
                                        title="Up (Arrow Up)"
                                    >
                                        <ArrowUp size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => sendRawInput(ANSI_DOWN)}
                                        className="p-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400 transition-colors"
                                        title="Down (Arrow Down)"
                                    >
                                        <ArrowDown size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Send enter
                                            sendRawInput(ANSI_ENTER);
                                            // Optimistically clear input UI, assuming selection is done
                                            // If more input is needed, systemTools will re-trigger the event
                                            setWaitingForInput(false);
                                        }}
                                        className="p-1 rounded bg-indigo-50 bg-opacity-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition-colors"
                                        title="Confirm (Enter)"
                                    >
                                        <CornerDownLeft size={12} />
                                    </button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleInputSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={promptInput}
                                    onChange={(e) => setPromptInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            sendRawInput(ANSI_UP);
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            sendRawInput(ANSI_DOWN);
                                        }
                                    }}
                                    placeholder="Type answer or use arrow keys..."
                                    className="flex-1 px-2 py-1.5 text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:border-indigo-500 transition-colors"
                                    autoFocus
                                />
                                <button 
                                    type="submit"
                                    className="px-3 py-1.5 text-[10px] font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors shadow-sm"
                                >
                                    Send
                                </button>
                            </form>
                            <div className="text-[9px] text-zinc-400 flex items-center gap-1">
                                <span>Tip: Use Up/Down arrows to navigate menus</span>
                            </div>
                            <div className="text-[9px] text-amber-500/80 dark:text-amber-400/80 mt-1 px-1 border-t border-zinc-200 dark:border-zinc-700/50 pt-1">
                                Tip: Avoid interactive commands. Use non-interactive alternatives (e.g., 'npm init -y' instead of 'npm init', or add '-y' flag to skip prompts).
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Loading pulse ─────────────────────────────────────────────────────────────
function LoadingPulse() {
    return (
        <div className="flex items-center gap-1.5 pl-0.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/70 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function BuilderTimeline({ events, isLoading }: BuilderTimelineProps) {
    const { t } = useTranslation();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [iframeError, setIframeError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Listen for server-ready events
    useEffect(() => {
        const handleServerReady = async (e: CustomEvent) => {
            console.log('[BuilderTimeline] Server ready:', e.detail);
            const url = e.detail.url;
            
            // Diagnose: Check if URL is accessible
            try {
                const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
                console.log('[BuilderTimeline] URL fetch test:', response);
            } catch (err) {
                console.error('[BuilderTimeline] URL fetch failed:', err);
            }
            
            setPreviewUrl(url);
            setShowPreview(true);
        };

        window.addEventListener('server-ready', handleServerReady as EventListener);
        return () => {
            window.removeEventListener('server-ready', handleServerReady as EventListener);
        };
    }, []);

    const validEvents = events.filter(e =>
        e.type === 'tool' ? true : (e.content?.trim().length ?? 0) > 0
    );

    if (validEvents.length === 0) return null;

    const toolEvents = validEvents.filter(e => e.type === 'tool');
    const doneCount = toolEvents.filter(e => e.result).length;
    const totalTools = toolEvents.length;
    const hasError = toolEvents.some(e => e.isError);

    const lastEvent = validEvents[validEvents.length - 1];
    const lastIsExecuting = lastEvent?.type === 'tool' && !lastEvent?.result;

    return (
        <div className="my-2 flex flex-col gap-2">
            <div className="rounded-lg border border-black/6 dark:border-white/6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50/60 dark:bg-white/[0.025] border-b border-black/5 dark:border-white/5">
                    <Terminal size={11} className="text-zinc-400" />
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wide">
                        {t('ai.timeline.build_process') || '构建过程'}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                        {isLoading ? (
                            <span className="text-[10px] font-mono text-indigo-400">
                                {doneCount}/{totalTools || '?'}
                            </span>
                        ) : hasError ? (
                            <span className="text-[10px] font-mono text-red-400">error</span>
                        ) : (
                            <span className="text-[10px] font-mono text-zinc-400">{totalTools}</span>
                        )}
                    </div>
                </div>

                {/* Steps */}
                <div className="px-3 py-2.5 flex flex-col gap-2.5">
                    {validEvents.map((event, i) => {
                        if (event.type === 'text' && event.content) {
                            return <TextStep key={i} content={event.content} />;
                        }
                        if (event.type === 'tool' && event.toolCall) {
                            return <ToolStep key={event.toolCall?.id || i} event={event} />;
                        }
                        return null;
                    })}

                    {/* Loading indicator: only when waiting for next step */}
                    {isLoading && !lastIsExecuting && <LoadingPulse />}
                </div>
            </div>

            {/* Inline Preview Panel */}
            {previewUrl && showPreview && (
                <div className="rounded-lg border border-emerald-500/20 dark:border-emerald-500/30 overflow-hidden bg-white dark:bg-zinc-900">
                    {/* Preview Header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/60 dark:bg-emerald-900/10 border-b border-emerald-500/10">
                        <Check size={11} className="text-emerald-500" />
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tracking-wide">
                            应用预览
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500/60 ml-auto truncate max-w-[200px]">
                            {previewUrl}
                        </span>
                        <button
                            onClick={() => setShowPreview(false)}
                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"
                            title="关闭预览"
                        >
                            <X size={12} className="text-emerald-600 dark:text-emerald-400" />
                        </button>
                    </div>
                    
                    {/* Preview Iframe */}
                    <div className="relative w-full h-[400px] bg-white">
                        <iframe
                            src={previewUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            title="App Preview"
                            allow="cross-origin-isolated; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}
