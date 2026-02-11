/// <reference lib="webworker" />

/**
 * fs.worker.ts
 * 
 * This worker manages the Origin Private File System (OPFS).
 * It uses the scalable `FileSystemSyncAccessHandle` API which is only available in Workers.
 * 
 * Communication Protocol:
 * Request: { id: string, type: string, path: string, content?: Uint8Array | string, recursive?: boolean }
 * Response: { id: string, result?: any, error?: string }
 */

self.onmessage = async (e: MessageEvent) => {
    const { id, type, path, content, recursive, oldPath, newPath } = e.data;

    try {
        const root = await navigator.storage.getDirectory();
        let result;

        switch (type) {
            case 'readFile': {
                const handle = await getFileHandle(root, path);
                const accessHandle = await handle.createSyncAccessHandle();
                const fileSize = accessHandle.getSize();
                const buffer = new Uint8Array(fileSize);
                accessHandle.read(buffer, { at: 0 });
                accessHandle.close();
                result = buffer;
                break;
            }

            case 'writeFile': {
                const handle = await getFileHandle(root, path, true);
                const accessHandle = await handle.createSyncAccessHandle();

                let data: Uint8Array;
                if (typeof content === 'string') {
                    data = new TextEncoder().encode(content);
                } else {
                    data = content;
                }

                accessHandle.truncate(0);
                accessHandle.write(data, { at: 0 });
                accessHandle.flush();
                accessHandle.close();
                break;
            }

            case 'unlink': {
                await removePath(root, path, recursive);
                break;
            }

            case 'readdir': {
                const dirHandle = await getDirHandle(root, path);
                const entries: string[] = [];
                // @ts-ignore - Iteration over directory handle
                for await (const [name] of dirHandle.entries()) {
                    entries.push(name);
                }
                result = entries;
                break;
            }

            case 'mkdir': {
                await getDirHandle(root, path, true);
                break;
            }

            case 'stat': {
                // Determine if it's a file or directory
                // This is a bit tricky with pure OPFS without traversing everything.
                // We'll try to get it as file first, then directory.
                try {
                    const handle = await getFileHandle(root, path);
                    const file = await handle.getFile();
                    result = {
                        size: file.size,
                        mtime: file.lastModified,
                        atime: file.lastModified,
                        ctime: file.lastModified,
                        isFile: true,
                        isDirectory: false
                    };
                } catch {
                    // Try directory
                    await getDirHandle(root, path);
                    result = {
                        size: 0,
                        mtime: Date.now(),
                        atime: Date.now(),
                        ctime: Date.now(),
                        isFile: false,
                        isDirectory: true
                    };
                }
                break;
            }

            case 'exists': {
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
                // Fallback: Copy + Delete Strategy
                // 1. Check source type
                let sourceHandle: FileSystemHandle;
                let isFile = true;

                // Try to find source
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

                    // Write new
                    const newHandle = await getFileHandle(root, newPath, true);
                    const accessHandle = await newHandle.createSyncAccessHandle();
                    accessHandle.truncate(0);
                    accessHandle.write(new Uint8Array(fileContent), { at: 0 });
                    accessHandle.flush();
                    accessHandle.close();

                    // Delete old
                    await removePath(root, oldPath);
                } else {
                    throw new Error("Directory rename not fully supported in V1");
                }
                break;
            }

            default:
                throw new Error(`Unknown command: ${type}`);
        }

        self.postMessage({ id, result });

    } catch (err: any) {
        self.postMessage({ id, error: err.message || JSON.stringify(err) });
    }
};

// --- Helpers ---

async function getFileHandle(root: FileSystemDirectoryHandle, path: string, create = false): Promise<FileSystemFileHandle> {
    const parts = path.split('/').filter(p => p.length > 0);
    const fileName = parts.pop();

    if (!fileName) throw new Error('Invalid path');

    let dir = root;
    for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create });
    }

    return dir.getFileHandle(fileName, { create });
}

async function getDirHandle(root: FileSystemDirectoryHandle, path: string, create = false): Promise<FileSystemDirectoryHandle> {
    const parts = path.split('/').filter(p => p.length > 0);
    let dir = root;
    for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create });
    }
    return dir;
}

async function removePath(root: FileSystemDirectoryHandle, path: string, recursive = false) {
    const parts = path.split('/').filter(p => p.length > 0);
    const name = parts.pop();

    if (!name) return; // Root?

    let dir = root;
    for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
    }

    await dir.removeEntry(name, { recursive });
}
