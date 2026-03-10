import { FILE_IDS } from '../config/paths'

export type FileType = 'file' | 'folder'

export interface AppBundleConfig {
    icon?: string;
    window?: {
        width?: number;
        height?: number;
        title?: string;
    };
    type?: 'web-app' | 'native-app';
    entry?: string;
}

export interface FileNode {
    id: string
    parentId: string | null
    name: string
    type: FileType
    content?: string // Restored for optimistic writes and small files
    appId?: string // For shortcuts
    createdAt: number
    updatedAt: number
    originalParentId?: string | null // For trash restoration
    icon?: string // Custom icon (e.g. for mounted drives)
    isMount?: boolean
    needsPermission?: boolean
    size?: number
    isSystem?: boolean // System folder/file, cannot be deleted or moved
    isReadOnly?: boolean // Read-only folder/file, cannot be modified
    
    // Phase 1: Metadata for App Bundle
    isAppBundle?: boolean;
    appConfig?: AppBundleConfig;
}

export const INITIAL_ROOT_ID = FILE_IDS.ROOT
export const INITIAL_HOME_ID = FILE_IDS.HOME
export const INITIAL_USER_ID = FILE_IDS.USER

export const FILESYSTEM_VERSION = 12; // Increment this to force re-sync

export const INITIAL_FILES: Record<string, FileNode> = {
    [INITIAL_ROOT_ID]: {
        id: INITIAL_ROOT_ID,
        parentId: null,
        name: 'Root',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [INITIAL_HOME_ID]: {
        id: INITIAL_HOME_ID,
        parentId: INITIAL_ROOT_ID,
        name: 'home',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [INITIAL_USER_ID]: {
        id: INITIAL_USER_ID,
        parentId: INITIAL_HOME_ID,
        name: 'user', // Default user
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [FILE_IDS.TRASH]: {
        id: FILE_IDS.TRASH,
        parentId: INITIAL_ROOT_ID,
        name: 'Trash',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [FILE_IDS.DESKTOP]: {
        id: FILE_IDS.DESKTOP,
        parentId: INITIAL_USER_ID,
        name: 'Desktop',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [FILE_IDS.DOCUMENTS]: {
        id: FILE_IDS.DOCUMENTS,
        parentId: INITIAL_USER_ID,
        name: 'Documents',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [FILE_IDS.PICTURES]: {
        id: FILE_IDS.PICTURES,
        parentId: INITIAL_USER_ID,
        name: 'Pictures',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    // Removed gallery-* files as they are now mounted via StaticHttpProvider at /rom
    [FILE_IDS.DOWNLOADS]: {
        id: FILE_IDS.DOWNLOADS,
        parentId: INITIAL_USER_ID,
        name: 'Downloads',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    // Shortcuts
    'shortcut-portfolio': {
        id: 'shortcut-portfolio',
        parentId: FILE_IDS.DESKTOP,
        name: 'Portfolio Hub',
        type: 'file',
        appId: 'portfolio-hub',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-settings': {
        id: 'shortcut-settings',
        parentId: FILE_IDS.DESKTOP,
        name: 'Settings',
        type: 'file',
        appId: 'settings',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-emulator': {
        id: 'shortcut-emulator',
        parentId: FILE_IDS.DESKTOP,
        name: 'Retro PC',
        type: 'file',
        appId: 'emulator',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-files': {
        id: 'shortcut-files',
        parentId: FILE_IDS.DESKTOP,
        name: 'File Explorer',
        type: 'file',
        appId: 'file-explorer',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-terminal': {
        id: 'shortcut-terminal',
        parentId: FILE_IDS.DESKTOP,
        name: 'Terminal',
        type: 'file',
        appId: 'terminal',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-notepad': {
        id: 'shortcut-notepad',
        parentId: FILE_IDS.DESKTOP,
        name: 'Notepad',
        type: 'file',
        appId: 'notepad',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-recycle-bin': {
        id: 'shortcut-recycle-bin',
        parentId: FILE_IDS.DESKTOP,
        name: 'Recycle Bin',
        type: 'file',
        appId: 'recycle-bin',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-gallery': {
        id: 'shortcut-gallery',
        parentId: FILE_IDS.DESKTOP,
        name: 'Gallery',
        type: 'file',
        appId: 'photo-gallery',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-music': {
        id: 'shortcut-music',
        parentId: FILE_IDS.DESKTOP,
        name: 'Music Player',
        type: 'file',
        appId: 'music-player',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-vscode': {
        id: 'shortcut-vscode',
        parentId: FILE_IDS.DESKTOP,
        name: 'VS Code',
        type: 'file',
        appId: 'vscode-lite',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-taskmanager': {
        id: 'shortcut-taskmanager',
        parentId: FILE_IDS.DESKTOP,
        name: 'Task Manager',
        type: 'file',
        appId: 'task-manager',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-weather': {
        id: 'shortcut-weather',
        parentId: FILE_IDS.DESKTOP,
        name: 'Weather',
        type: 'file',
        appId: 'weather',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-sandbox-test': {
        id: 'shortcut-sandbox-test',
        parentId: FILE_IDS.DESKTOP,
        name: 'Sandbox Test',
        type: 'file',
        appId: 'sandbox-test',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-ai-chat': {
        id: 'shortcut-ai-chat',
        parentId: FILE_IDS.DESKTOP,
        name: 'AI Assistant',
        type: 'file',
        appId: 'ai-chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'shortcut-yume': {
        id: 'shortcut-yume',
        parentId: FILE_IDS.DESKTOP,
        name: 'Yume',
        type: 'file',
        appId: 'yume',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Folders
    [FILE_IDS.MUSIC]: {
        id: FILE_IDS.MUSIC,
        parentId: INITIAL_USER_ID,
        name: 'Music',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    [FILE_IDS.CODE]: {
        id: FILE_IDS.CODE,
        parentId: INITIAL_USER_ID,
        name: 'Code',
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSystem: true
    },
    // Sample Code Files
    'code-1': {
        id: 'code-1',
        parentId: FILE_IDS.CODE,
        name: 'hello_world.ts',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'code-2': {
        id: 'code-2',
        parentId: FILE_IDS.CODE,
        name: 'component.tsx',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    // Sample Files
    'welcome-txt': {
        id: 'welcome-txt',
        parentId: FILE_IDS.DESKTOP,
        name: 'Welcome.txt',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    'about-md': {
        id: 'about-md',
        parentId: FILE_IDS.DOCUMENTS,
        name: 'About.md',
        type: 'file',
        // content removed
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
}
