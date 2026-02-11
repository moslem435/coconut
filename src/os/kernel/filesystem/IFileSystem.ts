/**
 * IFileSystem.ts
 * 
 * Standard Interface for the Kernel's Virtual File System.
 * This abstraction allows us to switch between:
 * - InMemoryDriver (Tests)
 * - IndexedDBDriver (Browser Compatibility)
 * - OPFSDriver (High Performance)
 * - RemoteDriver (Cloud Projection)
 */

export interface FileStat {
    size: number;
    mtime: number;
    atime: number;
    ctime: number;
    isDirectory: boolean;
    isFile: boolean;
}

export interface IFileSystem {
    // --- Core IO Operations ---

    /**
     * Read file content.
     * Returns Uint8Array for binary data, which can be decoded to string if needed.
     */
    readFile(path: string): Promise<Uint8Array>;

    /**
     * Write file content.
     * Overwrites if exists, creates if not.
     */
    writeFile(path: string, content: Uint8Array | string): Promise<void>;

    /**
     * Delete a file or directory.
     * For directories, `recursive` must be true if not empty.
     */
    unlink(path: string, recursive?: boolean): Promise<void>;

    /**
     * Rename or move a file/directory.
     */
    rename(oldPath: string, newPath: string): Promise<void>;

    // --- Directory Operations ---

    /**
     * List files in a directory.
     * Returns an array of filenames (not full paths).
     */
    readdir(path: string): Promise<string[]>;

    /**
     * Create a directory.
     * If `recursive` is true, creates parent directories as needed (mkdir -p).
     */
    mkdir(path: string, recursive?: boolean): Promise<void>;

    // --- Metadata ---

    /**
     * Get file statistics.
     * Throws error if file does not exist.
     */
    stat(path: string): Promise<FileStat>;

    /**
     * Check if a path exists.
     */
    exists(path: string): Promise<boolean>;

    // --- Events (Optional for V1) ---
    // on(event: 'change', callback: (path: string) => void): void;
}
