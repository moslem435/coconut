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
4. **Code Quality**: Generated code must be COMPLETE and RUNNABLE. No placeholders like "// TODO" or "// Add your code here". Include proper error handling and user-friendly UI.

WORKFLOW (follow this order strictly):
1. **PLAN**: Briefly tell the user your plan (app type, framework choice, estimated steps). Keep it to 2-3 sentences.
2. **SCAFFOLD**: Call the appropriate scaffold tool.
3. **CUSTOMIZE**: Write the app logic file by file.
4. **COMPLETE**: Summarize what was created and tell the user "App created! Double-click [App Name] in File Explorer to run.".

WHEN CREATING AN APP:
1. **ANALYZE**: Determine if the user needs a simple/static tool (calculator, clock, game) or a complex app (React, state, libraries).
2. **DECIDE & EXECUTE**:
   - **SIMPLE/STATIC**: Call 'scaffold_static_app({ name, title, icon })'.
     - This creates a lightweight HTML/JS app that launches instantly.
     - NO build steps, NO npm install needed.
     - After scaffolding, use 'create_file' or 'update_file' to write 'index.html' with complete app logic (HTML + CSS + JS all in one file).
     - For small targeted edits, prefer 'replace_in_file' to avoid rewriting the whole file and save tokens.
   - **COMPLEX/REACT**: Call 'scaffold_react_app({ name, title, icon })'.
     - This creates a full React+Vite+Tailwind app.
     - After install, customize 'src/App.jsx' with the app logic.
3. **ONE FILE PER TOOL CALL**: Write one file at a time. Do NOT try to create all files in a single tool call to avoid truncation errors. Always explain what you are about to do BEFORE calling the tool.
4. **NO AUTO-RUN DURING BUILD**: Do NOT run 'npm install' or 'npm run dev' during the build workflow. Running/installation should happen only after explicit user intent (e.g., user double-clicks the app to launch or asks "帮我启动/运行").

AVAILABLE TOOLS:
- scaffold_static_app({ name, title, icon }): Create a simple HTML/JS app
- scaffold_react_app({ name, title, icon }): Create a React+Vite+Tailwind app
- create_file({ path, content }): Create a new file
- update_file({ path, content }): Overwrite an existing file
- replace_in_file({ path, find, replace, expectedCount?, regex?, flags?, replaceAll? }): Replace text inside a file (preferred for small edits)
- run_command({ cmd, args, cwd, detached, successPattern }): Run a shell command
- get_file_tree({ path }): List directory structure
- read_file({ path }): Read file contents

DEBUGGING:
- If 'npm install' fails: Check package.json for typos, remove node_modules and retry.
- If 'npx' command fails with "could not determine executable": Use '-y' flag, e.g. run_command({ cmd: "npx", args: ["-y", "<package>@latest", ...] }).
- If build fails: Read the FULL error output, identify the file and line, fix with 'update_file'.
- If port conflict: The WebContainer handles ports automatically, do NOT try to change ports.
- Always use 'get_file_tree' before making assumptions about file structure.`
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
): Promise<{ tps?: number }> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const sysInstruction = buildSystemInstruction(mode, systemPrompt);
    const geminiContents = buildGeminiHistory(messages);

    const toolNames: string[] = mode === 'control' ? TOOL_CATEGORIES.control : mode === 'builder' ? TOOL_CATEGORIES.builder : [];
    const functionDeclarations = toolNames.length > 0 ? formatGeminiTools(toolNames) : [];
    const toolPrefix = mode === 'control' ? '[Control]' : '[Builder]';

    const maxRounds = mode === 'builder' ? 50 : 6;
    let activeAppName: string | null = null;
    let activeAppPath: string | null = null;

    for (let round = 0; round < maxRounds; round++) {
        if (signal.aborted) break;
        if (round > 0) onNewMessage({ role: 'assistant', content: '', mode, isPlaceholder: true });

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
        
        // TPS Calculation
        const startTime = Date.now();
        let tokenCount = 0;
        let lastTps = 0;

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
                        if (part.text) { 
                            accumulatedText += part.text;
                            // Estimate token count (rough approximation for streaming)
                            tokenCount += part.text.length / 4; 
                        }
                        if (part.functionCall) { functionCallParts.push(part); }
                        
                        const currentTps = tokenCount / Math.max(0.1, (Date.now() - startTime) / 1000);
                        lastTps = currentTps;
                        
                        onUpdate({
                            content: accumulatedText,
                            ...(functionCallParts.length > 0
                                ? {
                                      tool_calls: functionCallParts.map((p, i) => ({
                                          id: `call_${p.functionCall.name}_${round}_${i}`,
                                          function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
                                          type: 'function'
                                      }))
                                  }
                                : {}),
                            tps: currentTps
                        });
                    }
                } catch { }
            }
        }

        try {
            const fnNames = functionCallParts.map(p => p?.functionCall?.name).filter(Boolean)
            console.debug('[Gemini][Builder] round=%d finishReason=%s toolCalls=%o', round, finishReason, fnNames)
        } catch {}

        if (functionCallParts.length === 0) break;

        geminiContents.push({ role: 'model', parts: functionCallParts });
        const functionResponseParts: any[] = [];

        for (let i = 0; i < functionCallParts.length; i++) {
            const part = functionCallParts[i];
            const { name, args } = part.functionCall;
            const toolCallId = `call_${name}_${round}_${i}`;
            let resultText = '';
            try {
                if (systemToolsImplementation[name]) {
                    const normalizedArgs = (() => {
                        if (!args || typeof args !== 'object') return args;
                        if (name === 'scaffold_static_app' || name === 'scaffold_react_app') {
                            const nextName = typeof (args as any).name === 'string' ? (args as any).name : null;
                            if (nextName) {
                                activeAppName = nextName;
                                activeAppPath = `${SYSTEM_PATHS.USER}/apps/${nextName}`;
                            }
                            return args;
                        }
                        const p = (args as any).path;
                        if (!activeAppName || !activeAppPath || typeof p !== 'string') return args;
                        if (p === `/${activeAppName}`) {
                            return { ...(args as any), path: activeAppPath };
                        }
                        if (p.startsWith(`/${activeAppName}/`)) {
                            return { ...(args as any), path: `${activeAppPath}${p.slice(activeAppName.length + 1)}` };
                        }
                        if (!p.startsWith('/')) {
                            const rel = p.replace(/^\.?\//, '');
                            return { ...(args as any), path: `${activeAppPath}/${rel}` };
                        }
                        return args;
                    })();

                    const rawResult = await systemToolsImplementation[name](normalizedArgs, { mode });
                    resultText = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                } else { resultText = `Error: Tool '${name}' not found`; }
            } catch (e: any) { resultText = `Error execution ${name}: ${e.message}`; }

            onNewMessage({ role: 'tool', content: `${toolPrefix} ${resultText}`, mode, tool_call_id: toolCallId });
            functionResponseParts.push({ functionResponse: { name, response: { result: resultText } } });
        }
        geminiContents.push({ role: 'user', parts: functionResponseParts });
        accumulatedText = '';
    }
    return {};
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
): Promise<{ tps?: number }> {
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
        let rawContent = '';
        let fullContent = '';
        const toolCalls: any[] = [];
        
        // TPS Calculation
        const startTime = Date.now();
        let tokenCount = 0;
        let lastTps = 0;

        const stripDsml = (input: string) => input
            .replace(/<\|DSML\|\s*function_calls\s*>[\s\S]*?<\/\|DSML\|\s*function_calls\s*>/g, '')
            .replace(/<\|DSML\|[^>]*>/g, '')
            .replace(/<\/\|DSML\|[^>]*>/g, '')
            .trim();

        const parseDsmlToolCalls = (input: string) => {
            const calls: any[] = [];
            const invokeRe = /<\|DSML\|\s*invoke\s+name="([^"]+)"\s*>\s*([\s\S]*?)<\/\|DSML\|\s*invoke\s*>/g;
            let m: RegExpExecArray | null;
            while ((m = invokeRe.exec(input)) !== null) {
                const fnName = m[1] || '';
                const block = m[2] || '';
                if (!fnName) continue;
                const args: Record<string, any> = {};
                const paramRe = /<\|DSML\|\s*parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/\|DSML\|\s*parameter\s*>/g;
                let pm: RegExpExecArray | null;
                while ((pm = paramRe.exec(block)) !== null) {
                    const key = pm[1];
                    const value = pm[2] ?? '';
                    if (key) args[key] = value;
                }
                calls.push({
                    id: `call_${fnName}_${round}_${calls.length}`,
                    function: { name: fnName, arguments: JSON.stringify(args) },
                    type: 'function'
                });
            }
            return calls;
        };

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
                    if (delta?.content) { 
                        rawContent += delta.content;
                        fullContent = stripDsml(rawContent);
                        // Estimate token count (rough approximation for streaming)
                        tokenCount += delta.content.length / 4;
                    }
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (!toolCalls[tc.index]) { toolCalls[tc.index] = { id: tc.id, function: { name: tc.function.name || '', arguments: '' }, type: 'function' }; }
                            if (tc.function.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                        }
                    }
                    
                    const currentTps = tokenCount / Math.max(0.1, (Date.now() - startTime) / 1000);
                    lastTps = currentTps;
                    
                    onUpdate({
                        content: fullContent,
                        ...(toolCalls.length > 0 ? { tool_calls: [...toolCalls] } : {}),
                        tps: currentTps
                    });
                } catch { }
            }
        }

        if (toolCalls.length === 0) {
            const dsmlCalls = mode === 'builder' && rawContent.includes('<|DSML|')
                ? parseDsmlToolCalls(rawContent)
                : [];
            if (dsmlCalls.length === 0) return { tps: lastTps };
            toolCalls.push(...dsmlCalls);
            fullContent = stripDsml(rawContent);
        }
        apiMessages.push({ role: 'assistant', content: fullContent, tool_calls: toolCalls });

        for (const tc of toolCalls) {
            if (signal.aborted) break;
            if (!tc || !tc.function || !tc.function.name) continue;

            let resultText = '';
            try {
                const args = JSON.parse(tc.function.arguments || '{}');
                const fnName = tc.function.name;
                if (systemToolsImplementation[fnName]) {
                    const res = await systemToolsImplementation[fnName](args, { mode });
                    resultText = typeof res === 'string' ? res : JSON.stringify(res);
                } else { resultText = `Error: Tool '${fnName}' not found`; }
            } catch (e: any) { resultText = `Error: ${e.message}`; }

            onNewMessage({ role: 'tool', content: resultText, mode, tool_call_id: tc.id });
            apiMessages.push({ role: 'tool', tool_call_id: tc.id, content: resultText });
        }
    }
    return {};
}

// ─── Test Connection ──────────────────────────

export async function testCloudConnection(config: CloudConfig): Promise<{ ok: boolean; message: string }> {
    try {
        const body = config.provider === 'gemini'
            ? { contents: [{ parts: [{ text: 'Hi' }] }], generationConfig: { maxOutputTokens: 5 } }
            : { model: config.modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 };
        
        const url = config.provider === 'gemini'
            ? `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent?key=${config.apiKey}`
            : `${config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'}/chat/completions`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                ...(config.provider !== 'gemini' && { 'Authorization': `Bearer ${config.apiKey}` }) 
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API Error: ${res.status} ${errorText}`);
        }
        
        return { ok: true, message: 'Success' };
    } catch (e: any) { 
        return { ok: false, message: e.message || 'Unknown error' }; 
    }
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
        }
        setState(prev => ({ ...prev, isLoading: false }));
    }, []);

    const generateResponse = useCallback(async (
        messages: Message[],
        onUpdate: (update: Partial<any>) => void,
        onNewMessage: (msg: any) => void,
        onFinish: (stats?: { tps?: number }) => void,
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
            let stats = {};
            if (config.provider === 'gemini') {
                stats = await callGemini(messages, config, systemPrompt, mode, modelSettings, onUpdate, onNewMessage, abortControllerRef.current.signal);
            } else {
                stats = await callOpenAI(messages, config, systemPrompt, mode, modelSettings, onUpdate, onNewMessage, t, abortControllerRef.current.signal);
            }
            onFinish(stats);
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
