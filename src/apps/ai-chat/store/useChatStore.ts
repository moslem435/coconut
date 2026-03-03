import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, Message, CloudConfig, CustomModel } from '../types';
import { storage } from '../utils/storage';

interface ChatStore {
    sessions: ChatSession[];
    currentSessionId: string | null;
    isSidebarOpen: boolean;
    aiProvider: 'local' | 'cloud';
    cloudConfig: CloudConfig;
    customModels: CustomModel[];
    modelSettings: {
        temperature: number;
        top_p: number;
        systemPrompt: string;
    };
    currentLocalModelId: string | null;

    // Actions
    setCurrentLocalModelId: (id: string | null) => void;
    createSession: (modelId?: string) => string;
    deleteSession: (id: string) => void;
    selectSession: (id: string) => void;
    updateSessionTitle: (id: string, title: string) => void;
    addMessage: (
        sessionId: string,
        role: 'user' | 'assistant' | 'system' | 'tool',
        content: string,
        mode?: 'chat' | 'control' | 'builder',
        tool_calls?: any[],
        tool_call_id?: string
    ) => void;
    updateLastMessage: (sessionId: string, updates: Partial<Omit<Message, 'id' | 'timestamp'>>) => void;
    toggleSidebar: () => void;
    updateModelSettings: (settings: Partial<ChatStore['modelSettings']>) => void;
    setAiProvider: (provider: 'local' | 'cloud') => void;
    updateCloudConfig: (config: Partial<CloudConfig>) => void;
    addCustomModel: (model: CustomModel) => void;
    removeCustomModel: (id: string) => void;
    loadSessions: () => Promise<void>;
    clearHistory: () => Promise<void>;
}

const CLOUD_CONFIG_KEY = 'ai-chat-cloud-config';
const AI_PROVIDER_KEY = 'ai-chat-provider';
const CUSTOM_MODELS_KEY = 'ai-chat-custom-models';
const MODEL_SETTINGS_KEY = 'ai-chat-model-settings';

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant living in a web-based OS. You can chat with users normally. You also have access to system tools (theme, wallpaper, apps). Only use tools when explicitly requested.";

function loadCloudConfig(): CloudConfig {
    try {
        const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { provider: 'gemini', apiKey: '', modelId: 'gemini-2.0-flash' };
}

function loadCustomModels(): CustomModel[] {
    try {
        const raw = localStorage.getItem(CUSTOM_MODELS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return [];
}

function loadModelSettings() {
    try {
        const raw = localStorage.getItem(MODEL_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                temperature: parsed.temperature ?? 0.5,
                top_p: parsed.top_p ?? 0.9,
                systemPrompt: parsed.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
            };
        }
    } catch { }
    return {
        temperature: 0.5,
        top_p: 0.9,
        systemPrompt: DEFAULT_SYSTEM_PROMPT
    };
}

export const useChatStore = create<ChatStore>((set, get) => ({
    sessions: [],
    currentSessionId: null,
    isSidebarOpen: true,
    aiProvider: (localStorage.getItem(AI_PROVIDER_KEY) as 'local' | 'cloud') || 'local',
    cloudConfig: loadCloudConfig(),
    customModels: loadCustomModels(),
    modelSettings: loadModelSettings(),
    currentLocalModelId: null,

    setCurrentLocalModelId: (id) => set({ currentLocalModelId: id }),

    createSession: (modelId = 'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC') => {
        const newSession: ChatSession = {
            id: uuidv4(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            modelId
        };

        set(state => {
            const sessions = [newSession, ...state.sessions];
            storage.saveSessions(sessions);
            return { sessions, currentSessionId: newSession.id };
        });

        return newSession.id;
    },

    deleteSession: (id) => {
        set(state => {
            const sessions = state.sessions.filter(s => s.id !== id);
            storage.saveSessions(sessions);

            // If deleting current session, select another one or null
            let currentSessionId = state.currentSessionId;
            if (currentSessionId === id) {
                currentSessionId = sessions.length > 0 && sessions[0] ? sessions[0].id : null;
            }

            return { sessions, currentSessionId };
        });
    },

    selectSession: (id) => {
        set({ currentSessionId: id });
    },

    updateSessionTitle: (id, title) => {
        set(state => {
            const sessions = state.sessions.map(s =>
                s.id === id ? { ...s, title } : s
            );
            storage.saveSessions(sessions);
            return { sessions };
        });
    },

    addMessage: (sessionId, role, content, mode, tool_calls, tool_call_id) => {
        set(state => {
            const sessions = state.sessions.map(s => {
                if (s.id !== sessionId) return s;

                const newMessage: Message = {
                    id: uuidv4(),
                    role,
                    content,
                    timestamp: Date.now(),
                    mode,
                    tool_calls,
                    tool_call_id
                };

                // Auto-generate title for first user message
                let title = s.title;
                if (s.messages.length === 0 && role === 'user') {
                    title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                }

                return {
                    ...s,
                    title,
                    messages: [...s.messages, newMessage],
                    updatedAt: Date.now()
                };
            });

            storage.saveSessions(sessions);
            return { sessions };
        });
    },

    updateLastMessage: (sessionId, updates) => {
        set(state => {
            const sessions = state.sessions.map(s => {
                if (s.id !== sessionId) return s;

                const messages = [...s.messages];
                // Find the LAST assistant message (not just last message,
                // since tool result messages may have been appended after it)
                let lastAssistantIdx = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i]!.role === 'assistant') {
                        lastAssistantIdx = i;
                        break;
                    }
                }
                if (lastAssistantIdx !== -1) {
                    messages[lastAssistantIdx] = {
                        ...messages[lastAssistantIdx],
                        ...updates
                    } as Message;
                }

                return { ...s, messages, updatedAt: Date.now() };
            });

            storage.saveSessions(sessions);
            return { sessions };
        });
    },


    toggleSidebar: () => {
        set(state => ({ isSidebarOpen: !state.isSidebarOpen }));
    },

    updateModelSettings: (settings) => {
        set(state => {
            const newSettings = { ...state.modelSettings, ...settings };
            localStorage.setItem(MODEL_SETTINGS_KEY, JSON.stringify(newSettings));
            return { modelSettings: newSettings };
        });
    },

    setAiProvider: (provider) => {
        localStorage.setItem(AI_PROVIDER_KEY, provider);
        set({ aiProvider: provider });
    },

    updateCloudConfig: (config) => {
        set(state => {
            const newConfig = { ...state.cloudConfig, ...config };
            localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(newConfig));
            return { cloudConfig: newConfig };
        });
    },

    addCustomModel: (model) => {
        set(state => {
            const customModels = [...state.customModels, model];
            localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
            return { customModels };
        });
    },

    removeCustomModel: (id) => {
        set(state => {
            const customModels = state.customModels.filter(m => m.id !== id);
            localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
            return { customModels };
        });
    },

    loadSessions: async () => {
        const sessions = await storage.getSessions();
        set({ sessions });
        if (sessions.length > 0 && sessions[0] && !get().currentSessionId) {
            set({ currentSessionId: sessions[0].id });
        }
    },

    clearHistory: async () => {
        await storage.clearSessions();
        set({ sessions: [], currentSessionId: null });
    }
}));
