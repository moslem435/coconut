import { useState, useRef, useEffect, useCallback } from 'react';
import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressCallback } from "@mlc-ai/web-llm";
import { Message, ModelConfig } from '../types';
import { systemToolsDefinitions, systemToolsImplementation, TOOL_CATEGORIES } from '../utils/systemTools';
import { SYSTEM_PATHS } from '@/os/config/paths';

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

    const isInitializingRef = useRef(false);
    const activeGenerationAbortControllerRef = useRef<AbortController | null>(null);

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

    // Auto-detect GPU on mount and cleanup on unmount
    useEffect(() => {
        checkWebGPUSupport().then(({ supported, info }) => {
            if (supported && info) {
                setState(prev => ({ ...prev, gpuInfo: info }));
            }
        });

        return () => {
            if (activeGenerationAbortControllerRef.current) {
                activeGenerationAbortControllerRef.current.abort();
            }
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            engineRef.current = null;
        };
    }, [checkWebGPUSupport]);

    // Initialize the engine
    const initEngine = useCallback(async (modelId: string) => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        if (activeGenerationAbortControllerRef.current) {
            activeGenerationAbortControllerRef.current.abort();
        }

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
        } finally {
            isInitializingRef.current = false;
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
        onUpdate: (updates: string | Partial<any>) => void,
        onNewMessage: (msg: any) => void,
        onFinish: () => void,
        onError: (err: any) => void,
        systemPrompt?: string,
        mode: 'chat' | 'control' | 'builder' = 'chat',
        _cloudConfig?: any,    // ignored in local mode
        _modelSettings?: any   // ignored in local mode, for interface compatibility
    ) => {
        if (!engineRef.current || !state.isModelLoaded) return;

        // Create a new abort controller for this generation
        if (activeGenerationAbortControllerRef.current) {
            activeGenerationAbortControllerRef.current.abort();
        }
        activeGenerationAbortControllerRef.current = new AbortController();
        const signal = activeGenerationAbortControllerRef.current.signal;

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
            const chatMessages: any[] = messages.map(m => {
                const msg: any = {
                    role: m.role,
                    content: m.content
                };
                // @ts-ignore
                if (m.tool_calls) msg.tool_calls = m.tool_calls;
                // @ts-ignore
                if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
                return msg;
            });

            // If tools are supported, we CANNOT pass a custom system prompt as the first message
            // for Hermes-2-Pro and potentially other models when tools are enabled.
            // The system prompt is baked into the model's template or handled differently.
            // OR we need to let the engine handle it via init options, but for now,
            // let's try to MERGE the system prompt into the first user message if tools are active.

            const modeSystemPrompts = {
                chat: "", // Default behavior
                control: "You are a system control assistant for a web OS. Respond in the same language the user speaks (Chinese users → reply in Chinese). RULES: 1) If the user asks a QUESTION (e.g. 'what can you do?', '你有什么功能?'), answer it directly in text — do NOT call any tools. 2) Only call a tool when the user EXPLICITLY requests an action (e.g. '切换暗色主题', 'set volume to 50'). 3) When calling a tool, call EXACTLY ONE tool that matches the request. 4) NEVER call unrelated tools.",
                builder: `You are an expert app builder assistant. Respond in the same language as the user (Chinese users → reply in Chinese).
    
    When a user asks you to CREATE an app, game, website, or tool:
    1. Reply briefly confirming what you will build.
    2. Use the 'create_directory' tool to create a folder for the project with the '.coco' extension (e.g., "${SYSTEM_PATHS.DESKTOP}/SnakeGame.coco").
    3. Use the 'create_file' tool to create the 'index.html' file inside that folder.
    4. Ensure the HTML file links to the CSS and JS files correctly (if you create them separately).
    5. After creating all files, tell the user the app is ready and they can double-click the .coco folder to run it.
    
    Do NOT output raw code blocks unless specifically asked to explain. Prefer creating files directly.`
            };

            const effectiveSystemPrompt = mode !== 'chat' ? modeSystemPrompts[mode] : systemPrompt;

            // Handle System Prompt Logic
            if (effectiveSystemPrompt) {
                // Determine if we need to force system prompt into user message
                // Some models (like Hermes 2 Pro) behave better with tools when system prompt is explicit but separate
                // However, previous attempts to merge into user message caused issues.
                // Let's try a cleaner approach: Standard System Message first.

                // Check if we already have a system message
                const systemIdx = chatMessages.findIndex(m => m.role === 'system');

                let systemContent = effectiveSystemPrompt;

                if (supportsTools) {
                    // Enhance system prompt with mode-specific tool hints
                    if (mode === 'control') {
                        systemContent += `\n\nCRITICAL: CONTROL MODE ACTIVE. If user asks a question → answer in text, NO tools. If user requests an action → call EXACTLY ONE matching tool, then stop.`;
                    }
                    // builder mode: NO tool hint - we want pure text code generation

                    // CRITICAL FIX: Hermes-2-Pro and some other models THROW ERROR if 'system' role is used with tools.
                    // We must PREPEND the system prompt to the LATEST USER message instead.

                    // 1. Remove any existing system messages
                    const systemIdx = chatMessages.findIndex(m => m.role === 'system');
                    if (systemIdx !== -1) {
                        chatMessages.splice(systemIdx, 1);
                    }

                    // 2. Prepend to the LATEST user message (not first) so constraint is closest to current request
                    const lastUserMsgIndex = chatMessages.map(m => m.role).lastIndexOf('user');
                    if (lastUserMsgIndex !== -1) {
                        // Check marker to avoid double prepending
                        if (!chatMessages[lastUserMsgIndex].content.includes("--- User Request ---")) {
                            chatMessages[lastUserMsgIndex].content = `${systemContent}\n\n--- User Request ---\n${chatMessages[lastUserMsgIndex].content}`;
                        }
                    } else {
                        // Fallback
                        chatMessages.push({ role: 'user', content: `${systemContent}\n\n(Waiting for user input)` });
                    }
                } else {
                    // Standard behavior for non-tool models: Use 'system' role
                    if (systemIdx !== -1) {
                        chatMessages[systemIdx].content = systemContent;
                    } else {
                        chatMessages.unshift({ role: 'system', content: systemContent });
                    }
                }
            }

            // Double check: If tools are enabled, absolutely NO system messages should remain
            // if (supportsTools) {
            //    const systemIdx = chatMessages.findIndex(m => m.role === 'system');
            //    if (systemIdx !== -1) {
            //        chatMessages.splice(systemIdx, 1);
            //    }
            // }

            let totalInteractionContent = ''; // NEW: Cumulative content across the loop

            // Loop for handling tool calls (max 5 iterations to prevent infinite loops)
            for (let i = 0; i < 5; i++) {
                // If this is a follow-up turn (after tool execution), we need a new assistant message placeholder in the UI
                if (i > 0) {
                    onNewMessage({ role: 'assistant', content: '', mode });
                }

                const completionParams: any = {
                    messages: chatMessages,
                    stream: true,
                    signal,
                };

                if (supportsTools) {
                    // Filter tools based on mode
                    let allowedToolNames: string[] = [];
                    if (mode === 'control') allowedToolNames = TOOL_CATEGORIES.control;
                    if (mode === 'builder') allowedToolNames = TOOL_CATEGORIES.builder;
                    // builder mode intentionally gets NO tools - pure text code generation

                    const filteredTools = systemToolsDefinitions.filter(t =>
                        allowedToolNames.includes(t.function.name)
                    );

                    if (filteredTools.length > 0) {
                        // @ts-ignore
                        completionParams.tools = filteredTools;
                        completionParams.tool_choice = "auto";
                    }
                }

                if (mode === 'control') {
                    const fallbackInjection = (msg: string) => {
                        let allowedToolNames = TOOL_CATEGORIES.control;
                        const filteredTools = systemToolsDefinitions.filter(t =>
                            allowedToolNames.includes(t.function.name)
                        );
                        const toolsJson = JSON.stringify(filteredTools.map(t => t.function), null, 2);
                        return `${msg}\n\n[System Control Mode]\nAVAILABLE TOOLS:\n${toolsJson}\n\nINSTRUCTION: You MUST output a JSON object to use a tool. Format: {"tool": "tool_name", "args": {...}}`;
                    };

                    // Inject prompt if:
                    // 1. Not using native tools
                    // 2. OR using native tools but we are in a follow-up loop (which might mean previous attempt failed or we are chaining)
                    // Actually, for simplicity, let's inject it ALWAYS for non-native, and ONLY on retry for native.

                    if (!supportsTools) {
                        const lastMsg = chatMessages[chatMessages.length - 1];
                        if (lastMsg.role === 'user' && !lastMsg.content.includes('[System Control Mode]')) {
                            lastMsg.content = fallbackInjection(lastMsg.content);
                        }
                    }
                }

                const reply = await engineRef.current.chat.completions.create(completionParams);

                let fullContent = '';
                const toolCalls: any[] = [];

                for await (const chunk of reply) {
                    if (signal.aborted) break;
                    const delta = chunk.choices[0]?.delta;

                    let hasNewData = false;

                    // Handle content
                    if (delta?.content) {
                        fullContent += delta.content;
                        totalInteractionContent += delta.content;
                        hasNewData = true;
                    }

                    // Handle tool calls
                    if (delta?.tool_calls) {
                        for (const toolCallDelta of delta.tool_calls) {
                            if (toolCallDelta.index !== undefined) {
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
                                    if (toolCallDelta.id) toolCalls[toolCallDelta.index].id = toolCallDelta.id;
                                    if (toolCallDelta.function?.name) toolCalls[toolCallDelta.index].function.name += toolCallDelta.function.name;
                                    if (toolCallDelta.function?.arguments) {
                                        toolCalls[toolCallDelta.index].function.arguments += toolCallDelta.function.arguments;
                                    }
                                }
                            }
                        }
                        hasNewData = true;
                    }

                    if (hasNewData) {
                        // Filter out technical artifacts like empty arrays from streaming
                        const trimmedTotal = totalInteractionContent.trim();
                        if (trimmedTotal === '[]' || trimmedTotal === '[' || trimmedTotal === '') {
                            if (toolCalls.length > 0) {
                                onUpdate({ content: fullContent, tool_calls: [...toolCalls] });
                            }
                        } else {
                            // IMPORTANT: Always send BOTH content and tool_calls to prevent store overwrite
                            onUpdate({ content: fullContent, tool_calls: toolCalls.length > 0 ? [...toolCalls] : undefined });
                        }
                    }
                }

                // If no tool calls, we are done
                if (toolCalls.length === 0) {
                    const trimmedContent = totalInteractionContent.trim();

                    // Fallback: Check if the content is actually a JSON tool call (for non-native models)
                    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
                        try {
                            const potentialToolCall = JSON.parse(trimmedContent);
                            if (potentialToolCall.tool && potentialToolCall.args) {
                                // It looks like a manual tool call!
                                toolCalls.push({
                                    id: 'manual-' + Date.now(),
                                    function: {
                                        name: potentialToolCall.tool,
                                        arguments: JSON.stringify(potentialToolCall.args)
                                    },
                                    type: 'function'
                                });
                                // Clear content from UI since we converted it to an action
                                onUpdate({ content: '' });
                            }
                        } catch (e) {
                            // Not valid JSON, ignore
                        }
                    }

                    // Re-check toolCalls length after fallback check
                    if (toolCalls.length > 0) {
                        // We found a manual tool call, so we break out of this "no tool calls" block
                        // and let the execution logic below handle it.
                    } else {
                        // Safety check: if content is suspiciously empty or just brackets, and we expected action
                        if (trimmedContent === '[]' || trimmedContent === '' || trimmedContent === 'null') {

                            // --- RETRY LOGIC FOR NATIVE TOOL FAILURES ---
                            // If we are in control mode, and using native tools, and failed to get a result:
                            // Try ONE MORE TIME with manual JSON injection.
                            if (mode === 'control' && supportsTools && !chatMessages[chatMessages.length - 1].content.includes('[System Control Mode]')) {
                                console.warn("[AI-Chat] Native tool call failed. Retrying with manual JSON injection...");

                                // Inject manual prompt into the last user message
                                const fallbackInjection = (msg: string) => {
                                    let allowedToolNames = TOOL_CATEGORIES.control;
                                    const filteredTools = systemToolsDefinitions.filter(t =>
                                        allowedToolNames.includes(t.function.name)
                                    );
                                    const toolsJson = JSON.stringify(filteredTools.map(t => t.function), null, 2);
                                    return `${msg}\n\n[System Control Mode]\nAVAILABLE TOOLS:\n${toolsJson}\n\nINSTRUCTION: You MUST output a JSON object to use a tool. Format: {"tool": "tool_name", "args": {...}}`;
                                };

                                // Find last user message
                                const lastUserMsg = chatMessages.filter(m => m.role === 'user').pop();
                                if (lastUserMsg) {
                                    lastUserMsg.content = fallbackInjection(lastUserMsg.content);

                                    // Remove 'tools' from params to force text generation
                                    delete completionParams.tools;
                                    delete completionParams.tool_choice;

                                    // RECURSIVE RETRY (Simplified: just run completion again)
                                    // Note: We can't easily recurse `generateResponse`, but we can loop or just call create() again.
                                    // Since we are inside a loop, we can't easily jump back. 
                                    // HACK: We will mutate `chatMessages` and `completionParams` and continue the outer loop?
                                    // No, the outer loop is for chaining.

                                    // Correct approach: trigger a new generation immediately inside this block
                                    try {
                                        const retryReply = await engineRef.current.chat.completions.create(completionParams);
                                        let retryContent = '';
                                        for await (const chunk of retryReply) {
                                            retryContent += chunk.choices[0]?.delta?.content || '';
                                        }

                                        // Process the retry content for JSON
                                        const retryTrimmed = retryContent.trim();
                                        if (retryTrimmed.startsWith('{') && retryTrimmed.endsWith('}')) {
                                            const potentialToolCall = JSON.parse(retryTrimmed);
                                            if (potentialToolCall.tool && potentialToolCall.args) {
                                                toolCalls.push({
                                                    id: 'retry-' + Date.now(),
                                                    function: {
                                                        name: potentialToolCall.tool,
                                                        arguments: JSON.stringify(potentialToolCall.args)
                                                    },
                                                    type: 'function'
                                                });
                                                onUpdate({ content: '' }); // Clear loading/error text
                                                // Now we have toolCalls, so we break to let the execution logic handle it
                                                // BUT we need to break out of this `if` block.
                                            }
                                        }
                                    } catch (retryErr) {
                                        console.error("Retry failed:", retryErr);
                                    }
                                }
                            }

                            // If STILL no tool calls after retry...
                            if (toolCalls.length === 0) {
                                let fallbackMsg = "Sorry, I couldn't process that request. Could you please rephrase it?";
                                if (mode === 'control') {
                                    fallbackMsg = "I couldn't identify a valid system command. Please be more specific (e.g., 'Switch to dark mode', 'Set volume to 50%').";
                                } else if (mode === 'builder') {
                                    fallbackMsg = "I need more details to build that app. Please describe what you want (e.g., '创建一个贪吃蛇游戏' or 'Create a todo app with dark theme').";
                                }
                                console.warn("[AI-Chat] Empty response from model. Mode:", mode, "Input messages:", chatMessages);
                                onUpdate({ content: fallbackMsg });
                            }
                        }
                        // Break the main loop if we are done (either error or just empty chat)
                        if (toolCalls.length === 0) break;
                    }
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

                    // Add tool result to history (local)
                    chatMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: String(result)
                    });

                    // Add tool result to UI
                    onNewMessage({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: String(result),
                        mode
                    });
                }

                // In control mode: after executing tools, break immediately.
                // This prevents the model from hallucinating and calling additional unrelated tools.
                if (mode === 'control') {
                    // Generate a brief non-streamed confirmation message in the user's language
                    const confirmParams: any = {
                        messages: [...chatMessages, { role: 'user', content: '用一句话简短确认操作已完成（使用用户的语言回复）。' }],
                        stream: false,
                    };
                    try {
                        const confirmReply = await engineRef.current!.chat.completions.create(confirmParams) as any;
                        const confirmContent = confirmReply?.choices?.[0]?.message?.content || '';
                        if (confirmContent.trim()) {
                            onUpdate({ content: confirmContent });
                        }
                    } catch (_) {
                        // Ignore confirmation errors silently — the tool result message is enough
                    }
                    break; // Stop the loop — control mode only does ONE round of tool calls
                }

                // Continue loop to generate response based on tool results
            }

            onFinish();
            setState(prev => ({ ...prev, isLoading: false }));
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log("Generation aborted by user or system");
                setState(prev => ({ ...prev, isLoading: false }));
                return;
            }
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
