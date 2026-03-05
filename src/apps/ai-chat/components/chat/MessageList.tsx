
import { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { AlertCircle, Download, Sparkles, Code2, PenTool, BrainCircuit, Zap, Settings } from 'lucide-react';
import { useTranslation } from '@/os/sdk';

interface MessageListProps {
    messages: any[];
    isLoading: boolean;
    isModelLoaded: boolean;
    progressValue: number;
    progressText: string;
    downloadStats: any;
    engineError: string | null;
    onInitModel: () => void;
    onCancelLoading: () => void;
    onToggleSidebar: () => void;
    onSetInput: (value: string) => void;
    onCopy: (content: string, id: string) => void;
    copiedId: string | null;
    onRunApp: (code: string, language: string) => void;
}

interface GroupedMessage {
    id: string;
    role: 'assistant';
    messages: any[]; // The original raw messages in this group
    timestamp: number;
    mode?: string;
}

export function MessageList({
    messages,
    isLoading,
    isModelLoaded,
    progressValue,
    progressText,
    downloadStats,
    engineError,
    onInitModel,
    onCancelLoading,
    onToggleSidebar,
    onSetInput,
    onCopy,
    copiedId,
    onRunApp
}: MessageListProps) {
    const { t } = useTranslation();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isLoading, progressValue]);

    // ── Pre-process messages into display groups ──
    const displayGroups = (() => {
        const groups: (any | GroupedMessage)[] = [];
        let currentAssistantGroup: GroupedMessage | null = null;

        for (const msg of messages) {
            if (msg.role === 'user') {
                // Close current group
                if (currentAssistantGroup) {
                    groups.push(currentAssistantGroup);
                    currentAssistantGroup = null;
                }
                groups.push(msg);
            } else {
                // Assistant, Tool, System - try to group them
                if (!currentAssistantGroup) {
                    if (msg.role === 'assistant') {
                        // Start a new assistant group
                        currentAssistantGroup = {
                            id: msg.id,
                            role: 'assistant',
                            messages: [msg],
                            timestamp: msg.timestamp,
                            mode: msg.mode
                        };
                    } else {
                        // Orphaned tool or system message.
                        // If it's a System message, maybe we should just show it?
                        // If it's a Tool message without preceding Assistant, it's weird but show it.
                        groups.push(msg);
                    }
                } else {
                    // Append to existing group
                    currentAssistantGroup.messages.push(msg);
                    if (msg.mode) currentAssistantGroup.mode = msg.mode;
                }
            }
        }
        // Push the final group
        if (currentAssistantGroup) {
            groups.push(currentAssistantGroup);
        }
        return groups;
    })();

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-0 custom-scrollbar pb-64">
            {messages.length === 0 && (
                // ... (Empty State Code - No Changes) ...
                <div className="flex flex-col items-center justify-center h-full select-none pb-20">
                    {/* Loading State */}
                    {isLoading && !isModelLoaded && (
                        <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-in fade-in duration-500">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-zinc-200 dark:text-zinc-800" />
                                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={364} strokeDashoffset={364 - (364 * progressValue)} strokeLinecap="round" className="text-indigo-500 transition-all duration-300 ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-light text-zinc-900 dark:text-zinc-200">
                                        {Math.round(progressValue * 100)}<span className="text-sm font-normal text-zinc-500 ml-0.5">%</span>
                                    </span>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">
                                    {progressValue === 1 ? t('ai.loading.finalizing') : t('ai.loading.downloading')}
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-[280px] animate-pulse">
                                    {progressText || t('ai.loading.init')}
                                </p>
                                {downloadStats && (
                                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-black/5 dark:bg-white/5 py-1.5 px-3 rounded-full">
                                        <span>{downloadStats.downloaded} / {downloadStats.total}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                                        <span>{downloadStats.speed}</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={onCancelLoading} className="text-xs text-red-500 hover:text-red-600 transition-colors px-4 py-2 hover:bg-red-500/10 rounded-lg">
                                {t('ai.loading.cancel')}
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isModelLoaded && !isLoading && !engineError && (
                        <div className="flex flex-col items-center gap-8 max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full opacity-20" />
                                <BrainCircuit strokeWidth={1} className="w-24 h-24 text-zinc-400 dark:text-zinc-600 relative z-10 opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">{t('ai.welcome.title')}</h2>
                                <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed whitespace-pre-line">{t('ai.welcome.subtitle')}</p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                <button onClick={onInitModel} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-900 rounded-xl transition-all shadow-lg font-medium text-sm group">
                                    <Download size={16} className="text-zinc-400 group-hover:text-zinc-200 dark:text-zinc-600 dark:group-hover:text-zinc-900" />
                                    <span>{t('ai.welcome.load_default')}</span>
                                </button>
                                <button onClick={onToggleSidebar} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all font-medium text-sm">
                                    <Settings size={16} className="text-zinc-500" />
                                    <span>{t('ai.welcome.choose_model')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Ready State */}
                    {isModelLoaded && !isLoading && (
                        <>
                            <div className="relative mb-6">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <Sparkles size={24} className="text-zinc-400 dark:text-zinc-600" />
                                </div>
                            </div>
                            <h2 className="text-xl font-medium mb-2 text-zinc-900 dark:text-zinc-200">{t('ai.welcome.ready_title')}</h2>
                            <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg w-full px-4">
                                {[
                                    { icon: Code2, label: t('ai.action.write_code'), desc: t('ai.action.write_code_desc') },
                                    { icon: PenTool, label: t('ai.action.creative_writing'), desc: t('ai.action.creative_writing_desc') },
                                    { icon: BrainCircuit, label: t('ai.action.explain_concept'), desc: t('ai.action.explain_concept_desc') },
                                    { icon: Zap, label: t('ai.action.brainstorm'), desc: t('ai.action.brainstorm_desc') }
                                ].map((item, i) => (
                                    <button key={i} onClick={() => onSetInput(item.desc)} className="flex flex-col items-start p-4 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-xl transition-all text-left group backdrop-blur-sm shadow-sm dark:shadow-none hover:scale-[1.03] hover:-translate-y-0.5 active:scale-100">
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

            {/* Messages */}
            {displayGroups.map((group, i) => {
                const isLast = i === displayGroups.length - 1;

                if (group.role === 'assistant' && 'messages' in group) {
                    // It's a GroupedMessage
                    const combinedContent = group.messages
                        .filter((m: any) => m.role === 'assistant' && m.content)
                        .map((m: any) => m.content)
                        .join('\n\n');

                    // Extract all tool calls from all messages in the group
                    const allToolCalls = group.messages.flatMap((m: any) => m.tool_calls || []);
                    
                    // Extract all tool results
                    const allToolResults = group.messages.filter((m: any) => m.role === 'tool');

                    return (
                        <MessageItem
                            key={`${group.id}_${group.messages.length}`} // Force update when messages added
                            message={{
                                id: group.id,
                                role: 'assistant',
                                content: combinedContent,
                                tool_calls: allToolCalls,
                                mode: group.mode,
                                timestamp: group.timestamp
                            }}
                            toolResults={allToolResults}
                            rawMessages={group.messages} // Pass raw messages for precise event reconstruction
                            isLast={isLast}
                            isLoading={isLoading}
                            onCopy={onCopy}
                            copiedId={copiedId}
                            onRunApp={onRunApp}
                        />
                    );
                } else {
                    // It's a standard message (User/System)
                    return (
                        <MessageItem
                            key={group.id}
                            message={group}
                            isLast={isLast}
                            isLoading={isLoading}
                            onCopy={onCopy}
                            copiedId={copiedId}
                            onRunApp={onRunApp}
                        />
                    );
                }
            })}

            {/* Engine Error */}
            {engineError && (
                <div className="max-w-xl mx-auto bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1 text-red-400">{t('ai.loading.engine_error')}</h3>
                        <p className="text-xs opacity-80">{engineError}</p>
                        <button onClick={onInitModel} className="mt-3 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors">
                            {t('ai.loading.retry')}
                        </button>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
