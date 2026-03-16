import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/os/sdk';
import { Message, CloudConfig } from '../types';
import { systemToolsDefinitions, systemToolsImplementation, TOOL_CATEGORIES } from '../utils/systemTools';
import { SYSTEM_PATHS } from '@/os/config/paths';
import { buildSystemInstruction } from '../config/systemPrompts';

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

function normalizePathForActiveApp(inputPath: string, activeAppName: string, activeAppPath: string): string {
    // 1. If it's already an absolute path and starts with activeAppPath, return as-is
    if (inputPath.startsWith(activeAppPath)) return inputPath;

    // 2. Handle Case: AI thinks root is /activeAppName
    if (inputPath === `/${activeAppName}`) return activeAppPath;
    if (inputPath.startsWith(`/${activeAppName}/`)) {
        return `${activeAppPath}${inputPath.slice(activeAppName.length + 1)}`;
    }

    // 3. Handle Case: AI thinks root is /home/user/activeAppName (missing /apps/ part)
    const mistakenRoot = `${SYSTEM_PATHS.USER}/${activeAppName}`;
    if (inputPath === mistakenRoot) return activeAppPath;
    if (inputPath.startsWith(`${mistakenRoot}/`)) {
        return `${activeAppPath}${inputPath.slice(mistakenRoot.length)}`;
    }

    // 4. Handle Case: Relative paths (e.g., "src/App.tsx" or "pixel-adventure/src/App.jsx")
    if (!inputPath.startsWith('/')) {
        let rel = inputPath.replace(/^\.?\//, '');
        
        // DEDUPLICATION: If the relative path starts with the current active app name (redundant),
        // we strip it to avoid nested paths like /apps/my-app/my-app/src/...
        if (rel.startsWith(`${activeAppName}/`)) {
            rel = rel.slice(activeAppName.length + 1);
        } else if (rel === activeAppName) {
            rel = '';
        }

        return rel ? `${activeAppPath}/${rel}` : activeAppPath;
    }

    return inputPath;
}

function parseToolArgs(fnName: string, rawArgs: string): any {
    const raw = (rawArgs || '').trim();
    if (!raw) return {};

    const candidates: string[] = [raw];
    candidates.push(raw.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));
    candidates.push(raw.replace(/("path"\s*:\s*"[^"]*")\s*("content"\s*:)/, '$1,$2'));
    candidates.push(raw.replace(/("path"\s*:\s*"[^"]*")\s*("find"\s*:)/, '$1,$2'));
    candidates.push(raw.replace(/("find"\s*:\s*"[^"]*")\s*("replace"\s*:)/, '$1,$2'));
    candidates.push(raw.replace(/^\{\s*path\s*:/, '{"path":').replace(/,\s*content\s*:/, ',"content":'));

    for (const c of candidates) {
        try { return JSON.parse(c); } catch { }
    }

    const pathMatch = raw.match(/["']path["']\s*:\s*["']([^"']+)["']/);
    const contentMatch = raw.match(/["']content["']\s*:\s*["']([\s\S]*)/);
    if (pathMatch && (fnName === 'update_file' || fnName === 'create_file')) {
        const path = pathMatch[1] || '';
        const content = contentMatch
            ? (contentMatch[1] || '')
                .replace(/["']\s*\}?\s*$/, '')
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\t/g, '\t')
            : '';
        return { path, content };
    }

    throw new Error('Invalid tool arguments JSON');
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
                    
                    // OpenAI requires arguments to be a JSON string, not an object
                    let argsString = '{}';
                    if (tc.function && tc.function.arguments) {
                        if (typeof tc.function.arguments === 'string') {
                            argsString = tc.function.arguments || '{}';
                        } else {
                            try {
                                argsString = JSON.stringify(tc.function.arguments);
                            } catch (e) {
                                console.error('Failed to stringify tool arguments:', e);
                            }
                        }
                    }

                    return {
                        id: resolvedId,
                        type: tc.type || 'function',
                        function: {
                            name: tc.function.name,
                            arguments: argsString
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

    // Ensure all tool_calls have matching tool messages to prevent OpenAI 400 error
    const toolCallIdsWithResponse = new Set<string>();
    for (const msg of apiMessages) {
        if (msg.role === 'tool' && msg.tool_call_id) {
            toolCallIdsWithResponse.add(msg.tool_call_id);
        }
    }

    for (const msg of apiMessages) {
        if (msg.role === 'assistant' && msg.tool_calls?.length) {
            msg.tool_calls = msg.tool_calls.filter((tc: any) => toolCallIdsWithResponse.has(tc.id));
            if (msg.tool_calls.length === 0) {
                delete msg.tool_calls;
                if (!msg.content) {
                    msg.content = "Action cancelled or interrupted.";
                }
            }
        }
    }

    return apiMessages;
}

// ─── Build System Instruction ────────────────────────────────────────
// Imported from ../config/systemPrompts.ts

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
                        if (!activeAppName || !activeAppPath) return args;
                        const next: any = { ...(args as any) };
                        if (typeof next.path === 'string') next.path = normalizePathForActiveApp(next.path, activeAppName, activeAppPath);
                        if (typeof next.cwd === 'string') next.cwd = normalizePathForActiveApp(next.cwd, activeAppName, activeAppPath);
                        return next;
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
    let activeAppName: string | null = null;
    let activeAppPath: string | null = null;

    for (let round = 0; round < maxRounds; round++) {
        if (signal.aborted) break;
        if (round > 0) onNewMessage({ role: 'assistant', content: '', mode, isPlaceholder: true });

        const requestBody: any = { model: config.modelId, messages: apiMessages, stream: true, temperature: modelSettings.temperature, top_p: modelSettings.top_p };
        // Increase max tokens for builder mode to avoid truncation in large file edits
        if (mode === 'builder') {
             requestBody.max_tokens = 4096; 
        }
        if (filteredTools.length > 0) { requestBody.tools = filteredTools; requestBody.tool_choice = 'auto'; }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify(requestBody),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            let friendlyMessage = `OpenAI API error ${response.status}: ${errorText}`;

            // Handle common OpenAI error codes
            if (response.status === 403 && (errorText.includes('insufficient_quota') || errorText.includes('FreeTierOnly'))) {
                friendlyMessage = 'API Quota Exceeded: Your API key has run out of funds or the free tier is exhausted. Please check your billing at platform.openai.com.';
            } else if (response.status === 401) {
                friendlyMessage = 'Authentication Error: Invalid API Key. Please check your settings.';
            } else if (response.status === 429) {
                friendlyMessage = 'Rate Limit Exceeded: You are sending requests too quickly. Please wait a moment.';
            }

            throw new Error(friendlyMessage);
        }

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

        let sawDone = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() ?? '';
            for (const evt of events) {
                const dataLines = evt
                    .split(/\r?\n/)
                    .filter(l => l.startsWith('data:'))
                    .map(l => l.replace(/^data:\s?/, ''));
                if (dataLines.length === 0) continue;
                const data = dataLines.join('\n').trim();
                if (data === '[DONE]') {
                    sawDone = true;
                    break;
                }
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
            if (sawDone) break;
        }

        if (toolCalls.length === 0) {
            const dsmlCalls = mode === 'builder' && rawContent.includes('<|DSML|')
                ? parseDsmlToolCalls(rawContent)
                : [];
            if (dsmlCalls.length === 0) return { tps: lastTps };
            toolCalls.push(...dsmlCalls);
            fullContent = stripDsml(rawContent);
        }
        
        // Ensure all tool calls have properly formatted JSON string arguments before pushing to history
        const formattedToolCalls = toolCalls.map(tc => {
            let argsString = '{}';
            if (tc.function && tc.function.arguments) {
                if (typeof tc.function.arguments === 'string') {
                    argsString = tc.function.arguments || '{}';
                } else {
                    try {
                        argsString = JSON.stringify(tc.function.arguments);
                    } catch (e) {
                        argsString = '{}';
                    }
                }
            }
            return {
                ...tc,
                function: {
                    ...tc.function,
                    arguments: argsString
                }
            };
        });
        
        apiMessages.push({ role: 'assistant', content: fullContent, tool_calls: formattedToolCalls });

        for (const tc of toolCalls) {
            if (signal.aborted) break;
            if (!tc || !tc.function || !tc.function.name) continue;

            let resultText = '';
            try {
                const fnName = tc.function.name;
                const args = parseToolArgs(fnName, tc.function.arguments || '{}');
                if (systemToolsImplementation[fnName]) {
                    const normalizedArgs = (() => {
                        if (!args || typeof args !== 'object') return args;
                        if (fnName === 'scaffold_static_app' || fnName === 'scaffold_react_app') {
                            const nextName = typeof (args as any).name === 'string' ? (args as any).name : null;
                            if (nextName) {
                                activeAppName = nextName;
                                activeAppPath = `${SYSTEM_PATHS.USER}/apps/${nextName}`;
                            }
                            return args;
                        }
                        if (!activeAppName || !activeAppPath) return args;
                        const next: any = { ...(args as any) };
                        if (typeof next.path === 'string') next.path = normalizePathForActiveApp(next.path, activeAppName, activeAppPath);
                        if (typeof next.cwd === 'string') next.cwd = normalizePathForActiveApp(next.cwd, activeAppName, activeAppPath);
                        return next;
                    })();
                    const res = await systemToolsImplementation[fnName](normalizedArgs, { mode });
                    resultText = typeof res === 'string' ? res : JSON.stringify(res);
                } else { resultText = `Error: Tool '${fnName}' not found`; }
            } catch (e: any) { 
                const msg = String(e?.message || e);
                const isJson = msg.includes('JSON') || msg.includes('Unexpected') || msg.includes('Invalid tool arguments JSON');
                resultText = isJson
                    ? `Error: Tool arguments are not valid JSON. This model sometimes outputs non-strict JSON for tool calls (missing commas, using single quotes, or unescaped content). Try smaller edits with 'replace_in_file' or ask it to output strict JSON tool arguments.\nDetails: ${msg}`
                    : `Error: ${msg}`;
            }

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
