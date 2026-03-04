
export enum FileSystemErrorType {
    FileNotFound = 'FILE_NOT_FOUND',
    DirectoryNotFound = 'DIRECTORY_NOT_FOUND',
    AlreadyExists = 'ALREADY_EXISTS',
    PermissionDenied = 'PERMISSION_DENIED',
    ReadOnly = 'READ_ONLY',
    NotADirectory = 'NOT_A_DIRECTORY',
    NotAFile = 'NOT_A_FILE',
    InvalidOperation = 'INVALID_OPERATION',
    Unknown = 'UNKNOWN'
}

export class FileSystemError extends Error {
    constructor(
        public type: FileSystemErrorType,
        message?: string,
        public originalError?: unknown
    ) {
        super(message || type);
        this.name = 'FileSystemError';
    }

    static FileNotFound(path: string) {
        return new FileSystemError(FileSystemErrorType.FileNotFound, `File not found: ${path}`);
    }

    static DirectoryNotFound(path: string) {
        return new FileSystemError(FileSystemErrorType.DirectoryNotFound, `Directory not found: ${path}`);
    }

    static AlreadyExists(path: string) {
        return new FileSystemError(FileSystemErrorType.AlreadyExists, `File or directory already exists: ${path}`);
    }

    static PermissionDenied(path: string) {
        return new FileSystemError(FileSystemErrorType.PermissionDenied, `Permission denied: ${path}`);
    }

    static ReadOnly(fsName: string) {
        return new FileSystemError(FileSystemErrorType.ReadOnly, `Read-only file system: ${fsName}`);
    }

    static NotADirectory(path: string) {
        return new FileSystemError(FileSystemErrorType.NotADirectory, `Not a directory: ${path}`);
    }

    static NotAFile(path: string) {
        return new FileSystemError(FileSystemErrorType.NotAFile, `Not a file: ${path}`);
    }
}
