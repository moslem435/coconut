import { useEffect, useRef } from 'react';
import { Send, RefreshCw, Cpu, AlertTriangle, MessageSquare, Download, Settings, ChevronLeft, Wifi, X } from 'lucide-react';
import { useWebLLM, AVAILABLE_MODELS } from './hooks/useWebLLM';
import { useLanguage } from '@/os/kernel/LanguageContext';

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
                <div className="p-6 pb-2 text-center">
                    <div className="w-12 h-12 bg-[var(--os-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Cpu size={24} className="text-[var(--os-accent)]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('ai.welcome.title')}</h2>
                    <p className="text-[var(--os-text-secondary)] text-sm max-w-lg mx-auto mb-6">
                        {t('ai.welcome.desc')}
                    </p>
                    {gpuInfo && (
                        <div className="mb-6 flex flex-col items-center gap-1 text-xs text-[var(--os-text-muted)] bg-[var(--os-bg-panel)] py-2 px-4 rounded-lg border border-[var(--os-border)] w-fit mx-auto max-w-[90%]">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Detected GPU: <span className="text-[var(--os-text-primary)] font-medium">{gpuInfo}</span>
                            </div>
                            <p className="text-[10px] opacity-70 mt-1">
                                If this is not your dedicated GPU, check your browser settings to enable hardware acceleration.
                            </p>
                        </div>
                    )}
                    <h3 className="text-lg font-medium text-left px-4 mb-4 flex items-center gap-2">
                        <Download size={18} />
                        {t('ai.model.select')}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {AVAILABLE_MODELS.map((model) => (
                            <div 
                                key={model.id}
                                className="bg-[var(--os-bg-panel)] border border-[var(--os-border)] hover:border-[var(--os-accent)]/50 rounded-lg p-4 transition-all hover:bg-[var(--os-hover-bg)] flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-[var(--os-accent)]">{model.name}</h4>
                                    {model.recommended && (
                                        <span className="text-[10px] bg-[var(--os-accent)]/20 text-[var(--os-accent)] px-2 py-0.5 rounded-full border border-[var(--os-accent)]/30">
                                            {t('ai.model.recommend')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--os-text-secondary)] mb-4 flex-1">
                                    {t(model.description)}
                                </p>
                                <div className="flex items-center justify-between text-xs text-[var(--os-text-muted)] mb-4">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--os-text-muted)]"></span>
                                            {t('ai.model.size')}: {model.size}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--os-text-muted)]"></span>
                                            {t('ai.model.vram')}: {model.vram}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => initEngine(model.id)}
                                    className="w-full py-2 bg-[var(--os-accent)] hover:bg-[var(--os-accent-dim)] rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white"
                                >
                                    <Download size={14} />
                                    {t('ai.button.start')}
                                </button>
                            </div>
                        ))}
                    </div>
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
                    className="absolute top-6 right-6 p-2 text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)] hover:bg-[var(--os-hover-bg)] rounded-full transition-colors"
                    title={t('ai.action.cancel')}
                >
                    <X size={20} />
                </button>

                <div className="w-80 space-y-4">
                    <div className="flex justify-between text-sm text-[var(--os-text-secondary)]">
                        <span>{t('ai.status.loading')}</span>
                        <span>{Math.round(progressValue * 100)}%</span>
                    </div>
                    <div className="h-2 bg-[var(--os-bg-panel)] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[var(--os-accent)] transition-all duration-300 relative" 
                            style={{ width: `${progressValue * 100}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--os-text-muted)] text-center px-2 break-words leading-tight">{progress}</p>
                    {gpuInfo && (
                        <p className="text-[10px] text-[var(--os-text-muted)] text-center mt-1 opacity-70">
                            Running on: {gpuInfo}
                        </p>
                    )}
                    
                    {/* Detailed Stats */}
                    {downloadStats && (
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--os-border)]">
                            <div className="text-center">
                                <div className="text-[10px] text-[var(--os-text-muted)] mb-1">{t('ai.stats.speed')}</div>
                                <div className="text-sm font-medium text-[var(--os-accent)]">{downloadStats.speed}</div>
                            </div>
                            <div className="text-center border-l border-[var(--os-border)]">
                                <div className="text-[10px] text-[var(--os-text-muted)] mb-1">{t('ai.stats.eta')}</div>
                                <div className="text-sm font-medium text-[var(--os-text-secondary)]">{downloadStats.eta}</div>
                            </div>
                            <div className="text-center border-l border-[var(--os-border)]">
                                <div className="text-[10px] text-[var(--os-text-muted)] mb-1">{t('ai.stats.downloaded')}</div>
                                <div className="text-sm font-medium text-[var(--os-text-secondary)]">{downloadStats.downloaded}</div>
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
            <div className="h-12 border-b border-[var(--os-border)] flex items-center justify-between px-4 bg-[var(--os-bg-panel)]">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={unloadModel}
                        className="p-1 hover:bg-[var(--os-hover-bg)] rounded text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)] mr-2"
                        title={t('ai.action.change_model')}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <Cpu size={16} className="text-green-400" />
                    <span className="font-medium text-sm truncate max-w-[200px]">{currentModelName}</span>
                    
                    {/* GPU Info */}
                    {gpuInfo && (
                        <div className="hidden sm:flex items-center text-xs text-[var(--os-text-muted)] border-l border-[var(--os-border)] pl-3 ml-1 h-4">
                            <span className="truncate max-w-[150px]" title={gpuInfo}>{gpuInfo}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={resetChat}
                        className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)] transition-colors"
                        title={t('ai.chat.reset')}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-[var(--os-danger)]/20 border-b border-[var(--os-danger)]/30 p-2 flex items-center gap-2 text-sm text-[var(--os-danger)] px-4">
                    <AlertTriangle size={16} />
                    {error.startsWith('ai.error') ? t(error) : error}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]">
                        <MessageSquare size={48} className="opacity-20 mb-4" />
                        <p>{t('ai.chat.default_greeting')}</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`
                                max-w-[85%] rounded-lg px-4 py-2 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-[var(--os-accent)] text-white' 
                                    : 'bg-[var(--os-bg-selection)] text-[var(--os-text-primary)]'}
                            `}
                        >
                            {msg.content || (isLoading && idx === messages.length - 1 ? <span className="animate-pulse">...</span> : '')}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--os-border)] bg-[var(--os-bg-panel)]">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('ai.chat.placeholder')}
                        className="flex-1 bg-[var(--os-bg-input)] border border-[var(--os-border)] rounded px-4 py-2 text-sm outline-none focus:border-[var(--os-accent)] transition-colors text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)]"
                        onKeyDown={handleKeyDown}
                        disabled={isLoading && !isModelLoaded}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !isModelLoaded}
                        className="px-4 py-2 bg-[var(--os-accent)] hover:bg-[var(--os-accent-dim)] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-[var(--os-text-muted)] text-center">
                    {t('ai.chat.powered_by')}
                </div>
            </div>
        </div>
    );
}
