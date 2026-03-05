
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Play, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/os/sdk';

// 语言 → 左侧竖条颜色映射
const LANG_COLORS: Record<string, string> = {
    tsx: 'border-l-cyan-400',
    jsx: 'border-l-cyan-400',
    typescript: 'border-l-blue-400',
    ts: 'border-l-blue-400',
    javascript: 'border-l-yellow-400',
    js: 'border-l-yellow-400',
    python: 'border-l-green-400',
    py: 'border-l-green-400',
    rust: 'border-l-orange-400',
    go: 'border-l-sky-400',
    css: 'border-l-pink-400',
    html: 'border-l-red-400',
    json: 'border-l-amber-400',
    yaml: 'border-l-lime-400',
    yml: 'border-l-lime-400',
    bash: 'border-l-emerald-400',
    sh: 'border-l-emerald-400',
    sql: 'border-l-violet-400',
    markdown: 'border-l-zinc-400',
    md: 'border-l-zinc-400',
};

// 语言 → 标签文字颜色
const LANG_LABEL_COLORS: Record<string, string> = {
    tsx: 'text-cyan-400',
    jsx: 'text-cyan-400',
    typescript: 'text-blue-400',
    ts: 'text-blue-400',
    javascript: 'text-yellow-400',
    js: 'text-yellow-400',
    python: 'text-green-400',
    py: 'text-green-400',
    rust: 'text-orange-400',
    go: 'text-sky-400',
    css: 'text-pink-400',
    html: 'text-red-400',
    json: 'text-amber-400',
    yaml: 'text-lime-400',
    yml: 'text-lime-400',
    bash: 'text-emerald-400',
    sh: 'text-emerald-400',
    sql: 'text-violet-400',
    markdown: 'text-zinc-400',
    md: 'text-zinc-400',
};

function getLangColor(lang: string | null): string {
    return LANG_COLORS[lang ?? ''] ?? 'border-l-zinc-400 dark:border-l-zinc-600';
}

function getLangLabelColor(lang: string | null): string {
    return LANG_LABEL_COLORS[lang ?? ''] ?? 'text-zinc-500';
}

interface MarkdownRendererProps {
    content: string;
    isUser?: boolean;
    onRunApp?: (code: string, language: string) => void;
    isLoading?: boolean;
}

// 代码块独立组件
function CodeBlock({
    language,
    codeContent,
    children,
    className,
    isUser,
    isLoading,
    onRunApp,
    ...props
}: {
    language: string | null;
    codeContent: string;
    children: React.ReactNode;
    className?: string;
    isUser?: boolean;
    isLoading?: boolean;
    onRunApp?: (code: string, lang: string) => void;
    [key: string]: any;
}) {
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

    const isRunnable =
        language &&
        ['tsx', 'jsx', 'javascript', 'typescript', 'js', 'ts', 'html'].includes(language);

    const handleCopy = () => {
        navigator.clipboard.writeText(codeContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const langBarColor = getLangColor(language);
    const langLabelColor = getLangLabelColor(language);

    // 用户消息 — 简洁深色
    if (isUser) {
        return (
            <div className={cn("relative my-3 rounded-lg overflow-hidden border border-white/10 bg-black/40 border-l-2", langBarColor)}>
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
                    <span className={cn("text-[10px] font-mono font-medium", langLabelColor)}>{language?.toUpperCase()}</span>
                    <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                        {copied ? <><Check size={9} className="text-emerald-400" /><span className="text-emerald-400">{t('ai.msg.copied')}</span></> : <><Copy size={9} /><span>{t('ai.msg.copy')}</span></>}
                    </button>
                </div>
                <div className="p-3 overflow-x-auto"><code className={className} {...props}>{children}</code></div>
            </div>
        );
    }

    // 助手消息
    return (
        <div className={cn(
            "relative my-3 rounded-lg overflow-hidden",
            "border border-black/8 dark:border-white/8",
            "bg-zinc-50 dark:bg-[#1a1a1a]",
            "border-l-2", langBarColor
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/5">
                <span className={cn("text-[10px] font-mono font-semibold", langLabelColor)}>
                    {language?.toUpperCase() ?? 'CODE'}
                </span>
                <div className="flex items-center gap-1">
                    {/* 运行按钮 — 生成中隐藏 */}
                    {isRunnable && onRunApp && !isLoading && (
                        <button
                            onClick={() => onRunApp(codeContent, language || '')}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 transition-colors"
                            title={t('ai.tool.run_app_desc')}
                        >
                            <Play size={9} className="fill-current" />
                            {t('ai.msg.run_app')}
                        </button>
                    )}
                    {/* 复制按钮 */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
                    >
                        {copied
                            ? <><Check size={9} className="text-emerald-500" /><span className="text-emerald-500">{t('ai.msg.copied')}</span></>
                            : <><Copy size={9} /><span>{t('ai.msg.copy')}</span></>
                        }
                    </button>
                </div>
            </div>
            {/* Code */}
            <div className="p-4 overflow-x-auto">
                <code className={className} {...props}>{children}</code>
            </div>
        </div>
    );
}

export function MarkdownRenderer({ content, isUser, onRunApp, isLoading }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
                code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1]! : null;

                    const extractText = (node: any): string => {
                        if (typeof node === 'string') return node;
                        if (Array.isArray(node)) return node.map(extractText).join('');
                        if (node?.props?.children) return extractText(node.props.children);
                        return '';
                    };
                    const codeContent = extractText(children).replace(/\n$/, '');

                    // 行内代码
                    if (inline || !match) {
                        return (
                            <code
                                className={cn(
                                    className,
                                    isUser
                                        ? "bg-white/10 px-1.5 py-0.5 rounded text-inherit font-normal border border-white/5"
                                        : "bg-black/6 dark:bg-white/10 px-1.5 py-0.5 rounded text-inherit font-normal border border-black/5 dark:border-white/5"
                                )}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    }

                    return (
                        <CodeBlock
                            language={language}
                            codeContent={codeContent}
                            className={className}
                            isUser={isUser}
                            isLoading={isLoading}
                            onRunApp={onRunApp}
                            {...props}
                        >
                            {children}
                        </CodeBlock>
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
