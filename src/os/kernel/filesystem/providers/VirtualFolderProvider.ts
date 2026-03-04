/**
 * VirtualFolderProvider
 * 
 * Aggregates multiple file system sources into a single virtual folder.
 * Useful for creating "All Pictures", "All Music" views that combine
 * user files with system resources.
 */

import { IFileSystemProvider, FileStat } from '../IFileSystemProvider';
import { fs } from '../FileSystemClient';
import { FileSystemError } from '../errors/FileSystemError';

interface VirtualSource {
    path: string;
    priority?: number; // Higher priority sources appear first
}

export class VirtualFolderProvider implements IFileSystemProvider {
    name = 'virtual-folder';
    readonly = true; // Virtual folders are read-only aggregations
    private sources: VirtualSource[];

    constructor(sources: VirtualSource[]) {
        this.sources = sources.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    // --- Core Operations ---

    async readdir(path: string): Promise<string[]> {
        const allFiles = new Set<string>();

        for (const source of this.sources) {
            const fullPath = this.joinPath(source.path, path);
            try {
                // If fs.readdir throws (e.g. not found), just ignore for this source
                const files = await fs.readdir(fullPath);
                files.forEach(f => allFiles.add(f));
            } catch (e) {
                // Ignore missing source paths
            }
        }

        return Array.from(allFiles);
    }

    async stat(path: string): Promise<FileStat> {
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

        // Try to find file in sources
        for (const source of this.sources) {
            const fullPath = this.joinPath(source.path, path);
            try {
                // Check if exists and get stats
                // We delegate to main FS which will route to correct provider
                return await fs.stat(fullPath);
            } catch {
                // Continue
            }
        }

        throw FileSystemError.FileNotFound(path);
    }

    async readFile(path: string): Promise<Uint8Array> {
        for (const source of this.sources) {
            const fullPath = this.joinPath(source.path, path);
            try {
                return await fs.readFile(fullPath);
            } catch {
                // Continue
            }
        }
        throw FileSystemError.FileNotFound(path);
    }

    async getFileBlob(path: string): Promise<Blob> {
        for (const source of this.sources) {
            const fullPath = this.joinPath(source.path, path);
            try {
                return await fs.getFileBlob(fullPath);
            } catch {
                // Continue
            }
        }
        throw FileSystemError.FileNotFound(path);
    }

    async exists(path: string): Promise<boolean> {
        for (const source of this.sources) {
            const fullPath = this.joinPath(source.path, path);
            try {
                const exists = await fs.exists(fullPath);
                if (exists) return true;
            } catch {
                // Continue to next source
            }
        }
        return false;
    }

    // Write operations should be handled by ReadOnlyWrapper
    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }
    
    async mkdir(path: string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    async unlink(path: string, recursive?: boolean): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        throw new Error('This should be wrapped by ReadOnlyWrapper');
    }

    // Helper methods
    private joinPath(base: string, sub: string): string {
        const baseNorm = base.endsWith('/') ? base.slice(0, -1) : base;
        const subNorm = sub.startsWith('/') ? sub : '/' + sub;
        return subNorm === '/' ? baseNorm : baseNorm + subNorm;
    }
}
