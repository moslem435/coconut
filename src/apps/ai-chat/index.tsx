import { useEffect, useRef, useState } from 'react';
import { Send, RefreshCw, Cpu, AlertTriangle, MessageSquare, Download, Settings, ChevronLeft, Wifi, X, Bot, User, Sparkles, MoreHorizontal } from 'lucide-react';
import { useWebLLM, AVAILABLE_MODELS } from './hooks/useWebLLM';
import { useLanguage } from '@/os/kernel/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIChatApp() {
    const { t } = useLanguage();
    const { 
        isLoading, 
        isModelLoaded, 
        progress, 
        progressValue, 
        messages, 
        error, 
        currentModelId,
        downloadStats,
        gpuInfo,
        initEngine, 
        sendMessage, 
        resetChat,
        unloadModel,
        cancelLoading
    } = useWebLLM();

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputRef.current?.value) {
            sendMessage(inputRef.current.value);
            inputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'AI Assistant';

    // Model Selection View
    if (!isModelLoaded && !isLoading && !error) {
        return (
            <div className="h-full flex flex-col bg-[var(--os-bg-window)] text-[var(--os-text-primary)] overflow-hidden pt-10">
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="w-20 h-20 bg-gradient-to-tr from-[var(--os-accent)] to-purple-500 rounded-[22px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[var(--os-accent)]/20">
                            <Sparkles size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-3">{t('ai.welcome.title')}</h2>
                        <p className="text-[var(--os-text-secondary)] text-base max-w-lg mx-auto leading-relaxed">
                            {t('ai.welcome.desc')}
                        </p>
                    </motion.div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        {AVAILABLE_MODELS.map((model, idx) => (
                            <motion.button 
                                key={model.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => initEngine(model.id)}
                                className="group relative overflow-hidden bg-[var(--os-bg-panel)]/50 border border-[var(--os-border)] hover:border-[var(--os-accent)]/50 rounded-2xl p-5 transition-all hover:bg-[var(--os-hover-bg)] text-left hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 rounded-xl bg-[var(--os-bg-base)] group-hover:bg-[var(--os-accent)]/10 transition-colors">
                                        <Cpu size={20} className="text-[var(--os-text-primary)] group-hover:text-[var(--os-accent)]" />
                                    </div>
                                    {model.recommended && (
                                        <span className="text-[10px] font-bold bg-[var(--os-accent)] text-white px-2 py-1 rounded-full shadow-sm shadow-[var(--os-accent)]/20">
                                            {t('ai.model.recommend')}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-lg mb-1">{model.name}</h4>
                                <p className="text-xs text-[var(--os-text-secondary)] mb-4 line-clamp-2 h-8">
                                    {t(model.description)}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-[var(--os-text-muted)] pt-3 border-t border-[var(--os-border)]/50">
                                    <span className="flex items-center gap-1.5">
                                        <Download size={12} />
                                        {model.size}
                                    </span>
                                    <span className="w-px h-3 bg-[var(--os-border)]"></span>
                                    <span>VRAM: {model.vram}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                    
                    {gpuInfo && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 flex items-center gap-2 text-xs text-[var(--os-text-muted)] bg-[var(--os-bg-panel)]/50 py-1.5 px-3 rounded-full border border-[var(--os-border)]"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span>GPU: {gpuInfo}</span>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    }

    // Loading View
    if (!isModelLoaded && isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[var(--os-bg-window)] text-[var(--os-text-primary)] p-8 relative">
                <button 
                    onClick={cancelLoading}
                    className="absolute top-14 right-6 p-2 text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)] hover:bg-[var(--os-hover-bg)] rounded-full transition-colors"
                    title={t('ai.action.cancel')}
                >
                    <X size={20} />
                </button>

                <div className="w-80 space-y-6 text-center">
                    <div className="relative w-24 h-24 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-[var(--os-border)]"
                            />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 * (1 - progressValue)}
                                className="text-[var(--os-accent)] transition-all duration-300 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xl font-bold">{Math.round(progressValue * 100)}%</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">{t('ai.status.loading')}</h3>
                        <p className="text-xs text-[var(--os-text-muted)] px-4 leading-relaxed line-clamp-2">
                            {progress}
                        </p>
                    </div>
                    
                    {downloadStats && (
                        <div className="grid grid-cols-3 gap-2 bg-[var(--os-bg-panel)]/50 p-3 rounded-xl border border-[var(--os-border)]">
                            <div>
                                <div className="text-[10px] text-[var(--os-text-muted)] uppercase tracking-wider mb-0.5">{t('ai.stats.speed')}</div>
                                <div className="text-xs font-mono">{downloadStats.speed}</div>
                            </div>
                            <div className="border-l border-[var(--os-border)]/50">
                                <div className="text-[10px] text-[var(--os-text-muted)] uppercase tracking-wider mb-0.5">{t('ai.stats.eta')}</div>
                                <div className="text-xs font-mono">{downloadStats.eta}</div>
                            </div>
                            <div className="border-l border-[var(--os-border)]/50">
                                <div className="text-[10px] text-[var(--os-text-muted)] uppercase tracking-wider mb-0.5">{t('ai.stats.downloaded')}</div>
                                <div className="text-xs font-mono">{downloadStats.downloaded}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Chat View
    return (
        <div className="h-full flex flex-col bg-[var(--os-bg-window)] text-[var(--os-text-primary)] pt-10">
            {/* Header */}
            <div className="h-14 border-b border-[var(--os-border)]/50 flex items-center justify-between px-4 bg-[var(--os-bg-window)]/80 backdrop-blur-xl z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={unloadModel}
                        className="p-2 hover:bg-[var(--os-hover-bg)] rounded-xl text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)] transition-colors group"
                        title={t('ai.action.change_model')}
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{currentModelName}</span>
                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                        </div>
                        {gpuInfo && (
                            <span className="text-[10px] text-[var(--os-text-muted)] truncate max-w-[200px] opacity-70">
                                {gpuInfo}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={resetChat}
                    className="p-2 hover:bg-[var(--os-hover-bg)] rounded-xl text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)] transition-colors"
                    title={t('ai.chat.reset')}
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-3 text-sm text-red-500 overflow-hidden"
                    >
                        <AlertTriangle size={16} className="shrink-0" />
                        <span className="truncate">{error.startsWith('ai.error') ? t(error) : error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)] opacity-60">
                        <div className="w-20 h-20 bg-[var(--os-bg-panel)] rounded-[24px] flex items-center justify-center mb-6 border border-[var(--os-border)]">
                            <Bot size={40} />
                        </div>
                        <p className="text-lg font-medium mb-2">{t('ai.chat.default_greeting')}</p>
                        <p className="text-sm max-w-xs text-center">{t('ai.chat.powered_by')}</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--os-accent)] to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-md">
                                <Bot size={16} className="text-white" />
                            </div>
                        )}
                        
                        <div 
                            className={`
                                max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-[var(--os-accent)] text-white rounded-tr-sm' 
                                    : 'bg-[var(--os-bg-panel)] text-[var(--os-text-primary)] border border-[var(--os-border)] rounded-tl-sm'}
                            `}
                        >
                            {msg.content || (isLoading && idx === messages.length - 1 ? (
                                <div className="flex gap-1 h-5 items-center">
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200"></span>
                                </div>
                            ) : '')}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-[var(--os-bg-panel)] border border-[var(--os-border)] flex items-center justify-center shrink-0 mt-1">
                                <User size={16} className="text-[var(--os-text-secondary)]" />
                            </div>
                        )}
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area */}
            <div className="p-4 pb-6 bg-gradient-to-t from-[var(--os-bg-window)] via-[var(--os-bg-window)] to-transparent">
                <div 
                    className={`
                        relative flex items-center gap-2 bg-[var(--os-bg-panel)]/80 backdrop-blur-xl border 
                        ${isInputFocused ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/20' : 'border-[var(--os-border)]'} 
                        rounded-[24px] px-2 py-2 shadow-2xl transition-all duration-300
                    `}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('ai.chat.placeholder')}
                        className="flex-1 bg-transparent border-none px-4 py-2 text-sm outline-none text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)] min-h-[44px]"
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        disabled={isLoading && !isModelLoaded}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !isModelLoaded}
                        className={`
                            p-2.5 rounded-xl transition-all duration-300
                            ${(isLoading || !isModelLoaded) 
                                ? 'bg-[var(--os-bg-base)] text-[var(--os-text-muted)] cursor-not-allowed' 
                                : 'bg-[var(--os-accent)] text-white hover:bg-[var(--os-accent-dim)] shadow-lg shadow-[var(--os-accent)]/20 hover:scale-105 active:scale-95'}
                        `}
                    >
                        <Send size={18} className={isLoading && isModelLoaded ? 'animate-pulse' : ''} />
                    </button>
                </div>
                <div className="mt-3 text-[10px] text-[var(--os-text-muted)] text-center opacity-60">
                    {t('ai.chat.powered_by')}
                </div>
            </div>
        </div>
    );
}
