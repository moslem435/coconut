import { IFileSystemProvider, FileStat } from './IFileSystemProvider';
import { NativeDriver } from './NativeDriver';
import { eventBus } from '@/os/kernel/EventBus';
import { FileSystemError, FileSystemErrorType } from './errors/FileSystemError';

/**
 * FileSystemClient.ts
 * 
 * The main thread client that routes requests to either:
 * 1. The OPFS Worker (for internal system files)
 * 2. The NativeDriver (for mounted local folders)
 * 3. Registered FileSystemProviders (e.g. static assets)
 */
export class FileSystemClient implements IFileSystemProvider {
    name = 'fs-client';
    readonly = false;
    private worker: Worker | null = null;
    private pendingRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>;

    // Map of mountPath -> IFileSystemProvider
    private mounts: Map<string, IFileSystemProvider> = new Map();

    constructor() {
        this.pendingRequests = new Map();

        if (typeof window !== 'undefined') {
            this.worker = new Worker(new URL('./worker/fs.worker.ts', import.meta.url), { type: 'module' });

            this.worker.onmessage = (e) => {
                const { id, result, error } = e.data;
                const request = this.pendingRequests.get(id);

                if (request) {
                    if (error) {
                        request.reject(new Error(error));
                    } else {
                        request.resolve(result);
                    }
                    this.pendingRequests.delete(id); // Clean up
                }
            };
        }
    }

    /**
     * Mount a native directory handle.
     * Returns the mount path (e.g., "/mnt/native-123")
     */
    mount(handle: FileSystemDirectoryHandle, forcedId?: string): string {
        const id = forcedId || crypto.randomUUID();
        const driver = new NativeDriver(handle);
        this.mounts.set(`/mnt/${id}`, driver);
        return `/mnt/${id}`;
    }

    /**
     * Unmount a native directory.
     */
    unmount(path: string): void {
        const match = path.match(/^\/mnt\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
            this.mounts.delete(`/mnt/${match[1]}`);
        }
    }

    /**
     * Register a custom file system provider (e.g. static http)
     */
    registerProvider(mountPath: string, provider: IFileSystemProvider) {
        // Normalize mountPath to ensure it starts with / and no trailing /
        let normalized = mountPath.startsWith('/') ? mountPath : '/' + mountPath;
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        this.mounts.set(normalized, provider);
        console.log(`[FileSystem] Registered provider '${provider.name}' at '${normalized}'`);
    }

    /**
     * Resolve the correct provider and relative path for a given absolute path.
     */
    private resolveProvider(path: string): { provider: IFileSystemProvider | null, relativePath: string } {
        // Find the longest matching mount point
        let bestMatch = '';
        let bestProvider: IFileSystemProvider | null = null;

        for (const [mountPath, provider] of this.mounts) {
            if (path === mountPath || path.startsWith(mountPath + '/')) {
                if (mountPath.length > bestMatch.length) {
                    bestMatch = mountPath;
                    bestProvider = provider;
                }
            }
        }

        if (bestProvider) {
            const relativePath = path.slice(bestMatch.length) || '/';
            return { provider: bestProvider, relativePath };
        }

        return { provider: null, relativePath: path };
    }

    /**
     * Helper to route request to correct driver
     */
    private async route<T>(
        path: string,
        action: keyof IFileSystemProvider,
        payload: any = {}
    ): Promise<T> {
        const { provider, relativePath } = this.resolveProvider(path);

        const result = await (async () => {
            if (provider) {
                try {
                    // @ts-ignore
                    return provider[action](relativePath, payload.content || payload.recursive || payload.newPath);
                } catch (e: any) {
                    // Pass through FileSystemErrors
                    if (e instanceof FileSystemError) {
                        throw e;
                    }
                    throw new Error(`Provider error [${provider.name}]: ${e.message}`);
                }
            }

            // Default to OPFS Worker
            // Map IFileSystemProvider method names to worker message types if necessary
            // Assuming worker types match interface method names
            return this.sendWorker<T>(action, { path, ...payload });
        })();

        const isInternalCachePath =
            path.startsWith('/home/user/.cache/npm') ||
            path.startsWith('/home/user/.cache/deps');

        if (!isInternalCachePath) {
            // Emit events for write operations
            if (action === 'writeFile') {
                eventBus.emit('fs:file:updated', { id: path.split('/').pop() || '', path, content: typeof payload.content === 'string' ? payload.content : undefined });
            } else if (action === 'unlink') {
                eventBus.emit('fs:file:deleted', { id: path.split('/').pop() || '', path });
            } else if (action === 'mkdir') {
                eventBus.emit('fs:file:created', { id: path.split('/').pop() || '', path, type: 'folder' });
            } else if (action === 'rename') {
                const oldPath = path;
                const newPath = payload.newPath; // Ensure payload has newPath for rename
                if (newPath) {
                    eventBus.emit('fs:file:renamed', { id: newPath.split('/').pop() || '', oldPath, newPath });
                }
            }
        }

        return result;
    }

    private sendWorker<T>(type: string, payload: any = {}): Promise<T> {
        if (!this.worker) {
            return Promise.reject(new Error("FileSystemClient is not initialized (Server Side?)"));
        }

        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            // Store request callbacks
            this.pendingRequests.set(id, { resolve, reject });
            this.worker!.postMessage({ id, type, ...payload });
        });
    }

    // --- IFileSystemProvider Implementation ---

    async readFile(path: string): Promise<Uint8Array> {
        return this.route<Uint8Array>(path, 'readFile');
    }

    async getFileBlob(path: string): Promise<Blob> {
        const { provider, relativePath } = this.resolveProvider(path);

        if (provider) {
            if (provider.getFileBlob) {
                return provider.getFileBlob(relativePath);
            }
            // Fallback
            const content = await provider.readFile(relativePath);
            return new Blob([content as any]);
        }

        return this.sendWorker<Blob>('getFileBlob', { path });
    }

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        return this.route<void>(path, 'writeFile', { content });
    }

    async unlink(path: string, recursive = false): Promise<void> {
        return this.route<void>(path, 'unlink', { recursive });
    }

    async readdir(path: string): Promise<string[]> {
        // If path is root, merge mount points with OPFS root content
        if (path === '/' || path === '') {
            let opfsFiles: string[] = [];
            try {
                opfsFiles = await this.route<string[]>('/', 'readdir');
            } catch (e) {
                console.warn('Failed to read OPFS root:', e);
            }

            const mountPoints = Array.from(this.mounts.keys())
                .filter(p => p.split('/').length === 2) // Top level mounts e.g. /rom, /mnt
                .map(p => p.slice(1)); // Remove leading /

            // Deduplicate
            return Array.from(new Set([...opfsFiles, ...mountPoints]));
        }

        return this.route<string[]>(path, 'readdir');
    }

    async mkdir(path: string, recursive = true): Promise<void> {
        return this.route<void>(path, 'mkdir', { recursive });
    }

    async stat(path: string): Promise<FileStat> {
        return this.route<FileStat>(path, 'stat');
    }

    async exists(path: string): Promise<boolean> {
        return this.route<boolean>(path, 'exists');
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        const { provider: oldProvider, relativePath: oldRel } = this.resolveProvider(oldPath);
        const { provider: newProvider, relativePath: newRel } = this.resolveProvider(newPath);

        // Same provider - use optimized move
        if (oldProvider === newProvider) {
            // Note: We need to pass newPath in payload for event emission in route()
            // But route() takes a single path.
            // For rename, route() handles dispatch but event emission needs newPath.
            // We can call route() with oldPath and payload { newPath }
            return this.route<void>(oldPath, 'rename', { newPath });
        }

        // Cross-provider move: Copy + Delete
        console.log(`[FileSystem] Cross-provider move detected: ${oldPath} -> ${newPath}`);
        try {
            await this.copy(oldPath, newPath);
            await this.unlink(oldPath, true);
            eventBus.emit('fs:file:moved', { id: newPath.split('/').pop() || '', oldPath, newPath });
        } catch (error: any) {
            console.error('[FileSystem] Cross-provider move failed:', error);
            throw new FileSystemError(
                FileSystemErrorType.Unknown,
                `Failed to move file across filesystems: ${error.message}`,
                error
            );
        }
    }

    /**
     * Recursive copy helper for cross-driver operations
     */
    public async copy(source: string, dest: string): Promise<void> {
        const stats = await this.stat(source);

        if (stats.isDirectory) {
            await this.mkdir(dest, true);
            const children = await this.readdir(source);

            for (const child of children) {
                const childSource = source.endsWith('/') ? `${source}${child}` : `${source}/${child}`;
                const childDest = dest.endsWith('/') ? `${dest}${child}` : `${dest}/${child}`;
                await this.copy(childSource, childDest);
            }
        } else {
            const content = await this.readFile(source);
            await this.writeFile(dest, content);
        }
    }

    /**
     * Check if an operation is allowed on a path
     */
    async checkPermission(path: string, operation: 'read' | 'write' | 'delete'): Promise<{ allowed: boolean, reason?: string }> {
        const { provider } = this.resolveProvider(path);

        if (provider) {
            if (provider.readonly && ['write', 'delete'].includes(operation)) {
                return {
                    allowed: false,
                    reason: `Read-only file system: ${provider.name}`
                };
            }

            // Native driver permission check
            if (provider instanceof NativeDriver) {
                const mode = operation === 'read' ? 'read' : 'readwrite';
                const hasPermission = await provider.verifyPermission(mode);
                if (!hasPermission) {
                    return {
                        allowed: false,
                        reason: `Permission required for ${operation} operation`
                    };
                }
            }

            return { allowed: true };
        }

        // OPFS - always allowed
        return { allowed: true };
    }

    /**
     * Check if a path requires permission (NativeDriver) and if we have it.
     */
    async verifyPermission(path: string, mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        const { provider } = this.resolveProvider(path);
        if (provider instanceof NativeDriver) {
            return provider.verifyPermission(mode);
        }
        return true;
    }

    /**
     * Request permission for a path (NativeDriver)
     */
    async requestPermission(path: string, mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        const { provider } = this.resolveProvider(path);
        if (provider instanceof NativeDriver) {
            return provider.requestPermission(mode);
        }
        return true;
    }
}

// Singleton instance
export const fs = new FileSystemClient();
