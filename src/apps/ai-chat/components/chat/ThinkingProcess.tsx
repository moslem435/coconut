
import { useState } from 'react';
import { useTranslation } from '@/os/sdk';
import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingProcessProps {
    content: string;
    isGenerating?: boolean;
}

export function ThinkingProcess({ content, isGenerating }: ThinkingProcessProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation();

    return (
        <div className="mb-3">
            {/* ── 顶部通知条 ── */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all duration-200",
                    "bg-amber-50/80 dark:bg-amber-500/5",
                    "border border-amber-200/60 dark:border-amber-500/15",
                    "hover:bg-amber-100/80 dark:hover:bg-amber-500/10",
                    "group"
                )}
            >
                {/* 图标 */}
                <BrainCircuit
                    size={13}
                    className={cn(
                        "shrink-0 transition-all duration-300",
                        isGenerating
                            ? "text-amber-500 animate-pulse"
                            : "text-amber-500/70"
                    )}
                />

                {/* 文字 */}
                <span className="text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80 flex-1">
                    {isGenerating ? (
                        <span className="flex items-center gap-1.5">
                            {t('ai.msg.thinking')}
                            <span className="flex gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-amber-500/70 animate-bounce [animation-delay:0ms]" />
                                <span className="w-1 h-1 rounded-full bg-amber-500/70 animate-bounce [animation-delay:150ms]" />
                                <span className="w-1 h-1 rounded-full bg-amber-500/70 animate-bounce [animation-delay:300ms]" />
                            </span>
                        </span>
                    ) : (
                        t('ai.msg.thinking')
                    )}
                </span>

                {/* 展开/折叠箭头 */}
                <span className={cn(
                    "text-amber-400/60 transition-transform duration-200",
                    isExpanded && "rotate-180"
                )}>
                    <ChevronDown size={12} />
                </span>
            </button>

            {/* ── 展开内容 — max-height 过渡 ── */}
            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-80 opacity-100 mt-1" : "max-h-0 opacity-0"
            )}>
                <div className={cn(
                    "px-3 py-2.5 rounded-lg",
                    "bg-amber-50/50 dark:bg-amber-500/[0.04]",
                    "border border-amber-200/40 dark:border-amber-500/10",
                    "border-l-2 border-l-amber-400/50"
                )}>
                    <pre className="text-[11px] font-mono text-amber-800/70 dark:text-amber-200/50 leading-relaxed whitespace-pre-wrap break-words">
                        {content.trim()}
                    </pre>
                </div>
            </div>
        </div>
    );
}
