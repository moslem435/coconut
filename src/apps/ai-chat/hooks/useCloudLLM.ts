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
    if (!props) return result;
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

function buildGeminiHistory(messages: Message[]): any[] {
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
        if (m.role === 'system') continue;
        if (m.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
        } else if (m.role === 'assistant') {
            if (!m.tool_calls?.length && !m.content) continue;
            if (m.tool_calls?.length) {
                const parts: any[] = [];
                if (m.content) parts.push({ text: m.content });
                for (const tc of m.tool_calls) {
                    parts.push({
                        functionCall: {
                            name: tc.function?.name || '',
                            args: (() => {
                                try { return typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {}); } catch { return {}; }
                            })()
                        }
                    });
                }
                contents.push({ role: 'model', parts });
            } else {
                contents.push({ role: 'model', parts: [{ text: m.content || '' }] });
            }
        } else if (m.role === 'tool') {
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

// ─── Build OpenAI History ───────────────────────

function buildOpenAIHistory(messages: Message[], systemContent: string): any[] {
    const apiMessages: any[] = [{ role: 'system', content: systemContent }];
    let fallbackToolCallIds: string[] = [];

    for (const m of messages) {
        if (m.role === 'system') continue;
        if (m.role === 'user') {
            apiMessages.push({ role: 'user', content: m.content || '' });
        } else if (m.role === 'assistant') {
            const msg: any = { role: 'assistant', content: m.content || "" };
            if (m.tool_calls?.length) {
                fallbackToolCallIds = [];
                msg.tool_calls = m.tool_calls.map((tc: any, idx: number) => {
                    const resolvedId = tc.id || `call_${Date.now()}_${idx}`;
                    fallbackToolCallIds.push(resolvedId);
                    return {
                        id: resolvedId,
                        type: tc.type || 'function',
                        function: {
                            name: tc.function.name,
                            arguments: typeof tc.function.arguments === 'string'
                                ? tc.function.arguments
                                : JSON.stringify(tc.function.arguments)
                        }
                    };
                });
            }
            apiMessages.push(msg);
        } else if (m.role === 'tool') {
            let cleanContent = String(m.content || '');
            if (cleanContent.startsWith('[Control] ')) cleanContent = cleanContent.replace('[Control] ', '');
            if (cleanContent.startsWith('[Builder] ')) cleanContent = cleanContent.replace('[Builder] ', '');
            const defaultFallbackId = fallbackToolCallIds.shift() || `call_orphan_${Date.now()}`;
            apiMessages.push({
                role: 'tool',
                tool_call_id: m.tool_call_id || defaultFallbackId,
                content: cleanContent || "Success"
            });
        }
    }
    return apiMessages;
}

// ─── Build System Instruction ────────────────────────────────────────

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
6. STATUS: use get_system_status to read current settings before modifying if needed.`,
        builder: `You are an expert full-stack developer and system architect. Respond in the same language as the user (Chinese users → reply in Chinese).

CORE PRINCIPLES:
1. **App-as-a-Folder**: Every app must be a self-contained folder in the file system.
2. **Data-as-Files**: NEVER use localStorage/IndexedDB. Persist all data to files (e.g., SQLite, JSON) within the app folder.
3. **Decoupling**: The app should not depend on system-wide configuration changes.

CAPABILITIES:
- You have a full Node.js environment (WebContainer).
- You can run shell commands like 'npm install', 'npm run dev', 'node server.js'.
- You can create multi-file projects (React, Vue, Express, etc.).

WHEN CREATING AN APP:
1. Plan the folder structure. All apps go into "${SYSTEM_PATHS.USER}/apps/[app-name]".
2. Use 'create_directory' to create the root folder.
3. Initialize the project. 
   - FOR FRONTEND: YOU MUST USE 'run_command' with 'npm create vite@latest . -- --template react' (or vue/svelte). DO NOT manually create package.json/vite.config.js/index.html unless you have a specific reason.
   - FOR BACKEND: YOU MUST USE 'run_command' with 'npm init -y'.
   - IMPORTANT: Update 'package.json' to include 'cocount' field (icon, window: {width, height, title}).
4. Install dependencies using 'run_command' (e.g., 'npm install').
5. FOR TAILWIND CSS: Follow this EXACT sequence:
   a) First run: 'npm install -D tailwindcss@3.4.17 postcss autoprefixer' (MUST use v3, v4 breaks config)
   b) DO NOT run 'npx tailwindcss init'. Instead, DIRECTLY create 'tailwind.config.js' and 'postcss.config.js' with the correct content using 'create_file'.
   c) Add Tailwind directives to your CSS file (e.g., src/index.css).
6. Write/Update code using 'create_file' or 'update_file'.
7. **CRITICAL: SECURITY HEADERS**: To avoid "Website Blocked" errors in the browser, YOU MUST configure the dev server (e.g., in \`vite.config.ts\`) to include these headers:
   \`\`\`javascript
   server: {
     headers: {
       'Cross-Origin-Embedder-Policy': 'require-corp',
       'Cross-Origin-Opener-Policy': 'same-origin',
     },
   }
   \`\`\`
8. For full-stack apps, ensure both frontend and backend can run.

CRITICAL EXECUTION RULES:
- NEVER use interactive commands.
- Maximum 50 tool calls per task - plan efficiently.

DEBUGGING:
- If a command fails, read the output, fix the code/config, and try again.
- Use 'get_file_tree' to understand the current structure.`
    };

    if (mode === 'chat') {
        return systemPrompt || 'You are a helpful assistant in a web-based OS.';
    }
    const base = hardcoded[mode] || 'You are a helpful assistant.';
    return systemPrompt ? `${base}\n\n[User custom instructions]: ${systemPrompt}` : base;
}

// ─── Gemini API Call ──────────────────────────────────────

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
    const geminiContents = buildGeminiHistory(messages);

    const toolNames: string[] = mode === 'control' ? TOOL_CATEGORIES.control : mode === 'builder' ? TOOL_CATEGORIES.builder : [];
    const functionDeclarations = toolNames.length > 0 ? formatGeminiTools(toolNames) : [];
    const toolPrefix = mode === 'control' ? '[Control]' : '[Builder]';

    const maxRounds = mode === 'builder' ? 50 : 6;

    for (let round = 0; round < maxRounds; round++) {
        if (signal.aborted) break;
        if (round > 0) onNewMessage({ role: 'assistant', content: '', mode });

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

        if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);

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
                        if (part.text) { accumulatedText += part.text; }
                        if (part.functionCall) { functionCallParts.push(part); }
                        onUpdate({
                            content: accumulatedText,
                            tool_calls: functionCallParts.length > 0 ? functionCallParts.map((p, i) => ({
                                id: `call_${p.functionCall.name}_${round}_${i}`,
                                function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
                                type: 'function'
                            })) : undefined
                        });
                    }
                } catch { }
            }
        }

        if (functionCallParts.length === 0) break;

        geminiContents.push({ role: 'model', parts: functionCallParts.map(p => ({ functionCall: p.functionCall })) });
        const functionResponseParts: any[] = [];

        for (let i = 0; i < functionCallParts.length; i++) {
            const part = functionCallParts[i];
            const { name, args } = part.functionCall;
            const toolCallId = `call_${name}_${round}_${i}`;
            let resultText = '';
            try {
                if (systemToolsImplementation[name]) {
                    const rawResult = await systemToolsImplementation[name](args);
                    resultText = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                } else { resultText = `Error: Tool '${name}' not found`; }
            } catch (e: any) { resultText = `Error execution ${name}: ${e.message}`; }

            onNewMessage({ role: 'tool', content: `${toolPrefix} ${resultText}`, mode, tool_call_id: toolCallId });
            functionResponseParts.push({ functionResponse: { name, response: { result: resultText } } });
        }
        geminiContents.push({ role: 'user', parts: functionResponseParts });
        accumulatedText = '';
        if (finishReason === 'STOP') break;
    }
}

// ─── OpenAI API Call ──────────────────────────

async function callOpenAI(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string,
    modelSettings: { temperature: number; top_p: number },
    onUpdate: (update: Partial<any>) => void,
    onNewMessage: (msg: any) => void,
    t: (key: string) => string,
    signal: AbortSignal
): Promise<void> {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
    const sysContent = buildSystemInstruction(mode, systemPrompt);
    const toolNames: string[] = mode === 'control' ? TOOL_CATEGORIES.control : mode === 'builder' ? TOOL_CATEGORIES.builder : [];
    const filteredTools = systemToolsDefinitions.filter(t => toolNames.includes(t.function.name));
    const apiMessages = buildOpenAIHistory(messages, sysContent);
    const toolPrefix = mode === 'control' ? '[Control]' : '[Builder]';
    const maxRounds = mode === 'builder' ? 50 : 6;

    for (let round = 0; round < maxRounds; round++) {
        if (signal.aborted) break;
        if (round > 0) onNewMessage({ role: 'assistant', content: '', mode, isPlaceholder: true });

        const requestBody: any = { model: config.modelId, messages: apiMessages, stream: true, temperature: modelSettings.temperature, top_p: modelSettings.top_p };
        if (filteredTools.length > 0) { requestBody.tools = filteredTools; requestBody.tool_choice = 'auto'; }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
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
                    const delta = JSON.parse(data)?.choices?.[0]?.delta;
                    if (delta?.content) { fullContent += delta.content; }
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (!toolCalls[tc.index]) { toolCalls[tc.index] = { id: tc.id, function: { name: tc.function.name || '', arguments: '' }, type: 'function' }; }
                            if (tc.function.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                        }
                    }
                    onUpdate({ content: fullContent, tool_calls: toolCalls.length > 0 ? [...toolCalls] : undefined });
                } catch { }
            }
        }

        if (toolCalls.length === 0) break;
        apiMessages.push({ role: 'assistant', content: fullContent, tool_calls: toolCalls });

        for (const tc of toolCalls) {
            if (signal.aborted) break;
            if (!tc || !tc.function || !tc.function.name) continue;

            let resultText = '';
            try {
                const args = JSON.parse(tc.function.arguments || '{}');
                const fnName = tc.function.name;
                if (systemToolsImplementation[fnName]) {
                    const res = await systemToolsImplementation[fnName](args);
                    resultText = typeof res === 'string' ? res : JSON.stringify(res);
                } else { resultText = `Error: Tool '${fnName}' not found`; }
            } catch (e: any) { resultText = `Error: ${e.message}`; }

            onNewMessage({ role: 'tool', content: resultText, mode, tool_call_id: tc.id });
            apiMessages.push({ role: 'tool', tool_call_id: tc.id, content: resultText });
        }
    }
}

// ─── Test Connection ──────────────────────────

export async function testCloudConnection(config: CloudConfig, t: (key: string) => string): Promise<{ ok: boolean; message: string }> {
    try {
        const body = config.provider === 'gemini'
            ? { contents: [{ parts: [{ text: 'Hi' }] }], generationConfig: { maxOutputTokens: 5 } }
            : { model: config.modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 };
        const url = config.provider === 'gemini'
            ? `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent?key=${config.apiKey}`
            : `${config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'}/chat/completions`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(config.provider !== 'gemini' && { 'Authorization': `Bearer ${config.apiKey}` }) },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return { ok: true, message: 'Success' };
    } catch (e: any) { return { ok: false, message: e.message }; }
}

// ─── Main Hook ───

export function useCloudLLM() {
    const { t } = useTranslation();
    const [state, setState] = useState<CloudLLMState>({ isLoading: false, error: null });
    const abortControllerRef = useRef<AbortController | null>(null);

    const cancelLoading = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const generateResponse = useCallback(async (
        messages: Message[],
        onUpdate: (update: Partial<any>) => void,
        onNewMessage: (msg: any) => void,
        onFinish: () => void,
        onError: (err: any) => void,
        systemPrompt: string,
        mode: string,
        config?: CloudConfig,
        modelSettings?: any
    ) => {
        if (!config) return;
        setState({ isLoading: true, error: null });
        abortControllerRef.current = new AbortController();

        try {
            if (config.provider === 'gemini') {
                await callGemini(messages, config, systemPrompt, mode, modelSettings, onUpdate, onNewMessage, abortControllerRef.current.signal);
            } else {
                await callOpenAI(messages, config, systemPrompt, mode, modelSettings, onUpdate, onNewMessage, t, abortControllerRef.current.signal);
            }
            onFinish();
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setState({ isLoading: false, error: err.message });
            onError(err);
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
            abortControllerRef.current = null;
        }
    }, [t]);

    return {
        ...state,
        isModelLoaded: true, // Cloud models are always "ready"
        generateResponse,
        cancelLoading,
        testCloudConnection
    };
}
