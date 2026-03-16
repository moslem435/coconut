
import { Sparkles, Check, Copy, Cpu, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/os/sdk';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingProcess } from './ThinkingProcess';
import { BuilderTimeline } from './BuilderTimeline';

interface MessageItemProps {
    message: any;
    toolResults?: any[];
    rawMessages?: any[]; // The raw messages in this group
    flowEvents?: any[]; // Legacy prop, can be removed if not used elsewhere, but kept for compatibility
    isLast: boolean;
    isLoading: boolean;
    onCopy: (content: string, id: string) => void;
    copiedId: string | null;
    onRunApp: (code: string, language: string) => void;
}

// ... (MODE_CONFIG and formatTime functions remain unchanged) ...
// 模式配置表
const MODE_CONFIG = {
    chat: { label: 'Chat', badgeCls: 'bg-indigo-500/10 text-indigo-400  border-indigo-500/20', lineCls: 'from-indigo-500/60 to-indigo-500/0', Icon: Sparkles },
    control: { label: 'Control', badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', lineCls: 'from-emerald-500/60 to-emerald-500/0', Icon: Cpu },
    builder: { label: 'Builder', badgeCls: 'bg-amber-500/10  text-amber-400   border-amber-500/20', lineCls: 'from-amber-500/60  to-amber-500/0', Icon: Wrench },
} as const;

// 时间格式化
function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MessageItem({
    message,
    toolResults = [],
    rawMessages,
    flowEvents,
    isLast,
    isLoading,
    onCopy,
    copiedId,
    onRunApp
}: MessageItemProps) {
    const { t } = useTranslation();
    const isAssistant = message.role === 'assistant';
    const isUser = message.role === 'user';
    const isTool = message.role === 'tool';

    // 模式（用户消息携带 mode，助手继承当前 session 模式，默认 chat）
    const mode = (message.mode as keyof typeof MODE_CONFIG) ?? 'chat';
    const modeCfg = MODE_CONFIG[mode] ?? MODE_CONFIG.chat;

    // ── Tool Result (orphaned / standalone) ──
    if (isTool) {
        const isError = message.content?.includes('Error');
        const displayTx = message.content?.replace(/^\[(?:Builder|Control)\]\s*/, '') || '';
        return (
            <div className="max-w-4xl mx-auto w-full pl-4 animate-in fade-in duration-200 mb-3">
                <div className="flex items-start gap-2">
                    <div className={cn(
                        "mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0",
                        isError ? "bg-red-500" : "bg-emerald-500"
                    )}>
                        {isError
                            ? <span className="text-white text-[8px] font-bold leading-none">✕</span>
                            : <span className="text-white text-[8px] font-bold leading-none">✓</span>
                        }
                    </div>
                    <p className={cn(
                        "text-[12px] font-mono leading-relaxed",
                        isError ? "text-red-400" : "text-zinc-400 dark:text-zinc-500"
                    )}>
                        {displayTx}
                    </p>
                </div>
            </div>
        );
    }

    // ── Assistant Message ──
    if (isAssistant) {
        const isGenerating = isLoading && isLast;
        const thinkMatch = message.content?.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
        const thinkContent = thinkMatch ? thinkMatch[1] : null;

        // Reconstruct events from rawMessages if available (preferred method for grouped messages)
        let timelineEvents: any[] = [];

        if (rawMessages && rawMessages.length > 0) {
            // Process the raw message group to build a chronological timeline
            for (const msg of rawMessages) {
                if (msg.role === 'assistant') {
                    // 1. Add Text Content
                    if (msg.content) {
                        const cleanContent = msg.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();
                        if (cleanContent) {
                            timelineEvents.push({ type: 'text', content: cleanContent });
                        }
                    }

                    // 2. Add Tool Calls
                    if (msg.tool_calls && msg.tool_calls.length > 0) {
                        msg.tool_calls.forEach((tc: any) => {
                            // Check for duplicates (just in case)
                            if (!timelineEvents.find(e => e.type === 'tool' && e.toolCall?.id === tc.id)) {
                                timelineEvents.push({
                                    type: 'tool',
                                    toolCall: tc,
                                    result: null,
                                    status: isLoading ? 'loading' : 'pending'
                                });
                            }
                        });
                    }
                } else if (msg.role === 'tool') {
                    // 3. Match Tool Results to Tool Calls
                    const event = timelineEvents.find(e => e.type === 'tool' && e.toolCall?.id === msg.tool_call_id);
                    if (event) {
                        event.result = msg.content;
                        // Check if the result indicates an error
                        // Only mark as error if it starts with "Error" or "Failed" or contains "Error:" pattern
                        const contentTrimmed = (msg.content || '').trim();
                        const startsWithError = contentTrimmed.startsWith('Error') || contentTrimmed.startsWith('Failed');
                        const containsErrorPattern = /Error:/i.test(contentTrimmed) || /Failed:/i.test(contentTrimmed);
                        const hasError = startsWithError || containsErrorPattern;
                        event.isError = hasError;
                        // Update status based on result
                        event.status = hasError ? 'error' : 'success';
                    } else {
                        const fallback = timelineEvents.find(e => e.type === 'tool' && !e.result);
                        if (fallback) {
                            fallback.result = msg.content;
                            const contentTrimmed = (msg.content || '').trim();
                            const startsWithError = contentTrimmed.startsWith('Error') || contentTrimmed.startsWith('Failed');
                            const containsErrorPattern = /Error:/i.test(contentTrimmed) || /Failed:/i.test(contentTrimmed);
                            const hasError = startsWithError || containsErrorPattern;
                            fallback.isError = hasError;
                            fallback.status = hasError ? 'error' : 'success';
                        }
                    }
                }
            }
        } else if (flowEvents) {
            // Fallback to legacy flowEvents prop
            timelineEvents = flowEvents.map((e: any) => {
                if (e.type === 'text' && e.content) {
                    return { ...e, content: e.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim() };
                }
                return e;
            });
        }

        const hasTools = timelineEvents.some((e: any) => e.type === 'tool');

        // Regular text content for fallback or simple chat
        const rawContent = message.content
            ? (thinkMatch ? message.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim() : message.content)
            : '';

        return (
            <div className="flex gap-3 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300 mb-6 justify-start">
                {/* ... (Render Logic remains largely the same, just using the robust timelineEvents) ... */}
                {/* 左侧竖线渐变 */}
                <div className={cn(
                    "w-0.5 shrink-0 mt-1 rounded-full bg-gradient-to-b self-stretch min-h-[2rem]",
                    modeCfg.lineCls
                )} />

                {/* 主体卡片 */}
                <div className="flex-1 min-w-0 group/msg relative">
                    {/* ── 顶部角标栏 ── */}
                    <div className="flex items-center gap-2 mb-2.5">
                        <modeCfg.Icon size={13} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            AI
                        </span>
                        {/* 模式 badge */}
                        <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
                            modeCfg.badgeCls
                        )}>
                            {modeCfg.label}
                        </span>
                        {/* 生成中 badge */}
                        {isGenerating && (
                            <span className="ml-1 flex items-center gap-1 text-[9px] text-zinc-400 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                                {(message.tps !== undefined && Number(message.tps) > 0) && (
                                    <span className="ml-2 text-zinc-500 font-mono tabular-nums">
                                        {Number(message.tps).toFixed(1)} t/s
                                    </span>
                                )}
                            </span>
                        )}
                        {/* 时间戳 */}
                        {message.timestamp && !isGenerating && (
                            <span className="ml-auto text-[10px] text-zinc-400/50 tabular-nums flex items-center">
                                {formatTime(message.timestamp)}
                                {message.duration && (
                                    <span className="ml-2 text-emerald-400/70">
                                        ({(message.duration / 1000).toFixed(2)}s)
                                    </span>
                                )}
                                {(message.tps !== undefined && Number(message.tps) > 0) && (
                                    <span className="ml-2 text-zinc-500/70">
                                        {Number(message.tps).toFixed(1)} t/s
                                    </span>
                                )}
                            </span>
                        )}
                    </div>

                    {/* ── 内容区 ── */}
                    <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {message.content && (
                            <>
                                {thinkContent && (
                                    <ThinkingProcess content={thinkContent} isGenerating={isGenerating} />
                                )}

                                {/* If we have tools, use the new BuilderTimeline (Card View) */}
                                {hasTools ? (
                                    <BuilderTimeline
                                        events={timelineEvents}
                                        isLoading={isGenerating}
                                    />
                                ) : (
                                    /* Simple Text View */
                                    rawContent && (
                                        <div className="mb-3">
                                            <MarkdownRenderer
                                                content={rawContent}
                                                onRunApp={onRunApp}
                                                isLoading={isGenerating}
                                            />
                                            {isGenerating && (
                                                <span className="ai-cursor text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                                            )}
                                        </div>
                                    )
                                )}
                            </>
                        )}
                    </div>
                    {/* ... (Copy Button - No Changes) ... */}
                    {/* ── 复制按钮 ── */}
                    {!isLoading && (
                        <div className="mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-2">
                            <button
                                onClick={() => onCopy(message.content, message.id)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all text-[10px]"
                                title={t('ai.msg.copy')}
                            >
                                {copiedId === message.id ? (
                                    <><Check size={12} className="text-emerald-500" /><span className="text-emerald-500">{t('ai.msg.copied')}</span></>
                                ) : (
                                    <><Copy size={12} /><span>{t('ai.msg.copy')}</span></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── User Message ──
    const userMode = MODE_CONFIG[(message.mode as keyof typeof MODE_CONFIG) ?? 'chat'] ?? MODE_CONFIG.chat;
    const userBubbleCls = ({
        chat: 'bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-500/20 text-indigo-950 dark:text-indigo-100',
        control: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100',
        builder: 'bg-amber-500/10  border-amber-500/20  text-amber-950  dark:text-amber-100',
    } as Record<string, string>)[message.mode ?? 'chat'] ?? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-950 dark:text-indigo-100';

    return (
        <div className="flex flex-col items-end max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300 mb-6">
            {/* 发送者标签 + 时间 */}
            <div className="flex items-center gap-1.5 mb-1.5 pr-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {message.timestamp ? formatTime(message.timestamp) : ''}
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">You</span>
                <span className={cn(
                    "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
                    userMode.badgeCls
                )}>
                    {userMode.label}
                </span>
            </div>

            {/* 气泡 */}
            <div className={cn(
                "max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm border",
                userBubbleCls
            )}>
                <div className="prose prose-sm max-w-none break-words leading-relaxed">
                    <MarkdownRenderer content={message.content} isUser />
                </div>
            </div>
        </div>
    );
}
