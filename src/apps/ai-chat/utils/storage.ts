import { get, set, del, update } from 'idb-keyval';
import { ChatSession } from '../types';

const STORE_KEY = 'ai-chat-sessions';

export const storage = {
    getSessions: async (): Promise<ChatSession[]> => {
        try {
            const sessions = await get<ChatSession[]>(STORE_KEY);
            return sessions || [];
        } catch (error) {
            console.error('Failed to load sessions:', error);
            return [];
        }
    },

    saveSessions: async (sessions: ChatSession[]): Promise<void> => {
        try {
            await set(STORE_KEY, sessions);
        } catch (error) {
            console.error('Failed to save sessions:', error);
        }
    },

    clearSessions: async (): Promise<void> => {
        try {
            await del(STORE_KEY);
        } catch (error) {
            console.error('Failed to clear sessions:', error);
        }
    }
};
