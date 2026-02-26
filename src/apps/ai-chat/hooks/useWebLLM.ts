import { useState, useRef, useEffect, useCallback } from 'react';
import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressCallback } from "@mlc-ai/web-llm";
import { Message, ModelConfig } from '../types';
import { systemToolsDefinitions, systemToolsImplementation } from '../utils/systemTools';

export interface WebLLMState {
    isLoading: boolean;
    isModelLoaded: boolean;
    progress: string;
    progressValue: number; // 0-1
    error: string | null;
    currentModelId: string | null;
    downloadStats: {
        speed: string;
        eta: string;
        downloaded: string;
        total: string;
    } | null;
    gpuInfo: string | null;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC",
        name: "Hermes 2 Pro (Llama 3)",
        description: "Best for tool use & coding",
        size: "~5.2GB",
        vram: "6GB",
        recommended: true,
        sizeBytes: 5.2 * 1024 * 1024 * 1024
    },
    {
        id: "Llama-3-8B-Instruct-q4f32_1-MLC",
        name: "Llama 3 8B (4-bit)",
        description: "ai.model.desc.llama3",
        size: "~5.2GB",
        vram: "6GB",
        recommended: false,
        sizeBytes: 5.2 * 1024 * 1024 * 1024
    },
    {
        id: "DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC",
        name: "DeepSeek R1 Distill (8B)",
        description: "ai.model.desc.deepseek",
        size: "~5.5GB",
        vram: "6GB",
        sizeBytes: 5.5 * 1024 * 1024 * 1024
    },
    {
        id: "Qwen2.5-7B-Instruct-q4f32_1-MLC",
        name: "Qwen 2.5 7B",
        description: "ai.model.desc.qwen",
        size: "~5.0GB",
        vram: "6GB",
        sizeBytes: 5.0 * 1024 * 1024 * 1024
    },
    {
        id: "Phi-3.5-mini-instruct-q4f32_1-MLC",
        name: "Phi 3.5 Mini",
        description: "ai.model.desc.phi",
        size: "~3.6GB",
        vram: "4GB",
        sizeBytes: 3.6 * 1024 * 1024 * 1024
    },
    {
        id: "Mistral-7B-Instruct-v0.3-q4f32_1-MLC",
        name: "Mistral 7B v0.3",
        description: "ai.model.desc.mistral",
        size: "~5.0GB",
        vram: "6GB",
        sizeBytes: 5.0 * 1024 * 1024 * 1024
    },
    {
        id: "SmolLM2-1.7B-Instruct-q4f32_1-MLC",
        name: "SmolLM2 1.7B",
        description: "ai.model.desc.smollm",
        size: "~1.5GB",
        vram: "2GB",
        sizeBytes: 1.5 * 1024 * 1024 * 1024
    },
    {
        id: "gemma-2-2b-it-q4f32_1-MLC",
        name: "Gemma 2 2B",
        description: "ai.model.desc.gemma",
        size: "~1.8GB",
        vram: "2GB",
        sizeBytes: 1.8 * 1024 * 1024 * 1024
    }
];

export function useWebLLM() {
    const [state, setState] = useState<WebLLMState>({
        isLoading: false,
        isModelLoaded: false,
        progress: '',
        progressValue: 0,
        error: null,
        currentModelId: null,
        downloadStats: null,
        gpuInfo: null
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
            return { supported: false, info: null };
        }
        try {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!adapter) return { supported: false, info: null };

            let info = '';
            if (adapter.info) {
                info = adapter.info.description || adapter.info.device || '';
                if (!info) {
                    // @ts-ignore
                    const vendor = adapter.info.vendor || '';
                    // @ts-ignore
                    const arch = adapter.info.architecture || '';
                    if (vendor || arch) {
                        info = `${vendor} ${arch}`.trim();
                    }
                }
            } else if ('requestAdapterInfo' in adapter) {
                // @ts-ignore
                const adapterInfo = await adapter.requestAdapterInfo();
                info = adapterInfo.description || adapterInfo.device || '';
            }

            if (!info) {
                info = 'WebGPU Adapter (Unknown)';
            }

            return { supported: true, info };
        } catch (e) {
            return { supported: false, info: null };
        }
    }, []);

    // Auto-detect GPU on mount
    useEffect(() => {
        checkWebGPUSupport().then(({ supported, info }) => {
            if (supported && info) {
                setState(prev => ({ ...prev, gpuInfo: info }));
            }
        });
    }, [checkWebGPUSupport]);

    // Initialize the engine
    const initEngine = useCallback(async (modelId: string) => {
        try {
            abortRef.current = false;

            const { supported, info } = await checkWebGPUSupport();
            if (!supported) {
                throw new Error("ai.error.webgpu_not_supported");
            }

            setState(prev => ({
                ...prev,
                isLoading: true,
                error: null,
                currentModelId: modelId,
                downloadStats: null,
                gpuInfo: info
            }));

            lastProgressRef.current = null;
            lastStatsRef.current = null;
            currentSpeedRef.current = 0;

            if (!workerRef.current) {
                const worker = new Worker(
                    new URL('../worker/llm.worker.ts', import.meta.url),
                    { type: 'module' }
                );
                workerRef.current = worker;
            }

            const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
            const totalSize = modelConfig?.sizeBytes || 0;

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
                    if (lastProgressRef.current) {
                        const timeDiff = (now - lastProgressRef.current.time) / 1000;
                        const progressDiff = report.progress - lastProgressRef.current.value;

                        if (timeDiff > 0.1 && progressDiff > 0) {
                            const bytesDiff = progressDiff * totalSize;
                            const instantSpeed = bytesDiff / timeDiff;

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

            if (!engineRef.current) {
                const engine = await CreateWebWorkerMLCEngine(
                    workerRef.current,
                    modelId,
                    { initProgressCallback: onProgress }
                );
                if (abortRef.current) return;
                engineRef.current = engine;
            } else {
                // IMPORTANT: Do NOT pass initProgressCallback here.
                // The reload function sends config via postMessage, and functions cannot be cloned.
                // The engine already has the worker reference, so we just trigger the reload.
                // To handle progress updates for reloads, we need a different approach or rely on the engine's internal state.
                // However, for now, to fix the crash, we omit the callback.
                // If progress tracking is critical for reloads, we might need to re-instantiate the engine or use a proxy.
                await engineRef.current.reload(modelId);
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
            currentModelId: null
        }));
    }, []);

    const generateResponse = useCallback(async (
        messages: Message[],
        onUpdate: (content: string) => void,
        onFinish: () => void,
        onError: (err: any) => void,
        systemPrompt?: string
    ) => {
        if (!engineRef.current || !state.isModelLoaded) return;

        setState(prev => ({ ...prev, isLoading: true }));

        try {
            // Models that support function calling
            const modelsWithFunctionCalling = [
                "Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC",
                "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC",
                "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
                "Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
                "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
                "Llama-3-8B-Instruct-q4f32_1-MLC",
                "Llama-3-8B-Instruct-q4f16_1-MLC"
            ];
            const supportsTools = state.currentModelId && modelsWithFunctionCalling.includes(state.currentModelId);

            // Prepend system prompt if exists
            const chatMessages: any[] = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            if (systemPrompt) {
                // Check if system message already exists
                const hasSystem = chatMessages.length > 0 && chatMessages[0].role === 'system';
                if (!hasSystem) {
                    chatMessages.unshift({ role: 'system', content: systemPrompt });
                }
            }

            let totalInteractionContent = ''; // NEW: Cumulative content across the loop

            // Loop for handling tool calls (max 5 iterations to prevent infinite loops)
            for (let i = 0; i < 5; i++) {
                const completionParams: any = {
                    messages: chatMessages,
                    stream: true,
                };

                if (supportsTools) {
                    // @ts-ignore
                    completionParams.tools = systemToolsDefinitions;
                    completionParams.tool_choice = "auto";
                }

                const reply: any = await engineRef.current.chat.completions.create(completionParams);

                let fullContent = '';
                let toolCalls: any[] = [];

                for await (const chunk of reply) {
                    const delta = chunk.choices[0]?.delta;

                    // Handle content
                    if (delta?.content) {
                        fullContent += delta.content;
                        totalInteractionContent += delta.content;
                        onUpdate(totalInteractionContent);
                    }

                    // Handle tool calls
                    if (delta?.tool_calls) {
                        for (const toolCallDelta of delta.tool_calls) {
                            if (toolCallDelta.index !== undefined) {
                                // Start new tool call or continue existing
                                if (!toolCalls[toolCallDelta.index]) {
                                    toolCalls[toolCallDelta.index] = {
                                        id: toolCallDelta.id || '',
                                        function: {
                                            name: toolCallDelta.function?.name || '',
                                            arguments: toolCallDelta.function?.arguments || ''
                                        },
                                        type: 'function'
                                    };
                                } else {
                                    // Append arguments
                                    if (toolCallDelta.function?.arguments) {
                                        toolCalls[toolCallDelta.index].function.arguments += toolCallDelta.function.arguments;
                                    }
                                }
                            }
                        }
                    }
                }

                // If no tool calls, we are done
                if (toolCalls.length === 0) {
                    break;
                }

                // Add assistant message with tool calls to history
                chatMessages.push({
                    role: 'assistant',
                    content: fullContent || null,
                    tool_calls: toolCalls
                });

                // Add a newline to separate thoughts between tool calls if there was content
                if (fullContent) {
                    totalInteractionContent += '\n\n';
                }

                // Execute tools
                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    console.log(`[AI-Chat] Executing tool: ${functionName}`, functionArgs);

                    let result = '';
                    if (systemToolsImplementation[functionName]) {
                        try {
                            result = await systemToolsImplementation[functionName](functionArgs);
                        } catch (e: any) {
                            result = `Error executing tool: ${e.message}`;
                        }
                    } else {
                        result = `Error: Tool ${functionName} not found`;
                    }

                    // Add tool result to history
                    chatMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: String(result)
                    });

                    // Optional: You could append tool results to totalInteractionContent if you want them visible
                    // totalInteractionContent += `*已执行: ${functionName}*\n`;
                    // onUpdate(totalInteractionContent);
                }

                // Continue loop to generate response based on tool results
            }

            onFinish();
            setState(prev => ({ ...prev, isLoading: false }));
        } catch (err: any) {
            console.error("Chat error:", err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err.message || "Failed to generate response"
            }));
            onError(err);
        }
    }, [state.isModelLoaded]);

    const deleteModel = useCallback(async (modelId: string) => {
        try {
            // WebLLM caches models in Cache Storage API
            if ('caches' in window) {
                // Delete model weights
                await caches.delete(`webllm/model/${modelId}`);
                // Also try to delete wasm cache if specific to model
                await caches.delete(`webllm/wasm/${modelId}`);

                // Note: This is a best-effort cleanup based on WebLLM's caching strategy.
                // Complete cleanup might require clearing IndexedDB 'webllm/model' database if used.
                // However, deleting cache storage is usually sufficient to free up space.

                // Try to clear IndexedDB if possible (requires manual DB operations)
                // For now, we rely on cache API.

                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to delete model:", e);
            return false;
        }
    }, []);

    return {
        ...state,
        initEngine,
        generateResponse,
        unloadModel,
        cancelLoading,
        deleteModel
    };
}
