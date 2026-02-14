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

self.onmessage = async (e: MessageEvent<FileSystemRequest>) => {
    const { id, type, path, content, recursive, oldPath, newPath, currentFiles, fsSnapshot, folderId } = e.data;

    try {
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
                try {
                    const file = await handle.getFile();
                    const buffer = await file.arrayBuffer();
                    result = new Uint8Array(buffer);
                } catch (readError) {
                     const accessHandle = await handle.createSyncAccessHandle();
                     try {
                        const fileSize = accessHandle.getSize();
                        const buffer = new Uint8Array(fileSize);
                        accessHandle.read(buffer, { at: 0 });
                        result = buffer;
                     } finally {
                        accessHandle.close();
                     }
                }
                break;
            }

            case 'getFileBlob': {
                if (!root || !path) throw new Error('Invalid arguments');
                const handle = await getFileHandle(root, path);
                const file = await handle.getFile();
                result = file;
                break;
            }

            case 'writeFile': {
                if (!root || !path) throw new Error('Invalid arguments');
                const handle = await getFileHandle(root, path, true);
                try {
                    const accessHandle = await handle.createSyncAccessHandle();
                    try {
                        let data: Uint8Array;
                        if (typeof content === 'string') {
                            data = new TextEncoder().encode(content);
                        } else {
                            data = content as Uint8Array;
                        }

                        accessHandle.truncate(0);
                        accessHandle.write(data, { at: 0 });
                        accessHandle.flush();
                    } finally {
                        accessHandle.close();
                    }
                } catch (lockError: any) {
                    if (lockError.name === 'NoModificationAllowedError' || lockError.message.includes('Access Handle')) {
                        const writable = await handle.createWritable();
                        try {
                             if (typeof content === 'string') {
                                await writable.write(content);
                            } else {
                                await writable.write(content);
                            }
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
                        await getDirHandle(root, path);
                        result = {
                            size: 0,
                            mtime: Date.now(),
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
                    await getFileHandle(root, path);
                    result = true;
                } catch {
                    try {
                        await getDirHandle(root, path);
                        result = true;
                    } catch {
                        result = false;
                    }
                }
                break;
            }

            case 'rename': {
                if (!root || !oldPath || !newPath) throw new Error('Invalid arguments');
                // Fallback: Copy + Delete Strategy
                let sourceHandle: FileSystemHandle;
                let isFile = true;

                try {
                    sourceHandle = await getFileHandle(root, oldPath);
                } catch {
                    try {
                        sourceHandle = await getDirHandle(root, oldPath);
                        isFile = false;
                    } catch {
                        throw new Error(`Source path not found: ${oldPath}`);
                    }
                }

                if (isFile) {
                    const oldFileHandle = sourceHandle as FileSystemFileHandle;
                    const file = await oldFileHandle.getFile();
                    const fileContent = await file.arrayBuffer();

                    const newHandle = await getFileHandle(root, newPath, true);
                    const accessHandle = await newHandle.createSyncAccessHandle();
                    try {
                        accessHandle.truncate(0);
                        accessHandle.write(new Uint8Array(fileContent), { at: 0 });
                        accessHandle.flush();
                    } finally {
                        accessHandle.close();
                    }
                    await root.removeEntry(oldPath.split('/').pop()!);
                } else {
                    // Recursive directory move not fully implemented in this simple fallback
                    // For now, assume empty or implement recursive copy if needed
                    await getDirHandle(root, newPath, true);
                    await root.removeEntry(oldPath.split('/').pop()!);
                }
                break;
            }

            case 'computeDiff': {
                if (!currentFiles || !fsSnapshot || !folderId) throw new Error('Invalid diff arguments');
                
                const currentMap = new Map(currentFiles.map(f => [f.name, f]));
                const fsMap = new Map(fsSnapshot.map(f => [f.name, f]));
                
                const patch = {
                  toAdd: [] as FileNode[],
                  toRemove: [] as string[],
                  toUpdate: [] as Array<{ id: string; updates: Partial<FileNode> }>
                };
                
                // 1. Remove (in current but not in fs)
                for (const [name, file] of currentMap) {
                  if (!fsMap.has(name)) {
                    patch.toRemove.push(file.id);
                  }
                }
                
                // 2. Add or Update
                for (const [name, fsEntry] of fsMap) {
                  const existing = currentMap.get(name);
                  
                  if (!existing) {
                    // New file
                    patch.toAdd.push({
                      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      parentId: folderId,
                      name,
                      type: fsEntry.isDirectory ? 'folder' : 'file',
                      createdAt: Date.now(),
                      updatedAt: fsEntry.mtime,
                      size: fsEntry.size || 0,
                      isMount: false
                    });
                  } else if (existing.updatedAt !== fsEntry.mtime || existing.size !== fsEntry.size) {
                    // Update file
                    patch.toUpdate.push({
                      id: existing.id,
                      updates: {
                        updatedAt: fsEntry.mtime,
                        size: fsEntry.size
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
};

// --- Helpers ---

async function getFileHandle(root: FileSystemDirectoryHandle, path: string, create = false) {
    const parts = path.split('/').filter(p => p.length > 0);
    const fileName = parts.pop();
    if (!fileName) throw new Error('Invalid file path');

    let current = root;
    for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create });
    }
    return await current.getFileHandle(fileName, { create });
}

async function getDirHandle(root: FileSystemDirectoryHandle, path: string, create = false) {
    const parts = path.split('/').filter(p => p.length > 0);
    let current = root;
    for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create });
    }
    return current;
}

async function removePath(root: FileSystemDirectoryHandle, path: string, recursive = false) {
    const parts = path.split('/').filter(p => p.length > 0);
    const name = parts.pop();
    if (!name) return;

    let current = root;
    for (const part of parts) {
        current = await current.getDirectoryHandle(part);
    }
    await current.removeEntry(name, { recursive });
}
