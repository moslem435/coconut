import { useState, useCallback } from 'react';
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
// Gemini requires type values in UPPERCASE (OBJECT, STRING, NUMBER, ARRAY, BOOLEAN)
// and uses 'functionDeclarations' instead of OpenAI's 'tools' array format.

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

// ─── Gemini API — Multi-turn Agentic Call ──────────────────────────────────────

async function callGemini(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string,
    onUpdate: (update: Partial<any>) => void,
    onNewMessage: (msg: any) => void
): Promise<void> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/${config.modelId}:generateContent?key=${config.apiKey}`;

    // Mode-aware system instruction
    const modeInstructions: Record<string, string> = {
        chat: systemPrompt || 'You are a helpful assistant in a web-based OS.',
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

    const sysInstruction = modeInstructions[mode] || modeInstructions.chat;

    // Build initial contents from message history
    const geminiContents: any[] = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

    // Get tools for this mode
    const toolNames: string[] = mode === 'control'
        ? TOOL_CATEGORIES.control
        : mode === 'builder'
            ? TOOL_CATEGORIES.builder
            : [];

    const functionDeclarations = toolNames.length > 0 ? formatGeminiTools(toolNames) : [];

    // Multi-turn agentic loop (max 6 rounds)
    for (let round = 0; round < 6; round++) {
        const body: any = {
            systemInstruction: { parts: [{ text: sysInstruction }] },
            contents: geminiContents,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 16384,
            }
        };

        // Attach tools in builder/control modes
        if (functionDeclarations.length > 0) {
            body.tools = [{ functionDeclarations }];
            body.tool_config = { function_calling_config: { mode: 'AUTO' } };
        }

        // ── Strategy: use SSE streaming for text-only rounds (better UX),
        //   non-streaming for tool-call rounds (need complete JSON).
        //   We don't know in advance, so we first try streaming (SSE).
        //   If the response contains functionCalls we handle them the same way.
        const streamUrl = `${baseUrl}/models/${config.modelId}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

        const response = await fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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
                            // Stream text to UI incrementally
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
        if (functionCallParts.length === 0) {
            break;
        }

        // Add model turn (with function calls) to history
        geminiContents.push({
            role: 'model',
            parts: functionCallParts.map(p => ({ functionCall: p.functionCall }))
        });

        // Execute each function call and collect results
        const functionResponseParts: any[] = [];

        for (const part of functionCallParts) {
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

            // Report execution to UI
            onNewMessage({
                role: 'tool',
                content: `[Builder] ${resultText}`,
                mode
            });

            functionResponseParts.push({
                functionResponse: {
                    name,
                    response: { result: resultText }
                }
            });
        }

        // Add function responses to history for next round
        geminiContents.push({
            role: 'user',
            parts: functionResponseParts
        });

        // Reset accumulated text for next round
        accumulatedText = '';

        // If model indicated it's done after this, break
        if (finishReason === 'STOP') break;
    }
}

// ─── OpenAI-Compatible API — Multi-turn Agentic Call ──────────────────────────

async function callOpenAI(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string,
    onUpdate: (update: Partial<any>) => void,
    onNewMessage: (msg: any) => void,
    t: (key: string, options?: any) => string
): Promise<void> {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';

    const modeInstructions: Record<string, string> = {
        chat: systemPrompt || 'You are a helpful assistant in a web-based OS.',
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
4. After the file is created, confirm the app is ready.
When asked to modify or fix an existing app:
1. Use 'read_file' to read the current file content.
2. Apply the requested changes.
3. Use 'update_file' to overwrite the file with the updated content.`
    };

    const sysContent = modeInstructions[mode] || modeInstructions.chat;

    // Get tools for this mode
    const toolNames: string[] = mode === 'control'
        ? TOOL_CATEGORIES.control
        : mode === 'builder'
            ? TOOL_CATEGORIES.builder
            : [];
    const filteredTools = systemToolsDefinitions.filter(t => toolNames.includes(t.function.name));

    // Build message history
    const apiMessages: any[] = [
        { role: 'system', content: sysContent },
        ...messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content || '' }))
    ];

    // Multi-turn agentic loop (max 6 rounds)
    for (let round = 0; round < 6; round++) {
        const requestBody: any = {
            model: config.modelId,
            messages: apiMessages,
            stream: true,
            temperature: 0.7,
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
            body: JSON.stringify(requestBody)
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

        // Add assistant turn with tool calls to history
        apiMessages.push({
            role: 'assistant',
            content: fullContent || null,
            tool_calls: toolCalls
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
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

            // Report execution to UI
            onNewMessage({
                role: 'tool',
                content: `[Builder] ${resultText}`,
                mode
            });

            // Add tool result to message history
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

    const generateResponse = useCallback(async (
        messages: Message[],
        onUpdate: (updates: string | Partial<any>) => void,
        onNewMessage: (msg: any) => void,
        onFinish: () => void,
        onError: (err: any) => void,
        systemPrompt?: string,
        mode: 'chat' | 'control' | 'builder' = 'chat',
        cloudConfig?: CloudConfig
    ) => {
        if (!cloudConfig?.apiKey) {
            onError(new Error(t('ai.cloud.error_api_key_missing')));
            return;
        }

        setState({ isLoading: true, error: null });

        // Normalize onUpdate to always work with Partial<any>
        const handleUpdate = (update: Partial<any>) => {
            onUpdate(update);
        };

        try {
            if (cloudConfig.provider === 'gemini') {
                await callGemini(messages, cloudConfig, systemPrompt || '', mode, handleUpdate, onNewMessage);
            } else {
                await callOpenAI(messages, cloudConfig, systemPrompt || '', mode, handleUpdate, onNewMessage, t);
            }
            onFinish();
        } catch (err: any) {
            console.error('[CloudLLM] Error:', err);
            setState(prev => ({ ...prev, error: err.message }));
            onError(err);
        } finally {
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
        // Stubs for interface compatibility
        initEngine: async () => { },
        cancelLoading: () => { },
        unloadModel: async () => { },
        deleteModel: async () => false,
    };
}
