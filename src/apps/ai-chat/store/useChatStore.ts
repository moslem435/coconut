import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, Message } from '../types';
import { storage } from '../utils/storage';

interface ChatStore {
    sessions: ChatSession[];
    currentSessionId: string | null;
    isSidebarOpen: boolean;
    modelSettings: {
        temperature: number;
        top_p: number;
        systemPrompt: string;
    };
    
    // Actions
    createSession: (modelId?: string) => string;
    deleteSession: (id: string) => void;
    selectSession: (id: string) => void;
    updateSessionTitle: (id: string, title: string) => void;
    addMessage: (sessionId: string, role: 'user' | 'assistant' | 'system', content: string) => void;
    updateLastMessage: (sessionId: string, content: string) => void;
    toggleSidebar: () => void;
    updateModelSettings: (settings: Partial<ChatStore['modelSettings']>) => void;
    loadSessions: () => Promise<void>;
    clearHistory: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
    sessions: [],
    currentSessionId: null,
    isSidebarOpen: true,
    modelSettings: {
        temperature: 0.7,
        top_p: 1.0,
        systemPrompt: "You are a helpful AI assistant running locally in the browser."
    },

    createSession: (modelId = 'Llama-3-8B-Instruct-q4f32_1-MLC') => {
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
                currentSessionId = sessions.length > 0 ? sessions[0].id : null;
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

    addMessage: (sessionId, role, content) => {
        set(state => {
            const sessions = state.sessions.map(s => {
                if (s.id !== sessionId) return s;

                const newMessage: Message = {
                    id: uuidv4(),
                    role,
                    content,
                    timestamp: Date.now()
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

    updateLastMessage: (sessionId, content) => {
        set(state => {
            const sessions = state.sessions.map(s => {
                if (s.id !== sessionId) return s;
                
                const messages = [...s.messages];
                if (messages.length > 0) {
                    messages[messages.length - 1] = {
                        ...messages[messages.length - 1],
                        content
                    };
                }

                return { ...s, messages, updatedAt: Date.now() };
            });
            
            // Don't save to storage on every character update to avoid perf issues
            // Storage sync could be debounced or done on specific events
            return { sessions };
        });
    },

    toggleSidebar: () => {
        set(state => ({ isSidebarOpen: !state.isSidebarOpen }));
    },

    updateModelSettings: (settings) => {
        set(state => ({
            modelSettings: { ...state.modelSettings, ...settings }
        }));
    },

    loadSessions: async () => {
        const sessions = await storage.getSessions();
        set({ sessions });
        if (sessions.length > 0 && !get().currentSessionId) {
            set({ currentSessionId: sessions[0].id });
        }
    },

    clearHistory: async () => {
        await storage.clearSessions();
        set({ sessions: [], currentSessionId: null });
    }
}));
