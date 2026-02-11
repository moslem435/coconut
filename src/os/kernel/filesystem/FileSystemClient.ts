import { IFileSystem, FileStat } from '../IFileSystem';
import { NativeDriver } from './NativeDriver';

/**
 * FileSystemClient.ts
 * 
 * The main thread client that routes requests to either:
 * 1. The OPFS Worker (for internal system files)
 * 2. The NativeDriver (for mounted local folders)
 */
export class FileSystemClient implements IFileSystem {
    private worker: Worker | null = null;
    private pendingRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>;

    // Map of mountId -> NativeDriver instance
    private mounts: Map<string, NativeDriver> = new Map();

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
    mount(handle: FileSystemDirectoryHandle): string {
        const id = crypto.randomUUID();
        const driver = new NativeDriver(handle);
        this.mounts.set(id, driver);
        return `/mnt/${id}`;
    }

    /**
     * Unmount a native directory.
     */
    unmount(path: string): void {
        const match = path.match(/^\/mnt\/([a-zA-Z0-9-]+)/);
        if (match) {
            this.mounts.delete(match[1]);
        }
    }

    /**
     * Helper to route request to correct driver
     */
    private async route<T>(
        path: string,
        opfsAction: string,
        nativeAction: (driver: NativeDriver, relativePath: string) => Promise<T>,
        payload: any = {}
    ): Promise<T> {
        // Check if path implies a mount
        const match = path.match(/^\/mnt\/([a-zA-Z0-9-]+)(.*)/);

        if (match) {
            const mountId = match[1];
            const relativePath = match[2] || '/'; // e.g. /docs/file.txt
            const driver = this.mounts.get(mountId);

            if (!driver) {
                throw new Error(`Mount point not found: ${path}`);
            }

            return nativeAction(driver, relativePath);
        }

        // Default to OPFS Worker
        return this.sendWorker<T>(opfsAction, { path, ...payload });
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

    // --- IFileSystem Implementation ---

    async readFile(path: string): Promise<Uint8Array> {
        return this.route<Uint8Array>(
            path,
            'readFile',
            (d, p) => d.readFile(p)
        );
    }

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        return this.route<void>(
            path,
            'writeFile',
            (d, p) => d.writeFile(p, content),
            { content }
        );
    }

    async unlink(path: string, recursive = false): Promise<void> {
        return this.route<void>(
            path,
            'unlink',
            (d, p) => d.unlink(p, recursive),
            { recursive }
        );
    }

    async readdir(path: string): Promise<string[]> {
        return this.route<string[]>(
            path,
            'readdir',
            (d, p) => d.readdir(p)
        );
    }

    async mkdir(path: string, recursive = true): Promise<void> {
        return this.route<void>(
            path,
            'mkdir',
            (d, p) => d.mkdir(p, recursive),
            { recursive }
        );
    }

    async stat(path: string): Promise<FileStat> {
        return this.route<FileStat>(
            path,
            'stat',
            (d, p) => d.stat(p)
        );
    }

    async exists(path: string): Promise<boolean> {
        return this.route<boolean>(
            path,
            'exists',
            (d, p) => d.exists(p)
        );
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        // Renaming across filesystems (e.g. OPFS -> Native) is complex (move = copy + delete)
        // For now we assume rename stays within same driver.

        const isOldMount = oldPath.startsWith('/mnt/');
        const isNewMount = newPath.startsWith('/mnt/');

        if (isOldMount !== isNewMount) {
            throw new Error('Cross-filesystem move not supported yet');
        }

        return this.route<void>(
            oldPath,
            'rename',
            (d, p) => {
                // We need to resolve newPath relative to the driver ROOT too
                const matchNew = newPath.match(/^\/mnt\/([a-zA-Z0-9-]+)(.*)/);
                const relativeNew = matchNew ? (matchNew[2] || '/') : newPath;
                return d.rename(p, relativeNew);
            },
            { oldPath, newPath }
        );
    }

    /**
     * Check if a path requires permission (NativeDriver) and if we have it.
     */
    async verifyPermission(path: string, mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        const match = path.match(/^\/mnt\/([a-zA-Z0-9-]+)(.*)/);
        if (match) {
            const mountId = match[1];
            const driver = this.mounts.get(mountId);
            if (driver) {
                return driver.verifyPermission(mode);
            }
        }
        return true; // Non-native paths don't need explicit permission prompt
    }

    /**
     * Request permission for a path (NativeDriver)
     */
    async requestPermission(path: string, mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        const match = path.match(/^\/mnt\/([a-zA-Z0-9-]+)(.*)/);
        if (match) {
            const mountId = match[1];
            const driver = this.mounts.get(mountId);
            if (driver) {
                return driver.requestPermission(mode);
            }
        }
        return true;
    }
}

// Singleton instance
export const fs = new FileSystemClient();
