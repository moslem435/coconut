import { IFileSystemProvider, FileStat } from '../IFileSystemProvider';

/**
 * A wrapper that normalizes paths for any FileSystemProvider.
 * Ensures paths start with '/' and do not end with '/'.
 * Handles relative path resolution ('.', '..').
 */
export class PathNormalizationWrapper implements IFileSystemProvider {
    readonly: boolean;

    constructor(private provider: IFileSystemProvider) {
        this.readonly = provider.readonly;
    }

    get name(): string {
        return this.provider.name;
    }

    /**
     * Normalize path:
     * - Ensure starts with /
     * - Remove trailing /
     * - Resolve . and ..
     * - Collapse multiple slashes
     */
    private normalize(path: string): string {
        if (!path) return '/';

        // Ensure start with /
        const normalized = path.startsWith('/') ? path : '/' + path;

        // Split and process segments
        const parts = normalized.split('/').filter(p => p.length > 0 && p !== '.');
        const stack: string[] = [];

        for (const part of parts) {
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }

        const result = '/' + stack.join('/');
        return result;
    }

    async readFile(path: string): Promise<Uint8Array> {
        return this.provider.readFile(this.normalize(path));
    }

    async getFileBlob(path: string): Promise<Blob> {
        if (this.provider.getFileBlob) {
            return this.provider.getFileBlob(this.normalize(path));
        }
        const content = await this.readFile(path);
        return new Blob([content as any]);
    }

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        return this.provider.writeFile(this.normalize(path), content);
    }

    async unlink(path: string, recursive?: boolean): Promise<void> {
        return this.provider.unlink(this.normalize(path), recursive);
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        return this.provider.rename(this.normalize(oldPath), this.normalize(newPath));
    }

    async readdir(path: string): Promise<string[]> {
        return this.provider.readdir(this.normalize(path));
    }

    async mkdir(path: string, recursive?: boolean): Promise<void> {
        return this.provider.mkdir(this.normalize(path), recursive);
    }

    async stat(path: string): Promise<FileStat> {
        return this.provider.stat(this.normalize(path));
    }

    async exists(path: string): Promise<boolean> {
        return this.provider.exists(this.normalize(path));
    }
}
