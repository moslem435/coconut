
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation, useWindow, useWindowState } from '@/os/sdk';
import { useWindowContext } from '@/os/kernel/WindowContext';
import { useChatStore } from '../store/useChatStore';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { ChatInput } from './chat/ChatInput';
import { useWebLLM } from '../hooks/useWebLLM';
import { useCloudLLM } from '../hooks/useCloudLLM';
import { useBatchUpdate, useRAFThrottle, useTPSCalculator } from '../hooks/useBatchUpdate';
import { AlertCircle, PanelLeft, Plus } from 'lucide-react';

export function ChatArea() {
    const { t } = useTranslation();
    const {
        currentSessionId,
        sessions,
        updateSessionTitle,
        addMessage,
        updateLastMessage,
        aiProvider,
        cloudConfig,
        modelSettings,
        toggleSidebar,
        isSidebarOpen
    } = useChatStore();

    const currentSession = sessions.find(s => s.id === currentSessionId);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [input, setInput] = useState('');
    const [chatMode, setChatMode] = useState<'chat' | 'control' | 'builder'>('chat');
    const [sendError, setSendError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { launch, minimize, maximize, close, update } = useWindow();
    const windowContext = useWindowContext();
    const windowId = windowContext?.windowId || '';
    const dragControls = windowContext?.dragControls;
    const windowState = useWindowState(windowId);

    // ── LLM hooks (both always called, interface is identical) ──
    const webLLM = useWebLLM();
    const cloudLLM = useCloudLLM();

    const llm = aiProvider === 'local' ? webLLM : cloudLLM;

    const sessionIdRef = useRef<string | null>(null);
    const generationStartRef = useRef<number | null>(null);
    const tpsCalculator = useTPSCalculator();

    const { batchUpdate: batchUpdateMessage, flush: flushMessageUpdates } = useBatchUpdate(
        useCallback((updates: any) => {
            const sid = sessionIdRef.current;
            if (sid) {
                updateLastMessage(sid, updates);
            }
        }, [updateLastMessage]),
        {
            maxBatchSize: 5,
            maxWaitTime: 50,
            onFlush: () => {
                console.debug('[ChatArea] Message updates flushed');
            }
        }
    );

    const throttledScroll = useRAFThrottle(() => {
        console.debug('[ChatArea] Scroll throttled');
    });

    useEffect(() => {
        sessionIdRef.current = currentSessionId;
    }, [currentSessionId]);

    // Listen for model load events from Sidebar
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            webLLM.initEngine(e.detail.modelId);
        };
        window.addEventListener('ai-chat:load-model', handler as EventListener);
        return () => window.removeEventListener('ai-chat:load-model', handler as EventListener);
    }, [webLLM.initEngine]);

    // Sync WebLLM state to Global Store
    useEffect(() => {
        useChatStore.getState().setIsLocalModelLoading(webLLM.isLoading);
        
        if (webLLM.isModelLoaded && webLLM.currentModelId) {
            useChatStore.getState().setCurrentLocalModelId(webLLM.currentModelId);
        } else if (!webLLM.isModelLoaded && !webLLM.isLoading) {
             // If not loaded and not loading, maybe reset? 
             // But be careful not to reset if it's just initial state.
             // Actually, if we unload, we should reset.
             if (webLLM.currentModelId === null) {
                 useChatStore.getState().setCurrentLocalModelId(null);
             }
        }
    }, [webLLM.isLoading, webLLM.isModelLoaded, webLLM.currentModelId]);

    // Shared callbacks for message updates
    const onUpdate = useCallback((updates: any) => {
        const sid = sessionIdRef.current;
        if (!sid) return;

        const nextUpdates = (() => {
            if (updates && typeof updates === 'object' && updates.tps === undefined && typeof updates.content === 'string') {
                const start = generationStartRef.current;
                if (start) {
                    const elapsed = (Date.now() - start) / 1000;
                    const estimatedTokens = updates.content.length / 4;
                    const tps = estimatedTokens / Math.max(0.1, elapsed);
                    return { ...updates, tps };
                }
            }
            return updates;
        })();

        batchUpdateMessage(nextUpdates);
    }, [batchUpdateMessage]);

    const onNewMessage = useCallback((msg: any) => {
        if (!currentSessionId) return;

        if (msg.role === 'assistant' && !msg.tool_calls?.length && !msg.isPlaceholder) {
            // This is the "finalized text content" snapshot the cloud hook saves before
            // executing tool calls. It's already been streamed into our placeholder via
            // onUpdate — just sync the final content to avoid adding a duplicate.
            updateLastMessage(currentSessionId, {
                content: msg.content ?? '',
                mode: msg.mode
            });
        } else {
            // New messages: tool results, or assistant messages WITH tool_calls (the tool call request)
            addMessage(
                currentSessionId,
                msg.role,
                msg.content ?? '',
                msg.mode,
                msg.tool_calls,
                msg.tool_call_id
            );
        }
    }, [currentSessionId, addMessage, updateLastMessage]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || llm.isLoading) return;
        if (aiProvider === 'local' && !webLLM.isModelLoaded) return;

        setSendError(null);

        // Flush any pending updates before starting new generation
        flushMessageUpdates();

        // Add user message
        addMessage(currentSessionId!, 'user', input, chatMode);

        // Add placeholder assistant message that will be streamed into
        const startTime = Date.now();
        generationStartRef.current = startTime;
        tpsCalculator.start();
        const assistantMsgId = addMessage(currentSessionId!, 'assistant', '', chatMode);

        setInput('');

        // Get the latest messages snapshot (including the user message just added)
        const latestMessages = useChatStore.getState().sessions
            .find(s => s.id === currentSessionId)?.messages ?? [];

        // Remove the empty placeholder from the messages we send to the model
        const messagesToSend = latestMessages.filter(m => !(m.role === 'assistant' && m.content === '' && !m.tool_calls?.length));

        try {
            await llm.generateResponse(
                messagesToSend,
                onUpdate,
                onNewMessage,
                (stats?: { tps?: number }) => {
                    const duration = Date.now() - startTime;
                    generationStartRef.current = null;
                    tpsCalculator.reset();
                    useChatStore.getState().updateMessageById(currentSessionId!, assistantMsgId, {
                        startTime,
                        duration,
                        ...(stats?.tps !== undefined ? { tps: stats.tps } : {})
                    });
                },
                (err: any) => {
                    tpsCalculator.reset();
                    setSendError(err?.message || t('ai.error.unknown'));
                },
                modelSettings?.systemPrompt || '',
                chatMode,
                aiProvider === 'cloud' ? cloudConfig : undefined,
                modelSettings
            );
        } catch (err: any) {
            tpsCalculator.reset();
            setSendError(err?.message || t('ai.error.unknown'));
        }
    }, [input, currentSessionId, llm, aiProvider, webLLM.isModelLoaded, chatMode, cloudConfig, modelSettings, addMessage, onUpdate, onNewMessage, t, flushMessageUpdates, tpsCalculator]);

    const handleCopy = useCallback((content: string, id: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    }, []);

    const handleStartEditTitle = () => {
        setTitleInput(currentSession?.title || '');
        setIsEditingTitle(true);
    };

    const handleTitleSubmit = () => {
        if (titleInput.trim() && currentSessionId) {
            updateSessionTitle(currentSessionId, titleInput.trim());
        }
        setIsEditingTitle(false);
    };

    if (!currentSessionId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-white dark:bg-zinc-950 text-sm gap-4">
                <p>{t('ai.sidebar.no_chats')}</p>
                <div className="flex gap-2">
                    {!isSidebarOpen && (
                        <button
                            onClick={toggleSidebar}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                        >
                            <PanelLeft size={16} />
                            {t('ai.sidebar.open')}
                        </button>
                    )}
                    <button
                        onClick={() => useChatStore.getState().createSession()}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--os-accent)] hover:brightness-110 text-white rounded-lg transition-colors shadow-sm shadow-[var(--os-accent)]/20"
                    >
                        <Plus size={16} />
                        {t('ai.sidebar.new_chat')}
                    </button>
                </div>
            </div>
        );
    }

    const currentModelName = aiProvider === 'local'
        ? (webLLM.currentModelId || t('ai.model.not_loaded'))
        : (cloudConfig?.modelId || 'Cloud');

    return (
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-white dark:bg-zinc-950">
            <ChatHeader
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
                isEditingTitle={isEditingTitle}
                titleInput={titleInput}
                onTitleChange={setTitleInput}
                onTitleSubmit={handleTitleSubmit}
                onTitleKeyDown={(e) => { if (e.key === 'Enter') handleTitleSubmit(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                onStartEditTitle={handleStartEditTitle}
                currentSessionTitle={currentSession?.title || ''}
                isModelLoaded={llm.isModelLoaded}
                currentModelName={currentModelName}
                aiProvider={aiProvider}
                isSidebar={windowState?.isSidebar || false}
                isMaximized={windowState?.isMaximized || false}
                onDetach={() => {
                    if (windowId) {
                        update(windowId, { isSidebar: false });
                    }
                }}
                onMinimize={() => windowId && minimize(windowId)}
                onMaximize={() => windowId && maximize(windowId)}
                onClose={() => windowId && close(windowId)}
                onDragStart={(e) => dragControls?.start(e)}
            />

            {/* Send Error Banner */}
            {sendError && (
                <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="flex-1">{sendError}</span>
                    <button
                        onClick={() => setSendError(null)}
                        className="ml-auto text-red-400 hover:text-red-600 transition-colors font-bold"
                    >×</button>
                </div>
            )}

            <MessageList
                messages={currentSession?.messages || []}
                isLoading={llm.isLoading}
                isModelLoaded={llm.isModelLoaded}
                progressValue={aiProvider === 'local' ? webLLM.progressValue : 0}
                progressText={aiProvider === 'local' ? webLLM.progress : ''}
                downloadStats={aiProvider === 'local' ? webLLM.downloadStats : null}
                engineError={aiProvider === 'local' ? webLLM.error : cloudLLM.error}
                onInitModel={() => webLLM.initEngine(webLLM.currentModelId || 'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC')}
                onCancelLoading={aiProvider === 'local' ? webLLM.cancelLoading : cloudLLM.cancelLoading}
                onToggleSidebar={toggleSidebar}
                onSetInput={setInput}
                onCopy={handleCopy}
                copiedId={copiedId}
                onRunApp={(code, lang) => {
                    if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
                        launch('terminal', 'Terminal', 'terminal');
                    } else {
                        launch('vscode-lite', 'VS Code Lite', 'vscode-lite');
                    }
                }}
            />

            <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onCancel={aiProvider === 'local' ? webLLM.cancelLoading : cloudLLM.cancelLoading}
                isLoading={llm.isLoading}
                isModelLoaded={llm.isModelLoaded}
                chatMode={chatMode}
                setChatMode={setChatMode}
            />
        </div>
    );
}
