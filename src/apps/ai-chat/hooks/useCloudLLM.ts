import { useState, useCallback } from 'react';
import { Message, CloudConfig } from '../types';
import { systemToolsDefinitions, systemToolsImplementation, TOOL_CATEGORIES } from '../utils/systemTools';

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
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable' },
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable OpenAI model' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Use with DeepSeek base URL' },
        { id: 'qwen-plus', name: 'Qwen Plus', description: 'Use with Alibaba Cloud base URL' },
    ]
};

// ─── Gemini API (REST) ─────────────────────────────────────────────────────────

async function* streamGemini(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string
): AsyncGenerator<string> {
    const geminiMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

    // Build mode-aware system instruction
    const modeInstructions: Record<string, string> = {
        chat: systemPrompt || 'You are a helpful assistant in a web-based OS.',
        control: "You are a system control assistant for a web OS. Respond in the user's language. Answer questions directly. Only describe what actions you would take (no tool execution in cloud mode).",
        builder: `You are an expert app builder assistant. Respond in the user's language.

When asked to create an app/game:
1. Explain briefly what you will build.
2. State clearly that you are creating the files automatically.
3. Output the JSON block containing the file operations immediately.
4. DO NOT output the full source code in Markdown text blocks. ONLY include the code inside the JSON 'content' fields.
5. IMPORTANT: You MUST create a folder with the '.app' extension (e.g. "/Desktop/MyGame.app") and place an 'index.html' file inside it.
6. The JSON must follow this format:
\`\`\`json
{
  "actions": [
    { "type": "create_directory", "path": "/Desktop/GameName.app" },
    { "type": "create_file", "path": "/Desktop/GameName.app/index.html", "content": "<html>...</html>" }
  ]
}
\`\`\`
Ensure the content is properly escaped in JSON. Do not output the JSON block if you are just answering a question.`
    };

    const sysInstruction = modeInstructions[mode] || modeInstructions.chat;

    const body = {
        systemInstruction: { parts: [{ text: sysInstruction }] },
        contents: geminiMessages,
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 8192,
        }
    };

    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/${config.modelId}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try {
                    const json = JSON.parse(data);
                    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) yield text;
                } catch { /* ignore malformed chunks */ }
            }
        }
    }
}

// ─── OpenAI-Compatible API ─────────────────────────────────────────────────────

async function* streamOpenAI(
    messages: Message[],
    config: CloudConfig,
    systemPrompt: string,
    mode: string
): AsyncGenerator<string> {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';

    const modeInstructions: Record<string, string> = {
        chat: systemPrompt || 'You are a helpful assistant in a web-based OS.',
        control: "You are a system control assistant for a web OS. Respond in the user's language. Answer questions directly.",
        builder: `You are an expert app builder assistant. Respond in the user's language.

When asked to create an app/game:
1. Explain briefly what you will build.
2. State clearly that you are creating the files automatically.
3. Output the JSON block containing the file operations immediately.
4. DO NOT output the full source code in Markdown text blocks. ONLY include the code inside the JSON 'content' fields.
5. IMPORTANT: You MUST create a folder with the '.app' extension (e.g. "/Desktop/MyGame.app") and place an 'index.html' file inside it.
6. The JSON must follow this format:
\`\`\`json
{
  "actions": [
    { "type": "create_directory", "path": "/Desktop/GameName.app" },
    { "type": "create_file", "path": "/Desktop/GameName.app/index.html", "content": "<html>...</html>" }
  ]
}
\`\`\`
Ensure the content is properly escaped in JSON. Do not output the JSON block if you are just answering a question.`
    };

    const sysContent = modeInstructions[mode] || modeInstructions.chat;

    const apiMessages = [
        { role: 'system', content: sysContent },
        ...messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content || '' }))
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.modelId,
            messages: apiMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        let friendlyMsg = errText;
        try {
            const errJson = JSON.parse(errText);
            const msg = errJson?.message || errJson?.error?.message || errText;
            if (response.status === 403 || msg.toLowerCase().includes('balance') || msg.toLowerCase().includes('insufficient')) {
                friendlyMsg = `账户余额不足，请前往服务商控制台充值后再试。(${msg})`;
            } else if (response.status === 401 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('api key')) {
                friendlyMsg = `API Key 无效或已过期，请重新配置。(${msg})`;
            } else {
                friendlyMsg = msg;
            }
        } catch { /* use raw text */ }
        throw new Error(`(${response.status}) ${friendlyMsg}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let thinkingContent = '';  // accumulated reasoning/thinking
    let mainContent = '';      // accumulated main response

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try {
                    const json = JSON.parse(data);
                    const delta = json?.choices?.[0]?.delta;
                    if (!delta) continue;

                    // reasoning_content: DeepSeek R1 / SiliconFlow thinking models
                    const reasoning = delta.reasoning_content ?? delta.reasoning ?? '';
                    const content = delta.content ?? '';

                    if (reasoning) {
                        thinkingContent += reasoning;
                    }
                    if (content) {
                        mainContent += content;
                    }

                    // Compose output: <think>...</think> prefix + main content
                    // ChatArea's ThinkingProcess component parses this format
                    if (thinkingContent) {
                        // While thinking is streaming (main not started), show open tag
                        const thinkTag = mainContent
                            ? `<think>${thinkingContent}</think>`
                            : `<think>${thinkingContent}`;
                        yield thinkTag + mainContent;
                    } else if (mainContent) {
                        yield mainContent;
                    }
                } catch { /* ignore malformed chunks */ }
            }
        }
    }
}

// ─── Test API connection ───────────────────────────────────────────────────────

export async function testCloudConnection(config: CloudConfig): Promise<{ ok: boolean; message: string }> {
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
            return { ok: true, message: 'Gemini 连接成功 ✓' };
        } else {
            const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
            // Determine if the base URL likely needs a path appended
            // Some users might paste the full chat/completions URL
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
            return { ok: true, message: 'API 连接成功 ✓' };
        }
    } catch (e: any) {
        let msg = e.message || '未知错误';
        if (msg === 'Failed to fetch') {
            msg = '网络错误或跨域限制 (CORS)。请检查 Base URL 是否正确，或尝试使用代理。';
        }
        return { ok: false, message: `连接失败: ${msg}` };
    }
}

// ─── Builder Action Processor ──────────────────────────────────────────────────

function tryParseJSON(str: string): any {
    try {
        return JSON.parse(str);
    } catch (e) {
        try {
            // Common LLM JSON fixes:
            // 1. Remove markdown code block markers if they wrap the content
            let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
            
            // 2. Remove trailing commas in arrays/objects: ,] -> ] and ,} -> }
            // Improved regex to handle trailing commas more robustly across lines
            cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');

            // 3. Remove comments (//...) if they are on their own line or end of line
            // This is tricky inside strings, so let's be careful. Maybe skip for now to avoid breaking URLs.
            // cleaned = cleaned.replace(/\/\/.*/g, '');

            // 4. Robust fix for unescaped control characters inside strings (newlines, tabs)
            // We use a state machine to track if we are inside a string.
            let inString = false;
            let escaped = false;
            let result = '';
            
            for (let i = 0; i < cleaned.length; i++) {
                const char = cleaned[i];
                
                if (char === '"' && !escaped) {
                    inString = !inString;
                    result += char;
                } else if (inString) {
                    // Inside string: escape control characters
                    if (char === '\n') {
                        result += '\\n';
                    } else if (char === '\r') {
                        // skip CR
                    } else if (char === '\t') {
                        result += '\\t';
                    } else {
                        result += char;
                    }
                } else {
                    // Outside string: keep as is (structural)
                    result += char;
                }
                
                // Track escape state (backslash)
                if (char === '\\' && !escaped) {
                    escaped = true;
                } else {
                    escaped = false;
                }
            }
            
            return JSON.parse(result);
        } catch (e2) {
             // console.warn("[CloudLLM] JSON parse error:", e2, "in string:", str.substring(0, 100) + "...");
             
             // Repair strategies
             // 1. Missing commas between objects in array: } { -> }, {
             let fixed = str.replace(/}\s*{/g, '}, {');
             try { return JSON.parse(fixed); } catch (e) {}
    
             // 2. Missing commas between properties: "val" "key": -> "val", "key":
             // Aggressive regex on raw string might be risky but worth a shot as fallback.
             fixed = str.replace(/("[\s\r\n]+)(?="[^"]+":)/g, '$1,');
             try { return JSON.parse(fixed); } catch (e) {}
    
             // 3. Combined fixes
             fixed = str.replace(/}\s*{/g, '}, {').replace(/("[\s\r\n]+)(?="[^"]+":)/g, '$1,');
             try { return JSON.parse(fixed); } catch (e) {}
    
             console.warn("[CloudLLM] JSON parse failed after repairs:", e2);
             return null;
        }
    }
}

async function processBuilderActions(content: string, onNewMessage: (msg: any) => void) {
    // Extract JSON block using multiple strategies
    // 1. Standard markdown code block: ```json ... ```
    // 2. Generic code block: ``` ... ```
    // 3. Raw JSON object that looks like it contains "actions"
    
    let jsonString = null;
    
    // Strategy 1 & 2: Code blocks
    // Be more lenient with whitespace around the block
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    
    // Iterate all code blocks to find one that parses to { actions: [] }
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const potentialJson = match[1];
        const data = tryParseJSON(potentialJson);
        if (data && Array.isArray(data.actions)) {
            jsonString = potentialJson;
            break;
        }
    }
    
    if (!jsonString) {
        // Strategy 3: Find the last valid JSON object structure
        // Look for { "actions": [ ... ] } pattern
        // We use a simpler regex that just looks for the key structure
        const jsonPattern = /\{\s*"actions"\s*:\s*\[[\s\S]*\]\s*\}/;
        const match2 = content.match(jsonPattern);
        if (match2) {
            jsonString = match2[0];
        }
    }
    
    if (jsonString) {
        // Log the raw JSON string for debugging
        // console.log("[CloudLLM] Raw Builder JSON:", jsonString);
        const data = tryParseJSON(jsonString);
            
        if (data && Array.isArray(data.actions)) {
            for (const action of data.actions) {
                if (systemToolsImplementation[action.type]) {
                    // Execute tool
                    let result = '';
                    try {
                        if (action.type === 'create_directory') {
                            await systemToolsImplementation['create_directory']({ path: action.path });
                            result = `Directory created: ${action.path}`;
                        } else if (action.type === 'create_file') {
                            if (!action.content || action.content.trim() === '') {
                                console.warn(`[Builder] Empty content for file: ${action.path}`);
                                result = `Warning: Content for '${action.path}' was empty. File created but might be incomplete.`;
                                await systemToolsImplementation['create_file']({ path: action.path, content: '' });
                            } else {
                                await systemToolsImplementation['create_file']({ path: action.path, content: action.content });
                                result = `File created: ${action.path}`;
                            }
                        } else {
                            continue;
                        }
                        
                        // Report result to UI (as a tool message)
                        onNewMessage({
                            role: 'tool',
                            content: `[Builder] ${result}`,
                            mode: 'builder'
                        });
                    } catch (e: any) {
                        onNewMessage({
                            role: 'tool',
                            content: `[Builder] Error: ${e.message}`,
                            mode: 'builder',
                            error: true
                        });
                    }
                }
            }
        } else {
             console.warn("Failed to parse builder actions or invalid structure:", jsonString);
        }
    }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useCloudLLM() {
    const [state, setState] = useState<CloudLLMState>({ isLoading: false, error: null });

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
            onError(new Error('请先配置云端 API Key'));
            return;
        }

        setState({ isLoading: true, error: null });

        try {
            const isGemini = cloudConfig.provider === 'gemini';
            const stream = isGemini
                ? streamGemini(messages, cloudConfig, systemPrompt || '', mode)
                : streamOpenAI(messages, cloudConfig, systemPrompt || '', mode);

            let accumulated = '';
            for await (const chunk of stream) {
                if (isGemini) {
                    // Gemini yields incremental deltas → accumulate
                    accumulated += chunk;
                    onUpdate({ content: accumulated });
                } else {
                    // OpenAI yields full content (with think tags) → use directly
                    onUpdate({ content: chunk });
                    accumulated = chunk;
                }
            }
            
            // Post-process builder actions
            if (mode === 'builder') {
                await processBuilderActions(accumulated, (msg) => {
                    // We need to inject tool messages into the chat state
                    // The onNewMessage prop might just append to UI, let's use it
                    onNewMessage(msg);
                });
            }

            onFinish();
        } catch (err: any) {
            console.error('[CloudLLM] Error:', err);
            setState(prev => ({ ...prev, error: err.message }));
            onError(err);
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

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
