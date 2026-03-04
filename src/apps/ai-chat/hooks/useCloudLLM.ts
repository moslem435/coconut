import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/os/sdk';
import { Message, CloudConfig } from '../types';
import { systemToolsDefinitions, systemToolsImplementation, TOOL_CATEGORIES } from '../utils/systemTools';
import { SYSTEM_PATHS } from '@/os/config/paths';

export interface CloudLLMState {
    isLoading: boolean;
    error: string | null;
}

// Cloud model presets
export const CLOUD_MODELS = {
    gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fastest, great for most tasks' },
        { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', description: 'Reasoning model' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '2M context, most capable' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast & efficient' },
        { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro', description: 'Best performance model' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Next gen speed model' },
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable' },
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable OpenAI model' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Use with DeepSeek base URL' },
        { id: 'qwen-plus', name: 'Qwen Plus', description: 'Use with Alibaba Cloud base URL' },
    ]
};

// ─── Gemini Tool Format Converter ──────────────────────────────────────────────

function toGeminiType(t: string): string {
    return t.toUpperCase();
}

function convertPropertiesToGemini(props: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(props)) {
        const converted: any = { ...val, type: toGeminiType(val.type || 'STRING') };
        if (val.properties) {
            converted.properties = convertPropertiesToGemini(val.properties);
        }
        if (val.items) {
            converted.items = { ...val.items, type: toGeminiType(val.items.type || 'STRING') };
        }
        result[key] = converted;
    }
    return result;
}

function formatGeminiTools(toolNames: string[]) {
    const filtered = systemToolsDefinitions.filter(t => toolNames.includes(t.function.name));
    const functionDeclarations = filtered.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: {
            type: 'OBJECT',
            properties: convertPropertiesToGemini(t.function.parameters.properties || {}),
            required: t.function.parameters.required || []
        }
    }));
    return functionDeclarations;
}

// ─── Build Gemini History (preserving tool call context) ───────────────────────
//
// Gemini message format:
//   user text      → { role: 'user',  parts: [{ text }] }
//   assistant text → { role: 'model', parts: [{ text }] }
//   assistant tool → { role: 'model', parts: [{ functionCall: { name, args } }] }
//   tool result    → { role: 'user',  parts: [{ functionResponse: { name, response: { result } } }] }
//
// We build an id→name map from assistant tool_calls so tool results can
// reference the correct function name (Message.role==='tool' has no name field).

function buildGeminiHistory(messages: Message[]): any[] {
    // Build a map: tool_call_id → function name
    const toolCallIdToName: Record<string, string> = {};
    for (const m of messages) {
        if (m.role === 'assistant' && m.tool_calls?.length) {
            for (const tc of m.tool_calls) {
                if (tc.id && tc.function?.name) {
                    toolCallIdToName[tc.id] = tc.function.name;
                }
            }
        }
    }

    const contents: any[] = [];

    for (const m of messages) {
        if (m.role === 'system') continue; // Gemini uses systemInstruction instead

        if (m.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
        } else if (m.role === 'assistant') {
            if (m.tool_calls?.length) {
                // Assistant turn with function calls
                const fcParts = m.tool_calls.map((tc: any) => ({
                    functionCall: {
                        name: tc.function?.name || '',
                        args: (() => {
                            try { return JSON.parse(tc.function?.arguments || '{}'); } catch { return {}; }
                        })()
                    }
                }));
                // If there is also text content, emit it as a separate preceding turn
                if (m.content) {
                    contents.push({ role: 'model', parts: [{ text: m.content }] });
                }
                contents.push({ role: 'model', parts: fcParts });
            } else {
                contents.push({ role: 'model', parts: [{ text: m.content || '' }] });
            }
        } else if (m.role === 'tool') {
            // Tool result — Gemini expects this as a user turn with functionResponse parts
            const fnName = m.tool_call_id ? (toolCallIdToName[m.tool_call_id] || 'unknown') : 'unknown';
            contents.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: fnName,
                        response: { result: m.content || '' }
                    }
                }]
            });
        }
    }

    return contents;
}

// ─── Build OpenAI History (preserving tool call context) ───────────────────────

function buildOpenAIHistory(messages: Message[], systemContent: string): any[] {
    const apiMessages: any[] = [{ role: 'system', content: systemContent }];

    for (const m of messages) {
        if (m.role === 'system') continue;

        if (m.role === 'user') {
            apiMessages.push({ role: 'user', content: m.content || '' });
        } else if (m.role === 'assistant') {
            const msg: any = { role: 'assistant', content: m.content || null };
            if (m.tool_calls?.length) {
                msg.tool_calls = m.tool_calls;
            }
            apiMessages.push(msg);
        } else if (m.role === 'tool') {
            apiMessages.push({
                role: 'tool',
                tool_call_id: m.tool_call_id || '',
                content: m.content || ''
            });
        }
    }

    return apiMessages;
}

// ─── Build mode-aware system instruction ────────────────────────────────────────

function buildSystemInstruction(mode: string, systemPrompt: string): string {
    const hardcoded: Record<string, string> = {
        control: `You are a system control assistant for a web OS. Respond in the user's language.
You have tools to control the system. Follow these rules:
1. THEME: use set_theme with 'light' or 'dark'.
2. VOLUME: use set_volume with a level from 0 to 100.
3. WALLPAPER: use set_wallpaper with a real, publicly accessible image URL (e.g. from unsplash.com).
4. LAUNCH APP: use launch_app with one of these exact appId values:
   "vscode-lite", "terminal", "file-explorer", "settings", "portfolio-hub",
   "notepad", "music-player", "photo-gallery", "weather", "task-manager",
   "ai-chat", "code-runner", "yume", "emulator"
5. CLOSE APP: First call get_running_apps to retrieve the windowId, then call close_app with that windowId.
6. STATUS: use get_system_status to read current settings before modifying if needed.
Never make up windowIds. Always query running apps first before closing.`,
        builder: `You are an expert app builder for a web-based OS. Respond in the user's language.
When asked to create an app/game/tool:
1. Briefly explain what you will build.
2. Use 'create_directory' to create a folder with '.app' extension (e.g. "${SYSTEM_PATHS.DESKTOP}/MyGame.app").
3. Use 'create_file' to write a SINGLE self-contained 'index.html' inside that folder.
   CRITICAL: The index.html MUST be fully self-contained — embed ALL CSS inside <style> tags and ALL JavaScript inside <script> tags. Do NOT create separate .css or .js files, as they cannot be loaded in this environment.
4. After the file is created, confirm the app is ready and the user can double-click the folder to run it.
When asked to modify or fix an existing app:
1. Use 'read_file' to read the current file content.
2. Apply the requested changes.
3. Use 'update_file' to overwrite the file with the updated content.`
    };

    if (mode === 'chat') {
        return systemPrompt || 'You are a helpful assistant in a web-based OS.';
    }

    const base = hardcoded[mode] || 'You are a helpful assistant.';
    // Append user custom prompt as additional context if provided
    return systemPrompt ? `${base}\n\n[User custom instructions]: ${systemPrompt}` : base;
}

// ─── Gemini API — Multi-turn Agentic Call ──────────────────────────────────────

async function callGemini(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string,
    modelSettings: { temperature: number; top_p: number },
    onUpdate: (update: Partial<any>) => void,
    onNewMessage: (msg: any) => void,
    signal: AbortSignal
): Promise<void> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const sysInstruction = buildSystemInstruction(mode, systemPrompt);

    // Build history, preserving tool call rounds
    const geminiContents = buildGeminiHistory(messages);

    // Get tools for this mode
    const toolNames: string[] = mode === 'control'
        ? TOOL_CATEGORIES.control
        : mode === 'builder'
            ? TOOL_CATEGORIES.builder
            : [];

    const functionDeclarations = toolNames.length > 0 ? formatGeminiTools(toolNames) : [];

    const toolPrefix = mode === 'control' ? '[Control]' : '[Builder]';

    // Multi-turn agentic loop (max 6 rounds)
    for (let round = 0; round < 6; round++) {
        if (signal.aborted) break;

        const body: any = {
            systemInstruction: { parts: [{ text: sysInstruction }] },
            contents: geminiContents,
            generationConfig: {
                temperature: modelSettings.temperature,
                topP: modelSettings.top_p,
                maxOutputTokens: 16384,
            }
        };

        if (functionDeclarations.length > 0) {
            body.tools = [{ functionDeclarations }];
            body.tool_config = { function_calling_config: { mode: 'AUTO' } };
        }

        const streamUrl = `${baseUrl}/models/${config.modelId}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

        const response = await fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }

        // Parse SSE stream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        const functionCallParts: any[] = [];
        let finishReason = '';

        outer: while (true) {
            if (signal.aborted) break outer;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break outer;
                try {
                    const chunk = JSON.parse(data);
                    const candidate = chunk?.candidates?.[0];
                    if (candidate?.finishReason) finishReason = candidate.finishReason;

                    const parts: any[] = candidate?.content?.parts || [];
                    for (const part of parts) {
                        if (typeof part.text === 'string' && part.text) {
                            accumulatedText += part.text;
                            onUpdate({ content: accumulatedText });
                        }
                        if (part.functionCall) {
                            functionCallParts.push(part);
                        }
                    }
                } catch { /* skip malformed SSE line */ }
            }
        }

        // If no function calls, we're done
        if (functionCallParts.length === 0) break;

        // Add model turn (with function calls) to in-flight history
        geminiContents.push({
            role: 'model',
            parts: functionCallParts.map(p => ({ functionCall: p.functionCall }))
        });

        // Execute each function call and collect results
        const functionResponseParts: any[] = [];

        for (const part of functionCallParts) {
            if (signal.aborted) break;
            const { name, args } = part.functionCall;
            console.log(`[CloudLLM] Gemini tool call: ${name}`, args);

            let resultText = '';
            try {
                if (systemToolsImplementation[name]) {
                    const rawResult = await systemToolsImplementation[name](args);
                    resultText = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                } else {
                    resultText = `Error: Tool '${name}' not found`;
                }
            } catch (e: any) {
                resultText = `Error executing ${name}: ${e.message}`;
            }

            onNewMessage({
                role: 'tool',
                content: `${toolPrefix} ${resultText}`,
                mode
            });

            functionResponseParts.push({
                functionResponse: {
                    name,
                    response: { result: resultText }
                }
            });
        }

        // Add function responses to in-flight history for next round
        geminiContents.push({ role: 'user', parts: functionResponseParts });

        // Reset accumulated text for next round
        accumulatedText = '';

        if (finishReason === 'STOP') break;
    }
}

// ─── OpenAI-Compatible API — Multi-turn Agentic Call ──────────────────────────

async function callOpenAI(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string,
    modelSettings: { temperature: number; top_p: number },
    onUpdate: (update: Partial<any>) => void,
    onNewMessage: (msg: any) => void,
    t: (key: string, options?: any) => string,
    signal: AbortSignal
): Promise<void> {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
    const sysContent = buildSystemInstruction(mode, systemPrompt);

    const toolNames: string[] = mode === 'control'
        ? TOOL_CATEGORIES.control
        : mode === 'builder'
            ? TOOL_CATEGORIES.builder
            : [];
    const filteredTools = systemToolsDefinitions.filter(t => toolNames.includes(t.function.name));

    // Build message history preserving tool rounds
    const apiMessages = buildOpenAIHistory(messages, sysContent);

    const toolPrefix = mode === 'control' ? '[Control]' : '[Builder]';

    // Multi-turn agentic loop (max 6 rounds)
    for (let round = 0; round < 6; round++) {
        if (signal.aborted) break;

        const requestBody: any = {
            model: config.modelId,
            messages: apiMessages,
            stream: true,
            temperature: modelSettings.temperature,
            top_p: modelSettings.top_p,
            max_tokens: 16384
        };

        if (filteredTools.length > 0) {
            requestBody.tools = filteredTools;
            requestBody.tool_choice = 'auto';
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) {
            const errText = await response.text();
            let friendlyMsg = errText;
            try {
                const errJson = JSON.parse(errText);
                const msg = errJson?.message || errJson?.error?.message || errText;
                if (response.status === 403 || msg.toLowerCase().includes('balance') || msg.toLowerCase().includes('insufficient')) {
                    friendlyMsg = `${t('ai.cloud.error_balance')} (${msg})`;
                } else if (response.status === 401 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('api key')) {
                    friendlyMsg = `${t('ai.cloud.error_invalid_key')} (${msg})`;
                } else {
                    friendlyMsg = msg;
                }
            } catch { /* use raw text */ }
            throw new Error(`(${response.status}) ${friendlyMsg}`);
        }

        // Stream parse
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let thinkingContent = '';
        const toolCalls: any[] = [];

        while (true) {
            if (signal.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;
                try {
                    const chunkJson = JSON.parse(data);
                    const delta = chunkJson?.choices?.[0]?.delta;
                    if (!delta) continue;

                    // Handle reasoning content (DeepSeek R1 etc.)
                    const reasoning = delta.reasoning_content ?? delta.reasoning ?? '';
                    const content = delta.content ?? '';

                    if (reasoning) thinkingContent += reasoning;
                    if (content) fullContent += content;

                    // Stream text to UI
                    if (thinkingContent) {
                        const thinkTag = fullContent
                            ? `<think>${thinkingContent}</think>`
                            : `<think>${thinkingContent}`;
                        onUpdate({ content: thinkTag + fullContent });
                    } else if (fullContent) {
                        onUpdate({ content: fullContent });
                    }

                    // Accumulate tool calls (streamed incrementally by index)
                    if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (tc.index !== undefined) {
                                if (!toolCalls[tc.index]) {
                                    toolCalls[tc.index] = {
                                        id: tc.id || '',
                                        function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' },
                                        type: 'function'
                                    };
                                } else {
                                    if (tc.id) toolCalls[tc.index].id = tc.id;
                                    if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                                    if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                                }
                            }
                        }
                        onUpdate({ tool_calls: toolCalls });
                    }
                } catch { /* ignore malformed chunks */ }
            }
        }

        // If no tool calls, we're done
        if (toolCalls.length === 0) break;

        // Add assistant turn with tool calls to in-flight history
        apiMessages.push({
            role: 'assistant',
            content: fullContent || null,
            tool_calls: toolCalls
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
            if (signal.aborted) break;
            const name = toolCall.function.name;
            let args: any = {};
            try { args = JSON.parse(toolCall.function.arguments); } catch { /* use empty */ }

            console.log(`[CloudLLM] OpenAI tool call: ${name}`, args);

            let resultText = '';
            try {
                if (systemToolsImplementation[name]) {
                    const rawResult = await systemToolsImplementation[name](args);
                    resultText = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                } else {
                    resultText = `Error: Tool '${name}' not found`;
                }
            } catch (e: any) {
                resultText = `Error executing ${name}: ${e.message}`;
            }

            onNewMessage({
                role: 'tool',
                content: `${toolPrefix} ${resultText}`,
                mode
            });

            apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: resultText
            });
        }
    }
}

// ─── Test API connection ───────────────────────────────────────────────────────

export async function testCloudConnection(config: CloudConfig, t: (key: string, options?: any) => string): Promise<{ ok: boolean; message: string }> {
    try {
        if (config.provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent?key=${config.apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }], generationConfig: { maxOutputTokens: 5 } })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
                throw new Error(err?.error?.message || res.statusText);
            }
            return { ok: true, message: t('ai.cloud.success_gemini') };
        } else {
            const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
            const finalUrl = baseUrl.endsWith('/chat/completions')
                ? baseUrl
                : `${baseUrl}/chat/completions`;

            const res = await fetch(finalUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({ model: config.modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = res.statusText;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg = errJson?.error?.message || errJson?.message || errText;
                } catch {
                    errMsg = errText || res.statusText;
                }
                throw new Error(`(${res.status}) ${errMsg}`);
            }
            return { ok: true, message: t('ai.cloud.success_api') };
        }
    } catch (e: any) {
        let msg = e.message || t('ai.cloud.error_unknown');
        if (msg === 'Failed to fetch') {
            msg = t('ai.cloud.error_network');
        }
        return { ok: false, message: `${t('ai.cloud.error_connection')}${msg}` };
    }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useCloudLLM() {
    const [state, setState] = useState<CloudLLMState>({ isLoading: false, error: null });
    const { t } = useTranslation();
    const abortControllerRef = useRef<AbortController | null>(null);

    const cancelGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState(prev => ({ ...prev, isLoading: false }));
    }, []);

    const generateResponse = useCallback(async (
        messages: Message[],
        onUpdate: (updates: string | Partial<any>) => void,
        onNewMessage: (msg: any) => void,
        onFinish: () => void,
        onError: (err: any) => void,
        systemPrompt?: string,
        mode: 'chat' | 'control' | 'builder' = 'chat',
        cloudConfig?: CloudConfig,
        modelSettings?: { temperature: number; top_p: number }
    ) => {
        if (!cloudConfig?.apiKey) {
            onError(new Error(t('ai.cloud.error_api_key_missing')));
            return;
        }

        // Cancel any ongoing generation first
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState({ isLoading: true, error: null });

        const effectiveSettings = modelSettings ?? { temperature: 0.7, top_p: 0.9 };

        const handleUpdate = (update: Partial<any>) => {
            onUpdate(update);
        };

        try {
            if (cloudConfig.provider === 'gemini') {
                await callGemini(
                    messages, cloudConfig, systemPrompt || '', mode,
                    effectiveSettings, handleUpdate, onNewMessage, controller.signal
                );
            } else {
                await callOpenAI(
                    messages, cloudConfig, systemPrompt || '', mode,
                    effectiveSettings, handleUpdate, onNewMessage, t, controller.signal
                );
            }

            if (!controller.signal.aborted) {
                onFinish();
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[CloudLLM] Generation aborted');
                return;
            }
            console.error('[CloudLLM] Error:', err);
            setState(prev => ({ ...prev, error: err.message }));
            onError(err);
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [t]);

    return {
        ...state,
        isModelLoaded: true,    // Cloud is always "ready"
        progress: '',
        progressValue: 0,
        currentModelId: null,
        downloadStats: null,
        gpuInfo: null,
        generateResponse,
        cancelGeneration,
        // Stubs for interface compatibility
        initEngine: async () => { },
        cancelLoading: cancelGeneration,  // alias for compatibility
        unloadModel: async () => { },
        deleteModel: async () => false,
    };
}
