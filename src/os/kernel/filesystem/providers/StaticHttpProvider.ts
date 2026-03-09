
import { IFileSystemProvider, FileStat } from '../IFileSystemProvider';
import { FileSystemError } from '../errors/FileSystemError';

interface ManifestEntry {
    path: string;
    name: string;
    size: number;
    mtime: number;
    type: 'file' | 'directory';
}

export class StaticHttpProvider implements IFileSystemProvider {
    name = 'static-http';
    readonly = true;
    private fileMap = new Map<string, ManifestEntry>();
    private dirMap = new Map<string, Set<string>>(); // path -> Set of child names
    private initialized = false;

    constructor(private manifestUrl: string = '/fs-manifest.json') { }

    async init() {
        if (this.initialized) return;
        try {
            const res = await fetch(this.manifestUrl);
            if (!res.ok) {
                console.warn(`StaticHttpProvider: Failed to load manifest from ${this.manifestUrl}`);
                return;
            }
            const manifest: ManifestEntry[] = await res.json();

            manifest.forEach(entry => {
                const normalizedPath = entry.path.startsWith('/') ? entry.path : '/' + entry.path;
                this.fileMap.set(normalizedPath, entry);

                // Build directory tree
                const parts = normalizedPath.split('/').filter(Boolean);
                // Ensure parent directories exist in dirMap
                let currentPath = '';

                // For a file /a/b/c.jpg
                // parts = ['a', 'b', 'c.jpg']
                if (parts.length === 0) return;

                // 1. Add 'a' to root
                this.addToDir('/', parts[0]!);

                // 2. Add 'b' to '/a'
                // 3. Add 'c.jpg' to '/a/b'
                for (let i = 0; i < parts.length - 1; i++) {
                    const parent = currentPath || '/';
                    const child = parts[i]!;
                    this.addToDir(parent, child);

                    currentPath += '/' + child;

                    // Add directory entry itself if not exists
                    if (!this.fileMap.has(currentPath)) {
                        this.fileMap.set(currentPath, {
                            path: currentPath,
                            name: child,
                            size: 0,
                            mtime: Date.now(),
                            type: 'directory'
                        });
                    }
                }

                // Add file to parent dir
                const parentPath = currentPath || '/';
                const fileName = parts[parts.length - 1]!;
                this.addToDir(parentPath, fileName);
            });

            this.initialized = true;
        } catch (e) {
            console.error('StaticHttpProvider init failed', e);
        }
    }

    private addToDir(dirPath: string, childName: string) {
        if (!this.dirMap.has(dirPath)) {
            this.dirMap.set(dirPath, new Set());
        }
        this.dirMap.get(dirPath)!.add(childName);
    }

    async stat(path: string): Promise<FileStat> {
        await this.init();

        // Root check
        if (path === '/' || path === '') {
            return {
                size: 0,
                mtime: Date.now(),
                atime: Date.now(),
                ctime: Date.now(),
                isDirectory: true,
                isFile: false
            };
        }

        const entry = this.fileMap.get(path);
        if (!entry) {
            // Check if it is a directory inferred from dirMap
            if (this.dirMap.has(path)) {
                return {
                    size: 0,
                    mtime: Date.now(),
                    atime: Date.now(),
                    ctime: Date.now(),
                    isDirectory: true,
                    isFile: false
                };
            }
            throw new Error(`File not found: ${path}`);
        }

        return {
            size: entry.size,
            mtime: entry.mtime,
            atime: Date.now(),
            ctime: Date.now(),
            isDirectory: entry.type === 'directory',
            isFile: entry.type === 'file'
        };
    }

    async readFile(path: string): Promise<Uint8Array> {
        await this.init();
        const entry = this.fileMap.get(path);
        if (!entry || entry.type !== 'file') {
            throw new Error(`File not found or is directory: ${path}`);
        }

        // Fetch actual content
        // The path in manifest matches the URL path relative to public
        const res = await fetch(entry.path);
        if (!res.ok) throw new Error(`Failed to fetch file: ${path}`);

        const blob = await res.blob();
        return new Uint8Array(await blob.arrayBuffer());
    }

    async readdir(path: string): Promise<string[]> {
        await this.init();
        const normalized = path === '/' ? '/' : path.replace(/\/$/, '');
        const children = this.dirMap.get(normalized);
        if (!children) {
            if (this.fileMap.has(normalized) && this.fileMap.get(normalized)!.type === 'file') {
                throw new Error('Not a directory');
            }
            // Return empty for unknown dirs or throw?
            // If we want to be strict:
            // throw new Error(`Directory not found: ${path}`);
            return [];
        }
        return Array.from(children);
    }

    async exists(path: string): Promise<boolean> {
        await this.init();
        return this.fileMap.has(path) || this.dirMap.has(path) || path === '/';
    }

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        // Implementation provided by ReadOnlyWrapper
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    async mkdir(path: string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    async unlink(path: string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }
}
