
import { useTranslation } from '@/os/sdk';
import { Loader2, Terminal, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TimelineNode, TimelineStatus } from './TimelineNode';

export interface TimelineEvent {
    type: 'text' | 'tool';
    // Text props
    content?: string;
    // Tool props
    toolCall?: any;
    result?: string;
    isError?: boolean;
    status?: TimelineStatus;
}

interface BuilderTimelineProps {
    events: TimelineEvent[];
    isLoading?: boolean;
}

// Format tool title
function formatTitle(toolName: string, args: any): string {
    const s = args || {};
    const fn = (p: string) => p?.split('/').pop() || p;
    switch (toolName) {
        case 'create_directory': return `Create Directory ${fn(s.path) || ''}`;
        case 'create_file': return `Create File ${fn(s.path) || ''}`;
        case 'update_file': return `Update File ${fn(s.path) || ''}`;
        case 'read_file': return `Read File ${fn(s.path) || ''}`;
        case 'rename_file': return `Rename ${fn(s.new_path || s.path) || ''}`;
        case 'delete_file': return `Delete File ${fn(s.path) || ''}`;
        case 'move_file': return `Move File ${fn(s.path) || ''}`;
        case 'copy_file': return `Copy File ${fn(s.path) || ''}`;
        case 'list_directory': return `List ${s.path || '/'}`;
        case 'launch_app': return `Launch ${s.appId || ''}`;
        case 'close_app': return `Close ${s.appId || ''}`;
        case 'set_theme': return `Set Theme → ${s.mode || ''}`;
        case 'set_volume': return `Set Volume → ${s.level ?? ''}`;
        case 'set_wallpaper': return `Set Wallpaper`;
        case 'execute_command': return `Execute Command`;
        case 'get_system_info': return `Get System Info`;
        case 'open_settings': return `Open Settings`;
        default: return toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}

// ── Text Step ─────────────────────────────────────────────────────────────────
function TextStep({ content, isLast }: { content: string; isLast: boolean }) {
    return (
        <div className="relative pl-9 pb-4 last:pb-0">
            {/* Connecting line */}
            {!isLast && (
                <div className="absolute left-[13px] top-5 bottom-0 w-px bg-gradient-to-b from-zinc-300/60 to-zinc-200/30 dark:from-zinc-700/60 dark:to-zinc-800/30" />
            )}

            {/* Icon dot */}
            <div className="absolute left-0.5 top-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm z-10">
                <MessageSquare size={11} className="text-blue-400 dark:text-blue-500" />
            </div>

            {/* Content */}
            <div className="ml-1 pl-3 border-l-2 border-blue-400/30 dark:border-blue-500/25 py-0.5">
                <div className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    <MarkdownRenderer content={content} />
                </div>
            </div>
        </div>
    );
}

// ── Tool Step ─────────────────────────────────────────────────────────────────
function ToolStep({ event, isLast, index }: { event: TimelineEvent; isLast: boolean; index: number }) {
    const { toolCall, result, isError, status } = event;
    const args = (() => { try { return JSON.parse(toolCall.function.arguments || '{}'); } catch { return {}; } })();
    const title = formatTitle(toolCall.function.name, args);
    const currentStatus: TimelineStatus = status || (isError ? 'error' : result ? 'success' : 'loading');

    const resultPreview = result && result.length < 120
        ? result
        : result ? result.substring(0, 120) + '…' : null;

    return (
        <TimelineNode
            title={title}
            status={currentStatus}
            isLast={isLast}
            index={index}
            details={result || args}
            error={isError ? result : undefined}
            description={!isError && resultPreview ? resultPreview : undefined}
        />
    );
}

// ── Summary badge  ────────────────────────────────────────────────────────────
function SummaryBadge({ events, isLoading }: { events: TimelineEvent[]; isLoading?: boolean }) {
    const done = events.filter(e => e.type === 'tool' && e.result).length;
    const total = events.filter(e => e.type === 'tool').length;
    const errors = events.filter(e => e.type === 'tool' && e.isError).length;

    if (isLoading) return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
            <Loader2 size={9} className="animate-spin" />
            {done}/{total || '?'}
        </span>
    );
    if (errors > 0) return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
            <XCircle size={9} />
            {errors} error{errors > 1 ? 's' : ''}
        </span>
    );
    if (total > 0) return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 size={9} />
            {done} done
        </span>
    );
    return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BuilderTimeline({ events, isLoading }: BuilderTimelineProps) {
    const { t } = useTranslation();

    const validEvents = events.filter(e => {
        if (e.type === 'tool') return true;
        return e.content && e.content.trim().length > 0;
    });

    if (validEvents.length === 0) return null;

    const lastEvent = validEvents[validEvents.length - 1];
    const lastIsExecuting = lastEvent?.type === 'tool' && !lastEvent?.result;

    return (
        <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm overflow-hidden shadow-sm my-2">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/6 dark:border-white/6 bg-zinc-50/80 dark:bg-white/[0.025]">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Terminal size={12} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {t('ai.timeline.build_process') || '构建过程'}
                    </span>
                </div>
                <SummaryBadge events={validEvents} isLoading={isLoading} />
            </div>

            {/* ── Timeline Body ─────────────────────────────────────── */}
            <div className="px-4 py-4 flex flex-col gap-0">
                {validEvents.map((event, i) => {
                    const isLast = i === validEvents.length - 1 && !isLoading;

                    if (event.type === 'text' && event.content) {
                        return <TextStep key={i} content={event.content} isLast={isLast} />;
                    }
                    if (event.type === 'tool' && event.toolCall) {
                        return (
                            <ToolStep
                                key={event.toolCall.id || i}
                                event={event}
                                isLast={isLast}
                                index={i}
                            />
                        );
                    }
                    return null;
                })}

                {/* Skeleton: only shown when waiting for a NEW step (last step already done) */}
                {isLoading && !lastIsExecuting && (
                    <div className="relative pl-9 pt-3 animate-pulse">
                        <div className="absolute left-[13px] -top-1 h-5 w-px bg-gradient-to-b from-zinc-300/60 to-zinc-200/20 dark:from-zinc-700/60 dark:to-zinc-800/20" />
                        <div className="absolute left-0.5 top-2.5 w-6 h-6 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 z-10">
                            <Loader2 size={11} className="animate-spin text-indigo-500" />
                        </div>
                        <div className="flex flex-col gap-1.5 py-1">
                            <div className="h-2.5 w-28 bg-zinc-200 dark:bg-zinc-700/60 rounded-full" />
                            <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-full" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
