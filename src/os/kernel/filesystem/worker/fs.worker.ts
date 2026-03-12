/// <reference lib="webworker" />

/**
 * fs.worker.ts
 * 
 * Unified File System Worker
 * 
 * Responsibilities:
 * 1. IO Operations (Read/Write to OPFS)
 * 2. Diff Computation (Compare file trees)
 * 
 * Communication Protocol:
 * Request: { id: string, type: string, ...payload }
 * Response: { id: string, type: string, result?: any, error?: string }
 */

import type { FileNode } from '../../initialFileTree'

interface FileSystemRequest {
    id: string
    type: 'readFile' | 'getFileBlob' | 'writeFile' | 'unlink' | 'readdir' | 'mkdir' | 'stat' | 'exists' | 'rename' | 'computeDiff'
    path?: string
    content?: Uint8Array | string
    recursive?: boolean
    oldPath?: string
    newPath?: string
    // Diff specific
    currentFiles?: FileNode[]
    fsSnapshot?: Array<{
        name: string
        isDirectory: boolean
        mtime: number
        size?: number
    }>
    folderId?: string
}

// Global serial execution chain for OPFS operations
// This prevents physical race conditions in the browser's handle indexing
let operationChain = Promise.resolve();
let lastCacheWriteLogAt = 0;

self.onmessage = (e: MessageEvent<FileSystemRequest>) => {
    const { id, type } = e.data;

    // Queue every request into the serial chain
    operationChain = operationChain.then(async () => {
        try {
            const { path, content, recursive, oldPath, newPath, currentFiles, fsSnapshot, folderId } = e.data;

            // Initialize Root for IO operations
            let root: FileSystemDirectoryHandle | null = null;
            if (type !== 'computeDiff') {
                root = await navigator.storage.getDirectory();
            }

            let result;

            switch (type) {
                case 'readFile': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    const handle = await getFileHandle(root, path);

                    if (!handle) throw new Error(`File not found: ${path}`);

                    try {
                        const file = await handle.getFile();
                        const buffer = await file.arrayBuffer();
                        result = new Uint8Array(buffer);
                    } catch (readError) {
                        // Fallback to sync access handle if getFile fails (e.g. locked file)
                        if ('createSyncAccessHandle' in handle) {
                            try {
                                const accessHandle = await handle.createSyncAccessHandle();
                                try {
                                    const fileSize = accessHandle.getSize();
                                    const buffer = new Uint8Array(fileSize);
                                    accessHandle.read(buffer, { at: 0 });
                                    result = buffer;
                                } finally {
                                    accessHandle.close();
                                }
                            } catch (innerE) {
                                throw readError;
                            }
                        } else {
                            throw readError;
                        }
                    }
                    break;
                }

                case 'getFileBlob': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    const handle = await getFileHandle(root, path);
                    if (!handle) throw new Error(`File not found: ${path}`);
                    const file = await handle.getFile();
                    result = file;
                    break;
                }

                case 'writeFile': {
                    if (!root || !path) throw new Error('Invalid arguments');

                    // Ensure parent directories exist
                    const parts = path.split('/').filter(p => p.length > 0);
                    const fileName = parts.pop();
                    if (!fileName) throw new Error('Invalid file path');

                    let current: FileSystemDirectoryHandle | null;
                    try {
                        // Re-use logic for recursive directory creation
                        current = await getDirHandle(root, parts.join('/'), true);
                        if (!current) throw new Error('Directory creation failed');
                    } catch (e) {
                        throw new Error(`Failed to ensure parent directory for ${path}: ${e}`);
                    }

                    const handle = await current.getFileHandle(fileName, { create: true });

                    try {
                        const accessHandle = await handle.createSyncAccessHandle();
                        try {
                            let data: Uint8Array;
                            if (typeof content === 'string') {
                                data = new TextEncoder().encode(content);
                            } else {
                                data = content as Uint8Array;
                            }

                            const isCachePath = path.startsWith('/home/user/.cache/deps/') || path.startsWith('/home/user/.cache/npm/')
                            const now = Date.now()
                            if (!isCachePath || now - lastCacheWriteLogAt > 2000) {
                                if (isCachePath) lastCacheWriteLogAt = now
                                console.log(`[FS Worker] SyncWrite: ${path}, size: ${data.length}`);
                            }
                            accessHandle.truncate(0);
                            accessHandle.write(data, { at: 0 });
                            accessHandle.flush();
                        } finally {
                            accessHandle.close();
                        }
                    } catch (lockError: any) {
                        const isCachePath = path.startsWith('/home/user/.cache/deps/') || path.startsWith('/home/user/.cache/npm/')
                        if (!isCachePath) {
                            console.warn(`[FS Worker] SyncWrite failed for ${path}, falling back to Writable:`, lockError.name || lockError.message);
                        }
                        if (lockError.name === 'NoModificationAllowedError' || lockError.message.includes('Access Handle')) {
                            const writable = await handle.createWritable();
                            try {
                                if (typeof content === 'string') {
                                    await writable.write(content as any);
                                } else {
                                    await writable.write(content as any);
                                }
                                console.log(`[FS Worker] Writable stream fallback success: ${path}`);
                            } finally {
                                await writable.close();
                            }
                        } else {
                            throw lockError;
                        }
                    }
                    break;
                }

                case 'unlink': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    await removePath(root, path, recursive);
                    break;
                }

                case 'readdir': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    const dirHandle = await getDirHandle(root, path);
                    const entries: string[] = [];
                    // @ts-ignore
                    for await (const [name] of dirHandle.entries()) {
                        entries.push(name);
                    }
                    result = entries;
                    break;
                }

                case 'mkdir': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    await getDirHandle(root, path, true);
                    break;
                }

                case 'stat': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    try {
                        const handle = await getFileHandle(root, path);
                        if (!handle) throw new Error('Not found');
                        const file = await handle.getFile();
                        result = {
                            size: file.size,
                            mtime: file.lastModified,
                            atime: Date.now(),
                            ctime: Date.now(),
                            isDirectory: false,
                            isFile: true,
                            mimeType: file.type || undefined
                        };
                    } catch {
                        try {
                            const dirHandle = await getDirHandle(root, path);
                            if (!dirHandle) throw new Error('Not found');
                            result = {
                                size: 0,
                                mtime: Date.now(), // Directories don't have standard mtime in OPFS
                                atime: Date.now(),
                                ctime: Date.now(),
                                isDirectory: true,
                                isFile: false
                            };
                        } catch {
                            throw new Error(`File not found: ${path}`);
                        }
                    }
                    break;
                }

                case 'exists': {
                    if (!root || !path) throw new Error('Invalid arguments');
                    try {
                        const fileHandle = await getFileHandle(root, path);
                        if (!fileHandle) throw new Error('Not found');
                        result = true;
                    } catch {
                        try {
                            const dirHandle = await getDirHandle(root, path);
                            if (!dirHandle) throw new Error('Not found');
                            result = true;
                        } catch {
                            result = false;
                        }
                    }
                    break;
                }

                case 'rename': {
                    // Ensure arguments
                    const actualOldPath = oldPath || path; // Handle inconsistent API (path vs oldPath)
                    const actualNewPath = newPath;

                    if (!root || !actualOldPath || !actualNewPath) throw new Error('Invalid arguments for rename');

                    // Fallback: Copy + Delete Strategy
                    let sourceHandle: FileSystemHandle | undefined;
                    let isFile = true;

                    try {
                        sourceHandle = await getFileHandle(root, actualOldPath) || undefined;
                    } catch {
                        try {
                            sourceHandle = await getDirHandle(root, actualOldPath) || undefined;
                            isFile = false;
                        } catch {
                            // Source doesn't exist - this can happen when moving a file that was never synced to OPFS
                            console.log(`[OPFS Worker] Rename skipped: source not found: ${actualOldPath}`);
                            break; // Exit gracefully instead of throwing
                        }
                    }

                    if (!sourceHandle) {
                        console.log(`[OPFS Worker] Rename skipped: source handle not found: ${actualOldPath}`);
                        break; // Exit gracefully
                    }

                    if (isFile) {
                        const oldFileHandle = sourceHandle as FileSystemFileHandle;
                        const file = await oldFileHandle.getFile();
                        const fileContent = await file.arrayBuffer();

                        // Create new file
                        const parts = actualNewPath.split('/').filter(p => p.length > 0);
                        const fileName = parts.pop();
                        if (!fileName) throw new Error('Invalid new file path');

                        let current = root;
                        for (const part of parts) {
                            current = await current.getDirectoryHandle(part, { create: true });
                        }
                        const newHandle = await current.getFileHandle(fileName, { create: true });

                        const accessHandle = await newHandle.createSyncAccessHandle();
                        try {
                            accessHandle.truncate(0);
                            accessHandle.write(new Uint8Array(fileContent), { at: 0 });
                            accessHandle.flush();
                        } finally {
                            accessHandle.close();
                        }

                        // Remove old file
                        await removePath(root, actualOldPath);
                    } else {
                        // Rename directory (Recursive Move)
                        await moveDirectory(root, actualOldPath, actualNewPath);
                    }
                    break;
                }

                case 'computeDiff': {
                    if (!currentFiles || !fsSnapshot || !folderId) throw new Error('Invalid diff arguments');

                    const currentMap = new Map(currentFiles.map(f => [f.name, f]));
                    const fsMap = new Map(fsSnapshot.map(f => [f.name, f]));

                    const patch = {
                        toAdd: [] as any[],
                        toRemove: [] as string[],
                        toUpdate: [] as Array<{ id: string; updates: Partial<FileNode> }>
                    };

                    // 1. Remove (in current but not in fs)
                    for (const [name, file] of currentMap) {
                        // Skip system/mount points which are not physical files in OPFS
                        if (file.isMount || file.isSystem) continue;

                        if (!fsMap.has(name)) {
                            patch.toRemove.push(file.id);
                        }
                    }

                    // 2. Add or Update
                    for (const [name, fsEntry] of fsMap) {
                        const existing = currentMap.get(name);
                        const nextSize = fsEntry.isDirectory ? undefined : fsEntry.size;

                        if (!existing) {
                            // New file
                            patch.toAdd.push({
                                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                parentId: folderId,
                                name,
                                type: fsEntry.isDirectory ? 'folder' : 'file',
                                createdAt: Date.now(),
                                updatedAt: fsEntry.mtime,
                                size: nextSize,
                                isMount: false
                            });
                        } else if (existing.updatedAt !== fsEntry.mtime || existing.size !== nextSize) {
                            // Update file
                            patch.toUpdate.push({
                                id: existing.id,
                                updates: {
                                    updatedAt: fsEntry.mtime,
                                    size: nextSize
                                }
                            });
                        }
                    }

                    result = patch;
                    break;
                }
            }

            self.postMessage({ id, type, result });
        } catch (error: any) {
            self.postMessage({ id, type, error: error.message });
        }
    }).catch(internalError => {
        // This should theoretically not be hit as catch inside then handles switch case errors,
        // but acts as a safety against unforeseen async dispatch failures.
        console.error('[FS Worker] Fatal chain error:', internalError);
        self.postMessage({ id, type: 'error', error: 'Internal operation chain failure' });
    });
};

// --- Helpers ---

const getDirHandle = async (current: FileSystemDirectoryHandle, path: string, create: boolean = false): Promise<FileSystemDirectoryHandle | null> => {
    if (!path) return current

    const parts = path.split('/').filter(p => p.length > 0)

    for (const part of parts) {
        let retries = 3;
        while (retries > 0) {
            try {
                current = await current.getDirectoryHandle(part, { create })
                break;
            } catch (e: any) {
                if (e.name === 'NotFoundError' && create) {
                    // If creating, retry in case of race condition
                    retries--;
                    if (retries === 0) throw e;
                    await new Promise(r => setTimeout(r, 50));
                } else if (!create && e.name === 'NotFoundError') {
                    // Return null instead of throwing if not creating
                    return null;
                } else {
                    throw e;
                }
            }
        }
    }
    return current
}

const getFileHandle = async (current: FileSystemDirectoryHandle, path: string, create: boolean = false): Promise<FileSystemFileHandle | null> => {
    const parts = path.split('/').filter(p => p.length > 0)
    const fileName = parts.pop()

    if (!fileName) throw new Error('File name missing')

    if (parts.length > 0) {
        const dir = await getDirHandle(current, parts.join('/'), create)
        if (!dir) return null; // Directory not found
        current = dir;
    }

    try {
        return await current.getFileHandle(fileName, { create })
    } catch (e: any) {
        if (!create && e.name === 'NotFoundError') {
            return null;
        }
        throw e;
    }
}

async function moveDirectory(root: FileSystemDirectoryHandle, oldPath: string, newPath: string) {
    // 1. Create new directory
    await getDirHandle(root, newPath, true);

    // 2. Get old directory handle
    const oldDir = await getDirHandle(root, oldPath);

    // 3. Iterate and move children
    // @ts-ignore
    for await (const [name, handle] of oldDir.entries()) {
        const childOldPath = `${oldPath}/${name}`;
        const childNewPath = `${newPath}/${name}`;

        if (handle.kind === 'file') {
            // Move file (Copy + Delete)
            const file = await (handle as FileSystemFileHandle).getFile();
            const buffer = await file.arrayBuffer();

            // Write to new location
            const parts = childNewPath.split('/').filter(p => p.length > 0);
            const fileName = parts.pop()!;
            let current = root;
            for (const part of parts) {
                current = await current.getDirectoryHandle(part, { create: true });
            }
            const newFileHandle = await current.getFileHandle(fileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(buffer);
            await writable.close();

            // Delete old file
            await removePath(root, childOldPath);
        } else {
            // Recursive move directory
            await moveDirectory(root, childOldPath, childNewPath);
        }
    }

    // 4. Remove old empty directory
    await removePath(root, oldPath);
}

async function removePath(root: FileSystemDirectoryHandle, path: string, recursive = false) {
    const parts = path.split('/').filter(p => p.length > 0);
    const name = parts.pop();
    if (!name) return;

    let current = root;
    for (const part of parts) {
        try {
            current = await current.getDirectoryHandle(part);
        } catch {
            // Parent directory not found in OPFS — nothing to delete physically
            return;
        }
    }

    try {
        await current.removeEntry(name, { recursive });
    } catch (e: any) {
        // NotFoundError: already gone — treat as success
        if (e.name === 'NotFoundError') return;

        // NotAllowedError / NoModificationAllowedError: 
        // File is locked by an active SyncAccessHandle, is read-only, or browsing context restriction.
        // Memory state is already updated. Warn and skip rather than throwing to avoid UI crash.
        const errorNames = ['NotAllowedError', 'NoModificationAllowedError', 'InvalidModificationError'];
        if (errorNames.includes(e.name)) {
            console.warn(`[OPFS] removePath: cannot remove "${path}" (${e.name}), skipping physical delete. It may persist after refresh.`);
            return;
        }

        // For other errors, try once more without recursive flag (simple entry fallback)
        try {
            await current.removeEntry(name);
        } catch (retryError: any) {
            const retryErrorNames = ['NotFoundError', 'NotAllowedError', 'NoModificationAllowedError'];
            if (retryErrorNames.includes(retryError.name)) return;
            throw e; // Re-throw original unexpected error
        }
    }
}
