export type FileType = 'file' | 'folder'

export interface FileNode {
    id: string
    parentId: string | null
    name: string
    type: FileType
    // content?: string // REMOVED: Content is now only in OPFS
    appId?: string // For shortcuts
    createdAt: number
    updatedAt: number
    originalParentId?: string | null // For trash restoration
    icon?: string // Custom icon (e.g. for mounted drives)
    isMount?: boolean
    needsPermission?: boolean
    size?: number
}

export const INITIAL_ROOT_ID = 'root'

export const FILESYSTEM_VERSION = 2; // Increment this to force re-sync

export const INITIAL_FILES: Record<string, FileNode> = {
    [INITIAL_ROOT_ID]: {
        id: INITIAL_ROOT_ID,
        parentId: null,
        name: 'Root',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'trash': {
        id: 'trash',
        parentId: INITIAL_ROOT_ID,
        name: 'Trash',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'desktop': {
        id: 'desktop',
        parentId: INITIAL_ROOT_ID,
        name: 'Desktop',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'documents': {
        id: 'documents',
        parentId: INITIAL_ROOT_ID,
        name: 'Documents',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'pictures': {
        id: 'pictures',
        parentId: INITIAL_ROOT_ID,
        name: 'Pictures',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'abstract-01': {
        id: 'abstract-01',
        parentId: 'pictures',
        name: 'Abstract_01.jpg',
        type: 'file',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        size: 1024 * 500 // Simulated size
    },
    'downloads': {
        id: 'downloads',
        parentId: INITIAL_ROOT_ID,
        name: 'Downloads',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Shortcuts
    'shortcut-portfolio': {
        id: 'shortcut-portfolio',
        parentId: 'desktop',
        name: 'Portfolio Hub',
        type: 'file',
        appId: 'portfolio-hub',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-settings': {
        id: 'shortcut-settings',
        parentId: 'desktop',
        name: 'Settings',
        type: 'file',
        appId: 'settings',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-files': {
        id: 'shortcut-files',
        parentId: 'desktop',
        name: 'File Explorer',
        type: 'file',
        appId: 'file-explorer',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-terminal': {
        id: 'shortcut-terminal',
        parentId: 'desktop',
        name: 'Terminal',
        type: 'file',
        appId: 'terminal',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-notepad': {
        id: 'shortcut-notepad',
        parentId: 'desktop',
        name: 'Notepad',
        type: 'file',
        appId: 'notepad',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-recycle-bin': {
        id: 'shortcut-recycle-bin',
        parentId: 'desktop',
        name: 'Recycle Bin',
        type: 'file',
        appId: 'recycle-bin',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-gallery': {
        id: 'shortcut-gallery',
        parentId: 'desktop',
        name: 'Gallery',
        type: 'file',
        appId: 'photo-gallery',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-music': {
        id: 'shortcut-music',
        parentId: 'desktop',
        name: 'Music Player',
        type: 'file',
        appId: 'music-player',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-vscode': {
        id: 'shortcut-vscode',
        parentId: 'desktop',
        name: 'VS Code',
        type: 'file',
        appId: 'vscode-lite',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-taskmanager': {
        id: 'shortcut-taskmanager',
        parentId: 'desktop',
        name: 'Task Manager',
        type: 'file',
        appId: 'task-manager',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-weather': {
        id: 'shortcut-weather',
        parentId: 'desktop',
        name: 'Weather',
        type: 'file',
        appId: 'weather',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-sandbox-test': {
        id: 'shortcut-sandbox-test',
        parentId: 'desktop',
        name: 'Sandbox Test',
        type: 'file',
        appId: 'sandbox-test',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Folders
    'music': {
        id: 'music',
        parentId: INITIAL_ROOT_ID,
        name: 'Music',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'code': {
        id: 'code',
        parentId: INITIAL_ROOT_ID,
        name: 'Code',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Code Files
    'code-1': {
        id: 'code-1',
        parentId: 'code',
        name: 'hello_world.ts',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'code-2': {
        id: 'code-2',
        parentId: 'code',
        name: 'component.tsx',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Images
    'img-1': {
        id: 'img-1',
        parentId: 'pictures',
        name: 'Abstract_01.jpg',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'img-2': {
        id: 'img-2',
        parentId: 'pictures',
        name: 'Cyber_City.jpg',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'img-3': {
        id: 'img-3',
        parentId: 'pictures',
        name: 'Workspace.jpg',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Files
    'welcome-txt': {
        id: 'welcome-txt',
        parentId: 'desktop',
        name: 'Welcome.txt',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'about-md': {
        id: 'about-md',
        parentId: 'documents',
        name: 'About.md',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
}
