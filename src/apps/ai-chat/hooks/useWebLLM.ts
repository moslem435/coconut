import { useState, useRef, useEffect, useCallback } from 'react';
import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressCallback } from "@mlc-ai/web-llm";

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface WebLLMState {
    isLoading: boolean;
    isModelLoaded: boolean;
    progress: string;
    progressValue: number; // 0-1
    messages: Message[];
    error: string | null;
    currentModelId: string | null;
    downloadStats: {
        speed: string;
        eta: string;
        downloaded: string;
        total: string;
    } | null;
}

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    size: string;
    vram: string;
    recommended?: boolean;
    sizeBytes?: number; // Approximate size in bytes for calculation
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: "Llama-3-8B-Instruct-q4f32_1-MLC",
        name: "Llama 3 8B (4-bit)",
        description: "ai.model.llama3.desc",
        size: "~5.2GB",
        vram: "6GB",
        recommended: true,
        sizeBytes: 5.2 * 1024 * 1024 * 1024
    },
    {
        id: "Llama-3-8B-Instruct-q4f16_1-MLC",
        name: "Llama 3 8B (Low VRAM)",
        description: "ai.model.llama3_low.desc",
        size: "~4.5GB",
        vram: "4GB",
        sizeBytes: 4.5 * 1024 * 1024 * 1024
    },
    {
        id: "gemma-2b-it-q4f32_1-MLC",
        name: "Gemma 2B",
        description: "ai.model.gemma2b.desc",
        size: "~1.5GB",
        vram: "2GB",
        sizeBytes: 1.5 * 1024 * 1024 * 1024
    },
    {
        id: "RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC",
        name: "RedPajama 3B",
        description: "ai.model.redpajama.desc",
        size: "~1.8GB",
        vram: "3GB",
        sizeBytes: 1.8 * 1024 * 1024 * 1024
    }
];

export function useWebLLM() {
    const [state, setState] = useState<WebLLMState>({
        isLoading: false,
        isModelLoaded: false,
        progress: '',
        progressValue: 0,
        messages: [],
        error: null,
        currentModelId: null,
        downloadStats: null
    });

    const engineRef = useRef<MLCEngineInterface | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const lastProgressRef = useRef<{ value: number; time: number } | null>(null);
    const lastStatsRef = useRef<{ speed: string; eta: string } | null>(null);
    const currentSpeedRef = useRef<number>(0);
    const abortRef = useRef(false);

    // Check WebGPU support
    const checkWebGPUSupport = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            return false;
        }
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch (e) {
            return false;
        }
    }, []);

    // Initialize the engine
    const initEngine = useCallback(async (modelId: string) => {
        try {
            abortRef.current = false;
            setState(prev => ({ 
                ...prev, 
                isLoading: true, 
                error: null, 
                currentModelId: modelId,
                downloadStats: null 
            }));

            // Check WebGPU support first
            const isWebGPUSupported = await checkWebGPUSupport();
            if (!isWebGPUSupported) {
                throw new Error("ai.error.webgpu_not_supported");
            }
            
            lastProgressRef.current = null;
            lastStatsRef.current = null;
            currentSpeedRef.current = 0;
            
            // Create worker if not exists
            if (!workerRef.current) {
                const worker = new Worker(
                    new URL('../worker/llm.worker.ts', import.meta.url), 
                    { type: 'module' }
                );
                workerRef.current = worker;
            }

            const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
            const totalSize = modelConfig?.sizeBytes || 0;

            // Progress callback
            const onProgress: InitProgressCallback = (report) => {
                if (abortRef.current) return;
                const now = Date.now();
                
                const formatBytes = (bytes: number) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                };

                let stats = null;

                if (totalSize > 0 && report.progress > 0 && report.progress < 1) {
                    // Update Speed/ETA every 0.1s (100ms) for smoother UI
                    if (lastProgressRef.current) {
                        const timeDiff = (now - lastProgressRef.current.time) / 1000; // seconds
                        const progressDiff = report.progress - lastProgressRef.current.value;
                        
                        if (timeDiff > 0.1 && progressDiff > 0) { 
                            const bytesDiff = progressDiff * totalSize;
                            const instantSpeed = bytesDiff / timeDiff; // bytes/sec
                            
                            // Simple moving average smoothing (0.2 new, 0.8 old)
                            // If it's the first calculation, use instant speed directly
                            const newSpeed = currentSpeedRef.current === 0 
                                ? instantSpeed 
                                : (currentSpeedRef.current * 0.8 + instantSpeed * 0.2);
                            
                            currentSpeedRef.current = newSpeed;

                            const remainingBytes = (1 - report.progress) * totalSize;
                            const etaSeconds = newSpeed > 0 ? remainingBytes / newSpeed : 0;

                            lastStatsRef.current = {
                                speed: `${formatBytes(newSpeed)}/s`,
                                eta: `${Math.ceil(etaSeconds)}s`
                            };
                            
                            lastProgressRef.current = { value: report.progress, time: now };
                        }
                    } else {
                        lastProgressRef.current = { value: report.progress, time: now };
                    }

                    // Always update downloaded amount
                    if (lastStatsRef.current) {
                        stats = {
                            ...lastStatsRef.current,
                            downloaded: formatBytes(report.progress * totalSize),
                            total: formatBytes(totalSize)
                        };
                    }
                }

                setState(prev => ({
                    ...prev,
                    progress: report.text,
                    progressValue: report.progress,
                    downloadStats: stats || prev.downloadStats
                }));
            };

            // Initialize engine
            if (!engineRef.current) {
                const engine = await CreateWebWorkerMLCEngine(
                    workerRef.current,
                    modelId,
                    { initProgressCallback: onProgress }
                );
                if (abortRef.current) return;
                engineRef.current = engine;
            } else {
                // Reload if engine exists
                await engineRef.current.reload(modelId, { initProgressCallback: onProgress });
                if (abortRef.current) return;
            }

            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                isModelLoaded: true,
                progress: 'Model Loaded',
                progressValue: 1
            }));

        } catch (err: any) {
            if (abortRef.current) return;
            console.error("Failed to init WebLLM:", err);
            
            let errorMessage = err.message || "Failed to initialize AI engine";
            
            // Map known errors to translation keys
            if (errorMessage.includes("Unable to find a compatible GPU")) {
                errorMessage = "ai.error.webgpu_init_failed";
            } else if (errorMessage === "ai.error.webgpu_not_supported") {
                // Keep the key thrown above
            }
            
            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: errorMessage 
            }));
        }
    }, []);

    const cancelLoading = useCallback(() => {
        abortRef.current = true;
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        engineRef.current = null;
        setState(prev => ({
            ...prev,
            isLoading: false,
            isModelLoaded: false,
            progress: '',
            progressValue: 0,
            messages: [],
            error: null,
            currentModelId: null,
            downloadStats: null
        }));
    }, []);

    const unloadModel = useCallback(async () => {
        if (engineRef.current) {
             await engineRef.current.unload();
        }
        setState(prev => ({
            ...prev,
            isModelLoaded: false,
            currentModelId: null,
            messages: []
        }));
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        if (!engineRef.current || !state.isModelLoaded) return;

        const newMessages: Message[] = [
            ...state.messages,
            { role: 'user', content }
        ];

        setState(prev => ({
            ...prev,
            messages: newMessages,
            isLoading: true
        }));

        try {
            const reply = await engineRef.current.chat.completions.create({
                messages: newMessages,
                stream: true // Enable streaming
            });

            let assistantMessage = '';
            
            // Initial empty assistant message
            setState(prev => ({
                ...prev,
                messages: [...newMessages, { role: 'assistant', content: '' }]
            }));

            for await (const chunk of reply) {
                const delta = chunk.choices[0]?.delta?.content || '';
                assistantMessage += delta;
                
                setState(prev => ({
                    ...prev,
                    messages: [
                        ...newMessages,
                        { role: 'assistant', content: assistantMessage }
                    ]
                }));
            }

            setState(prev => ({ ...prev, isLoading: false }));
        } catch (err: any) {
            console.error("Chat error:", err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err.message || "Failed to generate response"
            }));
        }
    }, [state.messages, state.isModelLoaded]);

    const resetChat = useCallback(async () => {
        if (engineRef.current) {
            await engineRef.current.resetChat();
        }
        setState(prev => ({
            ...prev,
            messages: [],
            error: null
        }));
    }, []);

    return {
        ...state,
        initEngine,
        sendMessage,
        resetChat,
        unloadModel,
        cancelLoading
    };
}
