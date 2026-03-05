
import { useState } from 'react';
import {
    Check, X, Loader2, ChevronDown, ChevronRight,
    File, Folder, Terminal, Settings, Play, Trash2, Move, Copy, List, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/os/sdk';

export type TimelineStatus = 'pending' | 'loading' | 'success' | 'error';

interface TimelineNodeProps {
    title: string;
    description?: string;
    status: TimelineStatus;
    icon?: React.ElementType;
    isLast?: boolean;
    details?: any;
    error?: string;
    timestamp?: number;
    index?: number;
}

export function TimelineNode({
    title,
    description,
    status,
    icon: Icon,
    isLast,
    details,
    error,
    index = 0
}: TimelineNodeProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation();

    // ── Status indicator ───────────────────────────────────────────────────────
    const StatusIcon = () => {
        if (status === 'loading') return <Loader2 size={13} className="animate-spin text-indigo-400 dark:text-indigo-400" />;
        if (status === 'success') return <Check size={12} strokeWidth={3} className="text-white" />;
        if (status === 'error') return <X size={12} strokeWidth={3} className="text-white" />;
        return <div className="w-2 h-2 rounded-full bg-zinc-400/60" />;
    };

    const nodeStyle = {
        pending: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700',
        loading: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300/60 dark:border-indigo-500/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]',
        success: 'bg-emerald-500 border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]',
        error: 'bg-red-500 border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]',
    }[status];

    const lineStyle = {
        pending: 'from-zinc-200/60 to-zinc-100/30 dark:from-zinc-700/60 dark:to-zinc-800/30',
        loading: 'from-indigo-300/50 to-indigo-100/20 dark:from-indigo-500/30 dark:to-indigo-900/10',
        success: 'from-emerald-400/50 to-emerald-200/20 dark:from-emerald-500/30 dark:to-emerald-900/10',
        error: 'from-red-400/50 to-red-200/20 dark:from-red-500/30 dark:to-red-900/10',
    }[status];

    // Tool icon inference
    const NodeIcon = Icon || (() => {
        const tl = title.toLowerCase();
        if (tl.includes('directory') || tl.includes('folder')) return Folder;
        if (tl.includes('delete')) return Trash2;
        if (tl.includes('move')) return Move;
        if (tl.includes('copy')) return Copy;
        if (tl.includes('list')) return List;
        if (tl.includes('file')) return File;
        if (tl.includes('launch') || tl.includes('run')) return Play;
        if (tl.includes('theme') || tl.includes('setting')) return Settings;
        if (tl.includes('info') || tl.includes('system')) return Info;
        return Terminal;
    });

    return (
        <div
            className="relative pl-9 pb-5 last:pb-0 animate-in fade-in slide-in-from-left-1 duration-300"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
        >
            {/* Connecting line */}
            {!isLast && (
                <div className={cn(
                    'absolute left-[13px] top-6 bottom-0 w-px bg-gradient-to-b',
                    lineStyle
                )} />
            )}

            {/* Status circle */}
            <div className={cn(
                'absolute left-0.5 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 z-10',
                nodeStyle
            )}>
                <StatusIcon />
            </div>

            {/* Content */}
            <div className={cn(
                'flex flex-col gap-0.5 rounded-lg px-2 py-0.5 -mx-1 transition-colors duration-200',
                status === 'error' && 'bg-red-50/50 dark:bg-red-900/10'
            )}>
                {/* Title row */}
                <div
                    className="flex items-center gap-1.5 cursor-pointer group"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className={cn(
                        'text-[13px] font-semibold leading-snug transition-colors',
                        status === 'loading' ? 'text-indigo-600 dark:text-indigo-400' :
                            status === 'error' ? 'text-red-600 dark:text-red-400' :
                                status === 'success' ? 'text-zinc-700 dark:text-zinc-200' :
                                    'text-zinc-500 dark:text-zinc-400'
                    )}>
                        {title}
                    </span>
                    {details && (
                        <div className={cn(
                            'opacity-0 group-hover:opacity-60 transition-opacity text-zinc-400',
                            isExpanded && 'opacity-60'
                        )}>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </div>
                    )}
                </div>

                {/* Description (result preview) */}
                {description && !isExpanded && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-mono truncate max-w-sm">
                        {description}
                    </p>
                )}

                {/* Error message */}
                {error && (
                    <div className="mt-1 text-[11px] text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-900/20 font-mono">
                        {error}
                    </div>
                )}

                {/* Expanded details */}
                {isExpanded && details && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="text-[9px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                            {t('ai.tool.details')}
                        </div>
                        <div className="bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5 rounded-lg p-2.5 overflow-x-auto">
                            <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words">
                                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
