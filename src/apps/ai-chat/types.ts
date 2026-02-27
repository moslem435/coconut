export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    error?: boolean;
    mode?: 'chat' | 'control' | 'builder';
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    modelId: string;
}

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    size: string;
    vram: string;
    recommended?: boolean;
    sizeBytes?: number;
}

export interface ChatState {
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
    addMessage: (
        sessionId: string, 
        role: 'user' | 'assistant' | 'system' | 'tool', 
        content: string, 
        mode?: 'chat' | 'control' | 'builder',
        tool_calls?: any[],
        tool_call_id?: string
    ) => void;
    updateLastMessage: (sessionId: string, content: string) => void;
    setSidebarOpen: (isOpen: boolean) => void;
    updateModelSettings: (settings: Partial<ChatState['modelSettings']>) => void;
    loadSessions: () => Promise<void>;
    clearHistory: () => Promise<void>;
}
