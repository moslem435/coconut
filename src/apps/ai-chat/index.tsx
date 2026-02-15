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
            <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden pt-10">
                <div className="p-6 pb-2 text-center">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Cpu size={24} className="text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('ai.welcome.title')}</h2>
                    <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">
                        {t('ai.welcome.desc')}
                    </p>
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
                                className="bg-[#252526] border border-[#333] hover:border-blue-500/50 rounded-lg p-4 transition-all hover:bg-[#2a2a2c] flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-blue-100">{model.name}</h4>
                                    {model.recommended && (
                                        <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-600/30">
                                            {t('ai.model.recommend')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mb-4 flex-1">
                                    {t(model.description)}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                            {t('ai.model.size')}: {model.size}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                            {t('ai.model.vram')}: {model.vram}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => initEngine(model.id)}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
            <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-white p-8 relative">
                <button 
                    onClick={cancelLoading}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-full transition-colors"
                    title={t('ai.action.cancel')}
                >
                    <X size={20} />
                </button>

                <div className="w-80 space-y-4">
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>{t('ai.status.loading')}</span>
                        <span>{Math.round(progressValue * 100)}%</span>
                    </div>
                    <div className="h-2 bg-[#333] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 relative" 
                            style={{ width: `${progressValue * 100}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center px-2 break-words leading-tight">{progress}</p>
                    
                    {/* Detailed Stats */}
                    {downloadStats && (
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#333]">
                            <div className="text-center">
                                <div className="text-[10px] text-gray-500 mb-1">{t('ai.stats.speed')}</div>
                                <div className="text-sm font-medium text-blue-400">{downloadStats.speed}</div>
                            </div>
                            <div className="text-center border-l border-[#333]">
                                <div className="text-[10px] text-gray-500 mb-1">{t('ai.stats.eta')}</div>
                                <div className="text-sm font-medium text-gray-300">{downloadStats.eta}</div>
                            </div>
                            <div className="text-center border-l border-[#333]">
                                <div className="text-[10px] text-gray-500 mb-1">{t('ai.stats.downloaded')}</div>
                                <div className="text-sm font-medium text-gray-300">{downloadStats.downloaded}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Chat View
    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-white pt-10">
            {/* Header */}
            <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526]">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={unloadModel}
                        className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white mr-2"
                        title={t('ai.action.change_model')}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <Cpu size={16} className="text-green-400" />
                    <span className="font-medium text-sm truncate max-w-[200px]">{currentModelName}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={resetChat}
                        className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                        title={t('ai.chat.reset')}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-900/50 border-b border-red-900/50 p-2 flex items-center gap-2 text-sm text-red-200 px-4">
                    <AlertTriangle size={16} />
                    {error.startsWith('ai.error') ? t(error) : error}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
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
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-[#333] text-gray-200'}
                            `}
                        >
                            {msg.content || (isLoading && idx === messages.length - 1 ? <span className="animate-pulse">...</span> : '')}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#333] bg-[#252526]">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('ai.chat.placeholder')}
                        className="flex-1 bg-[#1e1e1e] border border-[#333] rounded px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors text-white placeholder-gray-500"
                        onKeyDown={handleKeyDown}
                        disabled={isLoading && !isModelLoaded}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !isModelLoaded}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-gray-500 text-center">
                    {t('ai.chat.powered_by')}
                </div>
            </div>
        </div>
    );
}
