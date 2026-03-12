import { get, set, del, update } from 'idb-keyval';
import { ChatSession } from '../types';

const STORE_KEY = 'ai-chat-sessions';

let pendingSessions: ChatSession[] | null = null;
let saveTimer: number | null = null;

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

    saveSessionsDebounced: (sessions: ChatSession[], delayMs: number = 750) => {
        pendingSessions = sessions;
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
        }
        saveTimer = window.setTimeout(() => {
            const toSave = pendingSessions;
            pendingSessions = null;
            saveTimer = null;
            if (toSave) storage.saveSessions(toSave);
        }, delayMs);
    },

    clearSessions: async (): Promise<void> => {
        try {
            await del(STORE_KEY);
        } catch (error) {
            console.error('Failed to clear sessions:', error);
        }
    }
};
