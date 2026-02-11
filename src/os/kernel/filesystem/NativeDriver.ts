/**
 * NativeDriver.ts
 * 
 * Implements IFileSystem for the File System Access API (Local/Native Folder Access).
 * This driver allows the OS to "mount" a real local folder and read/write to it.
 * 
 * Features:
 * - Direct access to native file system handles
 * - Permission management (request/verify)
 * - CRUD operations mapped to FSA API
 */

import { IFileSystem, FileStat } from './IFileSystem'

export class NativeDriver implements IFileSystem {
    private rootHandle: FileSystemDirectoryHandle

    constructor(rootHandle: FileSystemDirectoryHandle) {
        this.rootHandle = rootHandle
    }

    /**
     * Resolves a path string to a handle.
     * Example: "docs/work/resume.pdf" -> FileSystemFileHandle
     */
    private async resolveHandle(path: string, create = false): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
        // Normalize path: remove leading slash and split
        const parts = path.split('/').filter(p => p.length > 0)

        let current: FileSystemDirectoryHandle = this.rootHandle

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            const isLast = i === parts.length - 1

            if (isLast) {
                // If it's the last part, we try to get it as file OR directory
                try {
                    return await current.getDirectoryHandle(part, { create: false })
                } catch {
                    // Not a directory, try get file
                    try {
                        return await current.getFileHandle(part, { create })
                    } catch (e) {
                        // If we are creating a directory, the loop logic needs to know
                        // But getDirectoryHandle with create=true handles that. 
                        // Here we assume "resolveHandle" is mostly for FILES or existing generic nodes.
                        // Special handling for mkdir might use getDirectoryHandle directly.
                        if (create) {
                            // Default to file if we are creating and it's the target
                            return await current.getFileHandle(part, { create: true })
                        }
                        throw e
                    }
                }
            } else {
                // Intermediate parts MUST be directories
                // If create is true, we might want to creating intermediate directories?
                // For simplicity, let's assume standard 'mkdir -p' logic is handled by mkdir, 
                // and this helper expects intermediate dirs to exist unless valid mkdir is called.
                // However, FSA's getDirectoryHandle has {create: boolean}.

                try {
                    current = await current.getDirectoryHandle(part, { create })
                } catch (e) {
                    throw new Error(`Path not found: ${parts.slice(0, i + 1).join('/')}`)
                }
            }
        }

        return this.rootHandle // If path is empty/root
    }

    /**
     * Helper to get parent directory handle and leaf name
     */
    private async getParent(path: string): Promise<{ parent: FileSystemDirectoryHandle, name: string }> {
        const parts = path.split('/').filter(p => p.length > 0)
        if (parts.length === 0) throw new Error('Cannot perform operation on root')

        const name = parts.pop()!
        let current = this.rootHandle

        for (const part of parts) {
            current = await current.getDirectoryHandle(part)
        }

        return { parent: current, name }
    }

    async readFile(path: string): Promise<Uint8Array> {
        const handle = await this.resolveHandle(path) as FileSystemFileHandle
        if (handle.kind !== 'file') throw new Error(`Not a file: ${path}`)

        const file = await handle.getFile()
        const buffer = await file.arrayBuffer()
        return new Uint8Array(buffer)
    }

    async writeFile(path: string, content: Uint8Array | string): Promise<void> {
        // We need to traverse manually to creating intermediate if strict, 
        // but FSA getFileHandle({create: true}) creates the FILE, not folders.
        // We should ensure parent exists.

        const { parent, name } = await this.getParent(path)
        const handle = await parent.getFileHandle(name, { create: true })

        const writable = await handle.createWritable()

        if (typeof content === 'string') {
            await writable.write(content)
        } else {
            // TS Error: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'FileSystemWriteChunkType'.
            // This is a known issue where DOM types for FileSystemWritableFileStream rely on standard ArrayBuffer,
            // but Uint8Array usage might infer SharedArrayBuffer compatibility issues.
            // Casting to any or specific compatible type bypasses this.
            await writable.write(content as any)
        }

        await writable.close()
    }

    async unlink(path: string, recursive = false): Promise<void> {
        const { parent, name } = await this.getParent(path)
        await parent.removeEntry(name, { recursive })
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        // FSA supports 'move' on file handles (Chrome specific for now, specific interfaces)
        // But standard way often is copy + delete or handle.move() if available.
        // Native FSA move() is still experimental/varying support.
        // For broad compatibility, we might need copy+delete if move() isn't there.
        // Chrome 113+ supports move().

        const sourceHandle = await this.resolveHandle(oldPath) as any
        const { parent: destParent, name: destName } = await this.getParent(newPath)

        if (sourceHandle.move) {
            await sourceHandle.move(destParent, destName)
        } else {
            // Fallback: Copy content and delete old (Simple version for files)
            // Implementing full recursive move manually is heavy.
            // We'll throw if not supported for now to signal limitation or implementing copy.
            throw new Error('Rename implementation requires browser support (move())')
        }
    }

    async readdir(path: string): Promise<string[]> {
        const handle = path === '' || path === '/'
            ? this.rootHandle
            : await this.resolveHandle(path) as FileSystemDirectoryHandle

        if (handle.kind !== 'directory') throw new Error(`Not a directory: ${path}`)

        const names: string[] = []

        // TS support for AsyncIterator on FileSystemDirectoryHandle can be spotty
        // use @ts-ignore or explicit loop
        // @ts-ignore
        for await (const [name, entry] of handle.entries()) {
            names.push(name)
        }
        return names
    }

    async mkdir(path: string, recursive = false): Promise<void> {
        // FSA's getDirectoryHandle({ create: true }) is effectively mkdir
        // recursive is implicit if we loop.
        const parts = path.split('/').filter(p => p.length > 0)
        let current = this.rootHandle

        for (const part of parts) {
            // Depending on recursive flag we might want to error if intermediate missing
            // But usually standard mkdir -p logic is desired.
            if (!recursive) {
                // Check existence first if strict? FSA 'create' will just open/create.
            }
            current = await current.getDirectoryHandle(part, { create: true })
        }
    }

    async stat(path: string): Promise<FileStat> {
        const handle = path === '' || path === '/'
            ? this.rootHandle
            : await this.resolveHandle(path)

        if (handle.kind === 'directory') {
            return {
                size: 0,
                mtime: Date.now(), // FSA doesn't give dir mtime easily
                atime: Date.now(),
                ctime: Date.now(),
                isDirectory: true,
                isFile: false
            }
        }

        const fileHandle = handle as FileSystemFileHandle
        const file = await fileHandle.getFile()

        return {
            size: file.size,
            mtime: file.lastModified,
            atime: Date.now(), // Not available
            ctime: Date.now(), // Not available
            isDirectory: false,
            isFile: true
        }
    }

    async exists(path: string): Promise<boolean> {
        try {
            await this.resolveHandle(path)
            return true
        } catch {
            return false
        }
    }

    // --- Native Specific Helpers ---

    /**
     * Checks if we have permission to read/write.
     * Can trigger prompt if needed.
     */
    async verifyPermission(mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        // @ts-ignore - queryPermission missing in standard TS types currently
        return (await this.rootHandle.queryPermission({ mode })) === 'granted'
    }

    async requestPermission(mode: 'read' | 'readwrite' = 'readwrite'): Promise<boolean> {
        // @ts-ignore - requestPermission missing in standard TS types currently
        return (await this.rootHandle.requestPermission({ mode })) === 'granted'
    }
}
