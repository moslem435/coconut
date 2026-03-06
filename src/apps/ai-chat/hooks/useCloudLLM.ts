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
            // Skip empty placeholder messages (no content, no tool_calls)
            if (!m.tool_calls?.length && !m.content) continue;
            if (m.tool_calls?.length) {
                // Merge text + functionCall into ONE model turn.
                // Gemini requires user/model turns to strictly alternate;
                // two consecutive model turns cause a 400 error.
                const parts: any[] = [];
                if (m.content) parts.push({ text: m.content });
                for (const tc of m.tool_calls) {
                    parts.push({
                        functionCall: {
                            name: tc.function?.name || '',
                            args: (() => {
                                try { return JSON.parse(tc.function?.arguments || '{}'); } catch { return {}; }
                            })()
                        }
                    });
                }
                contents.push({ role: 'model', parts });
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

    let fallbackToolCallIds: string[] = [];

    for (const m of messages) {
        if (m.role === 'system') continue;

        if (m.role === 'user') {
            apiMessages.push({ role: 'user', content: m.content || '' });
        } else if (m.role === 'assistant') {
            const msg: any = { role: 'assistant', content: m.content || "" };

            if (m.tool_calls?.length) {
                fallbackToolCallIds = []; // clear for new turn
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

    // --- Strict Sanitization for DeepSeek / strict OpenAPI ---
    let sanitized: any[] = [];
    for (const msg of apiMessages) {
        if (msg.role === 'system') {
            sanitized.push(msg);
            continue;
        }

        const last = sanitized[sanitized.length - 1];

        // Merge consecutive user messages
        if (msg.role === 'user') {
            // Error prevention: If previous message was a tool, but no assistant followed it 
            if (last && last.role === 'tool') {
                sanitized.push({ role: 'assistant', content: "Action completed." });
            }
            const newLast = sanitized[sanitized.length - 1];
            if (newLast && newLast.role === 'user') {
                newLast.content += `\n\n${msg.content}`;
            } else {
                sanitized.push(msg);
            }
        }
        // Assistant messages
        else if (msg.role === 'assistant') {
            if (last && last.role === 'assistant' && !last.tool_calls?.length && !msg.tool_calls?.length) {
                last.content += `\n\n${msg.content}`;
            } else {
                // Ensure assistant message always has content or tool_calls
                if (!msg.content && !msg.tool_calls?.length) {
                    msg.content = "Proceeding...";
                }
                sanitized.push(msg);
            }
        }
        // Tool messages
        else if (msg.role === 'tool') {
            // A tool MUST be preceded by an assistant with tool_calls (or another tool)
            if (last && (last.role === 'assistant' || last.role === 'tool')) {
                // If the previous assistant doesn't actually have this tool_call_id, we MUST inject a dummy assistant call or it breaks
                if (last.role === 'assistant' && !last.tool_calls?.find((t: any) => t.id === msg.tool_call_id)) {
                    // It's orphaned, drop it
                    continue;
                }
                sanitized.push(msg);
            }
        }
    }

    // Final sanity check: ensuring history ends with a user message when a new query starts.
    // If we're midway through a tool loop, it drops the ending user message.
    // However, DeepSeek requires alternating structures. 
    // We clean up trailing tool/assistant messages if they are malformed without a user prompt.
    if (sanitized.length > 0) {
        // Find the first non-system message, if it's not a user message, we prepend a generic one
        const firstNonSystemIdx = sanitized.findIndex(m => m.role !== 'system');
        if (firstNonSystemIdx >= 0 && sanitized[firstNonSystemIdx].role !== 'user') {
            sanitized.splice(firstNonSystemIdx, 0, { role: 'user', content: 'Begin task' });
        }
    }

    return sanitized;
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
4. Install dependencies using 'run_command' (e.g., 'npm install').
5. FOR TAILWIND CSS: Follow this EXACT sequence:
   a) First run: 'npm install -D tailwindcss postcss autoprefixer'
   b) Then run: 'npx tailwindcss init -p'
   c) Update tailwind.config.js and add Tailwind directives to CSS
6. Write/Update code using 'create_file' or 'update_file'.
7. For full-stack apps, ensure both frontend and backend can run (e.g., using 'concurrently' or separate terminals).

CRITICAL EXECUTION RULES:
- NEVER use interactive commands: "npm create vite", "npm init" (use "npm init -y"), "create-react-app"
- After completing a major milestone (e.g., project initialized, dependencies installed), provide a brief progress update
- When all setup is complete, STOP using tools and provide a final summary with next steps
- Don't create unnecessary files or run redundant commands
- Maximum 12-15 tool calls per task - plan efficiently

DEBUGGING:
- If a command fails, read the output, fix the code/config, and try again.
- Use 'get_file_tree' to understand the current structure.

COMPLETION CRITERIA:
You should STOP and provide a summary when:
- All requested files and directories are created
- All dependencies are installed
- The project structure is complete and ready to use
- You've provided clear instructions on how to run/use the app`
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

    // Multi-turn agentic loop
    // Control mode: 6 rounds (simple system operations)
    // Builder mode: 12 rounds (complex build tasks)
    const maxRounds = mode === 'builder' ? 50 : 6;
    
    for (let round = 0; round < maxRounds; round++) {
        if (signal.aborted) break;

        if (round > 0) {
            // Need a new assistant placeholder for follow-up turns
            onNewMessage({ role: 'assistant', content: '', mode });
        }

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
                        let hasNewData = false;
                        if (typeof part.text === 'string' && part.text) {
                            accumulatedText += part.text;
                            hasNewData = true;
                        }
                        if (part.functionCall) {
                            functionCallParts.push(part);
                            hasNewData = true;
                        }
                        if (hasNewData) {
                            onUpdate({
                                content: accumulatedText,
                                tool_calls: functionCallParts.length > 0 ? functionCallParts.map((p, i) => ({
                                    id: `call_${p.functionCall.name}_${round}_${i}`, // Add index for uniqueness
                                    function: {
                                        name: p.functionCall.name,
                                        arguments: JSON.stringify(p.functionCall.args)
                                    },
                                    type: 'function'
                                })) : undefined
                            });
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

        for (let i = 0; i < functionCallParts.length; i++) {
            const part = functionCallParts[i];
            if (signal.aborted) break;
            const { name, args } = part.functionCall;
            const toolCallId = `call_${name}_${round}_${i}`; // Add index for uniqueness
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
                mode,
                tool_call_id: toolCallId
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

    // Multi-turn agentic loop
    // Control mode: 6 rounds (simple system operations)
    // Builder mode: 12 rounds (complex build tasks)
    const maxRounds = mode === 'builder' ? 12 : 6;
    
    for (let round = 0; round < maxRounds; round++) {
        console.log(`[CloudLLM/OpenAI] Starting round ${round}/${maxRounds - 1}, messages count: ${apiMessages.length}`);
        if (signal.aborted) break;

        if (round > 0) {
            // Need a new assistant placeholder for follow-up turns
            onNewMessage({ role: 'assistant', content: '', mode, isPlaceholder: true });
        }

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
            requestBody.tool_choice = 'auto'; // DeepSeek might have an issue with auto? Let's check the messages first
        }

        console.log("[CloudLLM] Sending request to OpenAI API format. Request Body:", JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal
        });

        console.log(`[CloudLLM/OpenAI] Round ${round}: Received response, status: ${response.status}`);

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[CloudLLM] API Error Details (${response.status}):`, errText);
            console.error(`[CloudLLM] Faulty Request Body:`, JSON.stringify(requestBody, null, 2));

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

                    // Stream text to UI
                    let hasNewData = false;
                    if (reasoning) {
                        thinkingContent += reasoning;
                        hasNewData = true;
                    }
                    if (content) {
                        fullContent += content;
                        hasNewData = true;
                    }

                    // Accumulate tool calls (streamed incrementally by index)
                    if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (tc.index !== undefined) {
                                if (!toolCalls[tc.index]) {
                                    toolCalls[tc.index] = {
                                        id: tc.id || `call_${Date.now()}_${tc.index}`,
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
                        hasNewData = true;
                    }

                    if (hasNewData) {
                        const displayContent = thinkingContent
                            ? (fullContent ? `<think>${thinkingContent}</think>${fullContent}` : `<think>${thinkingContent}`)
                            : fullContent;

                        onUpdate({
                            content: displayContent,
                            tool_calls: toolCalls.length > 0 ? [...toolCalls] : undefined
                        });
                    }
                } catch { /* ignore malformed chunks */ }
            }
        }

        console.log(`[CloudLLM/OpenAI] Round ${round}: Stream completed. fullContent length: ${fullContent.length}, toolCalls: ${toolCalls.length}`);

        // If no tool calls, we're done with this agentic loop
        // The assistant has provided a final text response
        if (toolCalls.length === 0) {
            console.log(`[CloudLLM] Round ${round}: No tool calls, ending loop`);
            // This is a text-only response, which is the final answer
            break;
        }

        console.log(`[CloudLLM] Round ${round}: Found ${toolCalls.length} tool calls, executing...`);

        // Ensure final state is correctly updated to UI store before starting tool execution
        const finalContent = thinkingContent
            ? (fullContent ? `<think>${thinkingContent}</think>${fullContent}` : `<think>${thinkingContent}</think>`)
            : fullContent;

        if (finalContent.trim() || toolCalls.length > 0) {
            onUpdate({
                content: finalContent,
                tool_calls: toolCalls.length > 0 ? [...toolCalls] : undefined
            });
        }

        // Add assistant turn with tool calls to in-flight history
        const assistantMsg: any = {
            role: 'assistant',
            content: fullContent || ""
        };
        if (toolCalls.length > 0) {
            assistantMsg.tool_calls = toolCalls;
        }
        apiMessages.push(assistantMsg);

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
                content: resultText || "Success",
                mode,
                tool_call_id: toolCall.id
            });

            apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: resultText || "Success"
            });
        }
        
        console.log(`[CloudLLM/OpenAI] Round ${round}: Completed ${toolCalls.length} tool executions, continuing to next round...`);
    }
    
    // If we exit the loop due to max rounds, log a warning
    console.warn(`[CloudLLM/OpenAI] Reached maximum rounds (${maxRounds}). Task may be incomplete.`);
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
