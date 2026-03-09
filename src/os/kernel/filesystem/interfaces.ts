
export interface FileStats {
    size: number;
    mtime: number;
    atime: number;
    ctime: number;
    isDirectory: boolean;
    isFile: boolean;
    mimeType?: string;
}

export interface FileSystemProvider {
    /**
     * Unique identifier for the provider (e.g. 'opfs', 'static-http')
     */
    name: string;

    /**
     * Whether the file system is read-only
     */
    readonly: boolean;

    /**
     * Get file or directory statistics
     */
    stat(path: string): Promise<FileStats>;

    /**
     * Read file content
     */
    readFile(path: string): Promise<Uint8Array>;

    /**
     * Write file content
     */
    writeFile(path: string, content: Uint8Array | string): Promise<void>;

    /**
     * Read directory entries
     */
    readdir(path: string): Promise<string[]>;

    /**
     * Create a directory
     */
    mkdir(path: string): Promise<void>;

    /**
     * Delete a file or directory
     */
    unlink(path: string, recursive?: boolean): Promise<void>;

    /**
     * Rename/Move a file or directory
     */
    rename(oldPath: string, newPath: string): Promise<void>;

    /**
     * Check if a path exists
     */
    exists(path: string): Promise<boolean>;
}
