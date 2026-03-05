import { FileSystemState, FileNode } from './useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { get, set as setIdx } from 'idb-keyval'
import { FILESYSTEM_VERSION, INITIAL_FILES } from './initialFileTree'
import { eventBus } from '@/os/kernel/EventBus'
import { SYSTEM_PATHS, FILE_IDS } from '@/os/config/paths'

// SyncOptions for backward compatibility or future use
export interface SyncOptions {
    syncToOPFS?: boolean
    syncToWebContainer?: boolean
    syncToMemory?: boolean
}

class FileSystemSyncService {
    constructor() {
        // Listen to FileSystemClient events
        eventBus.on('fs:file:created', this.handleFileCreated.bind(this));
        eventBus.on('fs:file:updated', this.handleFileUpdated.bind(this));
        eventBus.on('fs:file:deleted', this.handleFileDeleted.bind(this));
        eventBus.on('fs:file:renamed', this.handleFileRenamed.bind(this));
        eventBus.on('fs:file:moved', this.handleFileRenamed.bind(this)); // Handle moved same as renamed for sync
    }

    private async handleFileCreated(data: { id: string; path: string; type: 'file' | 'folder' }) {
        await this.syncToWebContainer('create', data);
    }

    private async handleFileUpdated(data: { id: string; path: string; content?: string }) {
        await this.syncToWebContainer('update', data);
    }

    private async handleFileDeleted(data: { id: string; path: string }) {
        await this.syncToWebContainer('delete', data);
    }

    private async handleFileRenamed(data: { id: string; oldPath: string; newPath: string }) {
        await this.syncToWebContainer('rename', data);
    }

    private async syncToWebContainer(action: string, data: any) {
        try {
            const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore');
            const store = useWebContainerStore.getState();

            // Skip if syncing from WebContainer to avoid loops
            if (store.isSyncingFromWC) return;

            switch (action) {
                case 'create':
                    if (data.type === 'folder') {
                        store.syncMkdir(data.path);
                    } else {
                        // Content might not be available in event, read it
                        const content = await fs.readFile(data.path);
                        store.syncFile(data.path, new TextDecoder().decode(content));
                    }
                    break;
                case 'update':
                    // Content might be in event or need reading
                    let content = data.content;
                    if (content === undefined) {
                        const buffer = await fs.readFile(data.path);
                        content = new TextDecoder().decode(buffer);
                    }
                    store.syncFile(data.path, content);
                    break;
                case 'delete':
                    store.syncUnlink(data.path);
                    break;
                case 'rename':
                    // WebContainer rename not directly exposed in simple sync methods,
                    // often implemented as read old -> write new -> delete old in higher levels
                    // or accessing instance directly
                    if (store.instance) {
                        const wcOld = data.oldPath;
                        const wcNew = data.newPath;
                        await store.instance.fs.rename(wcOld, wcNew);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[SyncService] WebContainer sync failed for ${action}:`, error);
        }
    }

    // Legacy methods kept for compatibility with initial sync and manual calls
    // but refactored to use FileSystemClient events implicitly or directly

    // ... (rest of the initial sync logic) ...
    syncToOPFS = async (state: FileSystemState, set: (partial: Partial<FileSystemState>) => void) => {
        // Optimization: Use IndexedDB versioning to determine if sync is needed
        try {
            const installedVersion = await get('fs_version')
            const rootExists = await fs.exists('/')

            if (rootExists && installedVersion === FILESYSTEM_VERSION) {
                console.log(`[SyncService] Version match (${FILESYSTEM_VERSION}), skipping sync.`)

                // Ensure critical system folders exist even if version matches
                // This handles cases where any system folders (Trash, Pictures, Music, etc.) were accidentally deleted
                // Ensure ONLY critical absolute core folders exist even if version matches
                // We allow users to delete Pictures, Music, etc. but Desktop and Trash are required for UI stability
                const criticalSystemDirs = [
                    SYSTEM_PATHS.TRASH,
                    `${SYSTEM_PATHS.USER}/Desktop`
                ];

                for (const dirPath of criticalSystemDirs) {
                    if (!(await fs.exists(dirPath))) {
                        await fs.mkdir(dirPath, true);
                        console.log(`[SyncService] Recreated missing critical system folder: ${dirPath}`);
                    }
                }

                set({ isLoading: false })
                return
            }

            // Migration logic for v9 -> v10
            if (installedVersion && installedVersion < 10 && FILESYSTEM_VERSION >= 10) {
                console.log('[SyncService] Migrating v9 -> v10 structure...');
                await this.migrateV9toV10();
            }

            // Ensure Trash exists for v11+
            if (FILESYSTEM_VERSION >= 11) {
                if (!(await fs.exists(SYSTEM_PATHS.TRASH))) {
                    await fs.mkdir(SYSTEM_PATHS.TRASH);
                }
            }

        } catch (e) {
            console.warn('Failed to check version, proceeding with sync', e)
        }

        set({ isLoading: true })
        const files = Object.values(state.files)

        console.log('Starting VFS -> OPFS Initial Sync...')

        // Sort files to ensure folders are created before files
        const sortedFiles = files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1
            if (a.type !== 'folder' && b.type === 'folder') return 1
            return 0
        })

        for (const node of sortedFiles) {
            if (node.id === FILE_IDS.ROOT) continue; // Only skip root, allow trash

            const path = state.resolvePath(node.id)
            if (!path) continue

            // Skip mounted paths - they are already persisted on the native FS
            // and we don't want to overwrite them with potentially empty content
            if (path.startsWith('/mnt/') || path.startsWith(SYSTEM_PATHS.ROM) || path.startsWith('/virtual')) continue

            try {
                if (node.type === 'folder') {
                    await fs.mkdir(path, true)
                } else {
                    // Ensure parent directory exists for file
                    const parentPath = path.substring(0, path.lastIndexOf('/'))
                    if (parentPath && parentPath !== SYSTEM_PATHS.ROOT) {
                        await fs.mkdir(parentPath, true)
                    }

                    // Initial Content Hydration (Only for initial static files)
                    let initialContent: string | Uint8Array = ''
                    if (node.name === 'hello_world.ts') initialContent = '// Hello World...'
                    if (node.name === 'Welcome.txt') initialContent = 'Welcome to Portfolio OS!...'

                    // Gallery images are now handled by StaticHttpProvider mounted at /rom

                    // Basic restoration of template content
                    if (node.id === 'code-1') initialContent = `// Hello World in TypeScript\nfunction sayHello(name: string): void {\n    console.log("Hello, " + name + "!");\n}\n\nconst user = "Developer";\nsayHello(user);`
                    if (node.id === 'welcome-txt') initialContent = 'Welcome to Portfolio OS! This is a simulated file system.'
                    if (node.id === 'about-md') initialContent = '# About Me\n\nI am a full-stack developer...'

                    await fs.writeFile(path, initialContent)
                }
            } catch (err) {
                console.warn(`Sync failed for ${path}`, err)
            }
        }

        // Update version after successful sync
        try {
            await setIdx('fs_version', FILESYSTEM_VERSION)
            console.log(`[SyncService] Updated fs_version to ${FILESYSTEM_VERSION}`)
        } catch (e) {
            console.warn('[SyncService] Failed to update fs_version', e)
        }

        console.log('VFS -> OPFS Sync Complete')
        set({ isLoading: false })
    }

    async migrateV9toV10() {
        try {
            // Ensure new directory structure exists
            if (!(await fs.exists(SYSTEM_PATHS.HOME))) await fs.mkdir(SYSTEM_PATHS.HOME);
            if (!(await fs.exists(SYSTEM_PATHS.USER))) await fs.mkdir(SYSTEM_PATHS.USER);

            // Move folders from root to /home/user
            const foldersToMove = [
                FILE_IDS.DESKTOP,
                FILE_IDS.DOCUMENTS,
                FILE_IDS.DOWNLOADS,
                FILE_IDS.MUSIC,
                FILE_IDS.PICTURES,
                FILE_IDS.CODE
            ];

            for (const id of foldersToMove) {
                const folderName = INITIAL_FILES[id]?.name || id; // Fallback to id if not found, though should be there
                const oldPath = `/${folderName}`;
                const newPath = `${SYSTEM_PATHS.USER}/${folderName}`;

                if (await fs.exists(oldPath)) {
                    // Check if new path already exists (partial migration or initial sync created it)
                    if (await fs.exists(newPath)) {
                        console.log(`[Migration] ${newPath} already exists, merging content from ${oldPath}...`);
                        // Move content instead of folder
                        const files = await fs.readdir(oldPath);
                        for (const file of files) {
                            try {
                                await fs.rename(`${oldPath}/${file}`, `${newPath}/${file}`);
                            } catch (e) {
                                console.warn(`Failed to move ${file}:`, e);
                            }
                        }
                        // Remove old folder if empty
                        try { await fs.unlink(oldPath, true); } catch { }
                    } else {
                        console.log(`[Migration] Moving ${oldPath} -> ${newPath}`);
                        await fs.rename(oldPath, newPath);
                    }
                }
            }

            console.log('[Migration] v9 -> v10 migration completed');
        } catch (e) {
            console.error('[Migration] Failed to migrate v9 -> v10:', e);
        }
    }

    // Proxy methods to maintain API compatibility but use fs directly
    // These methods are redundant now if everyone uses fs directly, 
    // but kept to avoid breaking changes in other files.

    async syncCreate(path: string, type: 'file' | 'folder', content?: string | Uint8Array, options?: SyncOptions) {
        if (type === 'folder') await fs.mkdir(path);
        else await fs.writeFile(path, content || '');
    }

    async syncUpdate(path: string, content: string | Uint8Array, options?: SyncOptions) {
        await fs.writeFile(path, content);
    }

    async syncDelete(path: string, options?: SyncOptions) {
        await fs.unlink(path, true);
    }

    async syncRename(oldPath: string, newPath: string, options?: SyncOptions) {
        await fs.rename(oldPath, newPath);
    }

    async readContent(path: string): Promise<string> {
        const buffer = await fs.readFile(path);
        return new TextDecoder().decode(buffer);
    }

    async getFileBlob(path: string): Promise<Blob> {
        return await fs.getFileBlob(path);
    }

    async readDirectory(path: string): Promise<string[]> {
        return await fs.readdir(path);
    }

    async getStats(path: string) {
        return await fs.stat(path);
    }
}

export const syncService = new FileSystemSyncService()
