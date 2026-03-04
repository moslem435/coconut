import { IFileSystemProvider, FileStat } from '../IFileSystemProvider';
import { FileSystemError } from '../errors/FileSystemError';

/**
 * A wrapper that enforces read-only access on any FileSystemProvider.
 * All write operations will throw an error.
 */
export class ReadOnlyWrapper implements IFileSystemProvider {
    readonly = true;

    constructor(private provider: IFileSystemProvider) {}

    get name(): string {
        return this.provider.name;
    }

    // --- Write Operations (Blocked) ---

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        throw FileSystemError.ReadOnly(this.name);
    }

    async mkdir(path: string, recursive?: boolean): Promise<void> {
        throw FileSystemError.ReadOnly(this.name);
    }

    async unlink(path: string, recursive?: boolean): Promise<void> {
        throw FileSystemError.ReadOnly(this.name);
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        throw FileSystemError.ReadOnly(this.name);
    }

    // --- Read Operations (Forwarded) ---

    async readFile(path: string): Promise<Uint8Array> {
        return this.provider.readFile(path);
    }

    async getFileBlob(path: string): Promise<Blob> {
        if (this.provider.getFileBlob) {
            return this.provider.getFileBlob(path);
        }
        // Fallback if underlying provider doesn't support blobs
        const content = await this.provider.readFile(path);
        return new Blob([content]);
    }

    async readdir(path: string): Promise<string[]> {
        return this.provider.readdir(path);
    }

    async stat(path: string): Promise<FileStat> {
        return this.provider.stat(path);
    }

    async exists(path: string): Promise<boolean> {
        return this.provider.exists(path);
    }
}
