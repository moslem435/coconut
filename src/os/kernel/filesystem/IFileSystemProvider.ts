
export interface FileStat {
    size: number;
    mtime: number;
    atime: number;
    ctime: number;
    isDirectory: boolean;
    isFile: boolean;
    mimeType?: string;
}

export interface IFileSystemProvider {
    /**
     * Unique identifier for the provider (e.g. 'opfs', 'static-http')
     */
    name: string;

    /**
     * Whether the file system is read-only
     */
    readonly: boolean;

    /**
     * Read file content.
     * Returns Uint8Array for binary data.
     */
    readFile(path: string): Promise<Uint8Array>;

    /**
     * Get file as Blob (for large files, streaming).
     */
    getFileBlob?(path: string): Promise<Blob>;

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

    /**
     * List files in a directory.
     * Returns an array of filenames (not full paths).
     */
    readdir(path: string): Promise<string[]>;

    /**
     * Create a directory.
     * If `recursive` is true, creates parent directories as needed.
     */
    mkdir(path: string, recursive?: boolean): Promise<void>;

    /**
     * Get file statistics.
     * Throws error if file does not exist.
     */
    stat(path: string): Promise<FileStat>;

    /**
     * Check if a path exists.
     */
    exists(path: string): Promise<boolean>;
}
