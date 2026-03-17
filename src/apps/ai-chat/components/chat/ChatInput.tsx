
import { useRef, useEffect, useState } from 'react';
import { Send, StopCircle, MessageSquare, Settings2, Hammer, Zap, Atom, Hexagon, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/os/sdk';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    onCancel: () => void;
    isLoading: boolean;
    isModelLoaded: boolean;
    chatMode: 'chat' | 'control' | 'builder';
    setChatMode: (mode: 'chat' | 'control' | 'builder') => void;
}

export function ChatInput({
    input,
    setInput,
    onSend,
    onCancel,
    isLoading,
    isModelLoaded,
    chatMode,
    setChatMode
}: ChatInputProps) {
    const { t } = useTranslation();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposing, setIsComposing] = useState(false);

    // Handle input resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleTemplateClick = (templatePrompt: string) => {
        setChatMode('builder');
        setInput(templatePrompt);
        // We use setTimeout to allow state to update before sending
        setTimeout(() => {
            onSend();
        }, 50);
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-32 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 z-10">
            <div className="max-w-3xl mx-auto relative pointer-events-auto flex flex-col w-full">
                
                {/* Quick Templates (Only in Builder Mode) */}
                {chatMode === 'builder' && !isLoading && (
                    <div className="flex flex-wrap justify-center gap-2 mb-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={() => handleTemplateClick('直接调用 scaffold_static_app 生成一个基础静态模板应用。名称设为 demo-static。不要做任何其他修改。')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-white/60 dark:bg-black/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-black hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm backdrop-blur-md"
                        >
                            <Zap size={12} className="text-amber-500" />
                            <span>Static App</span>
                        </button>
                        <button
                            onClick={() => handleTemplateClick('直接调用 scaffold_react_app 生成一个基础 React 模板应用。名称设为 demo-react。不要做任何其他修改。')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-white/60 dark:bg-black/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-black hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm backdrop-blur-md"
                        >
                            <Atom size={12} className="text-cyan-500" />
                            <span>React App</span>
                        </button>
                        <button
                            onClick={() => handleTemplateClick('直接调用 scaffold_vue_app 生成一个基础 Vue 3 模板应用。名称设为 demo-vue。不要做任何其他修改。')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-white/60 dark:bg-black/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-black hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm backdrop-blur-md"
                        >
                            <Hexagon size={12} className="text-emerald-500" />
                            <span>Vue App</span>
                        </button>
                        <button
                            onClick={() => handleTemplateClick('直接调用 scaffold_fullstack_app 生成一个基础全栈模板应用。名称设为 demo-fullstack。不要做任何其他修改。')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-white/60 dark:bg-black/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-black hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm backdrop-blur-md"
                        >
                            <Database size={12} className="text-purple-500" />
                            <span>Fullstack App</span>
                        </button>
                    </div>
                )}

                {/* Mode Selector */}
                <div className="flex items-center self-start gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100 w-full">
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
                        {isLoading ? (
                            <button
                                onClick={onCancel}
                                className="p-2 rounded-lg text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                title={t('ai.loading.cancel')}
                            >
                                <StopCircle size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={onSend}
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
    );
}
