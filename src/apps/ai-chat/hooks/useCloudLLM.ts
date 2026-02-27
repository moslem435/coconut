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
        builder: `You are an expert app builder assistant. Respond in the user's language.\n\nWhen asked to create an app/game:\n1. Reply briefly confirming what you will build.\n2. Output a SINGLE, complete, self-contained HTML file in a markdown code block tagged as \`\`\`html\n3. The HTML must include ALL CSS and JavaScript inline. Make it visually polished and fully functional.\n4. After the code block, add a short usage tip.\n\nDo NOT skip steps. Always produce complete, working code.`
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
        builder: `You are an expert app builder assistant. Respond in the user's language.\n\nWhen asked to create an app/game:\n1. Reply briefly confirming what you will build.\n2. Output a SINGLE, complete, self-contained HTML file in a markdown code block tagged as \`\`\`html\n3. The HTML must include ALL CSS and JavaScript inline. Make it visually polished and fully functional.\n4. After the code block, add a short usage tip.`
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
            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({ model: config.modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
                throw new Error(err?.error?.message || res.statusText);
            }
            return { ok: true, message: 'API 连接成功 ✓' };
        }
    } catch (e: any) {
        return { ok: false, message: `连接失败: ${e.message}` };
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
