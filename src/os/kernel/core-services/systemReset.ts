import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useChatStore } from '@/apps/ai-chat/store/useChatStore'
import { storage as aiChatStorage } from '@/apps/ai-chat/utils/storage'
import { del } from 'idb-keyval'

/**
 * 助手函数：深度清空 Zustand store
 */
const clearZustandStore = async (storePromise: any, emptyState?: any) => {
    try {
        const store = await storePromise;
        if (store.persist) {
            try { store.persist.clearStorage(); } catch (e) { }
        }
        if (emptyState) store.setState(emptyState);
    } catch (e) {
        console.warn('Failed to clear store:', e);
    }
};

/**
 * 全量数据毁灭重置
 * 适用于从 UI 调用的安全出厂重置
 */
export const performFactoryReset = async (selectedKeys?: string[]) => {
    // 默认或全选状态下全清
    const isFullReset = !selectedKeys || (selectedKeys.includes('settings') && selectedKeys.includes('filesystem') && selectedKeys.includes('desktop'));

    // 1. System Settings
    if (!selectedKeys || selectedKeys.includes('settings')) {
        await clearZustandStore(Promise.resolve(useSystemSettingsStore));
        await clearZustandStore(Promise.resolve(useLanguageStore));
        localStorage.removeItem('cloud-os-settings');
        localStorage.removeItem('portfolio_lang');
    }

    // 2. AI Chat
    if (!selectedKeys || selectedKeys.includes('aiChat')) {
        await aiChatStorage.clearSessions();
        await clearZustandStore(Promise.resolve(useChatStore));
    }

    // 3. Filesystem (The most complex one)
    if (!selectedKeys || selectedKeys.includes('filesystem')) {
        // Clear IndexedDB backend for file system
        await clearZustandStore(Promise.resolve(useFileSystemStore), { files: {} });

        // Clear real OPFS physical file storage
        try {
            const rootChildren = await fs.readdir('/');
            for (const name of rootChildren) {
                await fs.unlink('/' + name, true).catch(console.warn);
            }
        } catch (e) {
            console.warn('OPFS clean fail:', e);
        }

        // Delete initialization marks
        try {
            await del('fs_version');
        } catch (e) { }
    }

    // 4. Desktop UI States
    if (!selectedKeys || selectedKeys.includes('desktop')) {
        await clearZustandStore(Promise.resolve(useDesktopStore), { iconPositions: {} });
        await clearZustandStore(Promise.resolve(useWindowStore), { windows: {}, activeWindowId: null });
        await clearZustandStore(Promise.resolve(useProcessStore), { processes: {} });
        localStorage.removeItem('desktop-storage');
    }

    // 5. Music
    if (!selectedKeys || selectedKeys.includes('music')) {
        localStorage.removeItem('music-player-state');
    }

    // Aggressively prevent "last breath" saves if heavily clearing
    if (isFullReset) {
        try {
            localStorage.setItem = () => { };
            sessionStorage.setItem = () => { };
            localStorage.clear();
            sessionStorage.clear();

            // Annihilate all existing IndexedDB Databases
            if (window.indexedDB && window.indexedDB.databases) {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) {
                    if (db.name) window.indexedDB.deleteDatabase(db.name);
                }
            } else {
                window.indexedDB.deleteDatabase('keyval-store');
            }
        } catch (e) {
            console.warn('Aggressive storage clear failed:', e);
        }
    }

    // Give IDB and other async storage engines a moment to flush deletes
    await new Promise(r => setTimeout(r, 600));
    window.location.replace('/');
};
