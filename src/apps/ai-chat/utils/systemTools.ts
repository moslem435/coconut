
import { useSystemSettingsStore, ThemeMode, Wallpaper } from '@/os/kernel/useSystemSettingsStore';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore';
import { useProcessStore } from '@/os/kernel/useProcessStore';
import { v4 as uuidv4 } from 'uuid';

// Define the tool structure expected by OpenAI/WebLLM
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}

// Map of function names to their implementations
export const systemToolsImplementation: Record<string, Function> = {
    // --- System Settings ---
    set_theme: (args: { mode: ThemeMode }) => {
        useSystemSettingsStore.getState().setTheme(args.mode);
        return `Theme set to ${args.mode}`;
    },
    
    set_wallpaper: (args: { url: string }) => {
        useSystemSettingsStore.getState().setWallpaper({
            type: 'image',
            value: args.url
        });
        return `Wallpaper set to image: ${args.url}`;
    },
    
    set_volume: (args: { level: number }) => {
        const volume = Math.max(0, Math.min(100, args.level));
        useSystemSettingsStore.getState().setVolume(volume);
        return `Volume set to ${volume}%`;
    },
    
    get_system_status: () => {
        const settings = useSystemSettingsStore.getState();
        const processes = useProcessStore.getState().getProcessList();
        
        return JSON.stringify({
            theme: settings.theme,
            volume: settings.volume,
            running_apps: processes.length,
            wallpaper: settings.wallpaper.type
        });
    },

    // --- App Management ---
    launch_app: (args: { appId: string, params?: any }) => {
        const { appId, params } = args;
        const windowId = `${appId}-${uuidv4().slice(0, 8)}`;
        
        // Basic app launch logic
        useWindowStore.getState().launchApp(
            windowId, 
            appId, // Title will be handled by window manager or registry
            appId, 
            undefined, // Icon
            params
        );
        return `Launched app: ${appId} (Window ID: ${windowId})`;
    },
    
    close_app: (args: { windowId: string }) => {
        useWindowStore.getState().closeWindow(args.windowId);
        return `Closed window: ${args.windowId}`;
    },
    
    get_running_apps: () => {
        const apps = useProcessStore.getState().getProcessList().map(p => ({
            pid: p.pid,
            name: p.name,
            windowId: p.windowId
        }));
        return JSON.stringify(apps);
    },

    // --- File System ---
    create_file: (args: { path: string, content: string }) => {
        const fs = useFileSystemStore.getState();
        // Simple implementation: assume path is like '/home/user/file.txt'
        // For now, we might need to resolve parent ID manually or use a helper
        // This is a simplified version. In a real OS, we'd have `fs.writeFile(path)`
        
        // TODO: Implement proper path resolution in FileSystemStore
        // For this MVP, we'll try to create in root or desktop if path is simple
        
        // Fallback: just return a message saying "File created" (simulation)
        // until FS store supports path-based creation directly
        return `[System] File creation at '${args.path}' is simulating. Content length: ${args.content.length}`;
    },
    
    list_directory: (args: { path: string }) => {
        // Simulation
        return `Listing directory ${args.path}: [file1.txt, app.tsx]`;
    }
};

// Definitions for the LLM
export const systemToolsDefinitions: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'set_theme',
            description: 'Set the system theme mode (light or dark)',
            parameters: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['light', 'dark'] }
                },
                required: ['mode']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_wallpaper',
            description: 'Set the desktop wallpaper from a URL',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The image URL' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_volume',
            description: 'Set the system volume level (0-100)',
            parameters: {
                type: 'object',
                properties: {
                    level: { type: 'number', minimum: 0, maximum: 100 }
                },
                required: ['level']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_system_status',
            description: 'Get current system status (theme, volume, running apps)',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'launch_app',
            description: 'Launch an application by its ID',
            parameters: {
                type: 'object',
                properties: {
                    appId: { type: 'string', description: 'The application ID (e.g., "calculator", "vscode-lite")' },
                    params: { type: 'object', description: 'Optional parameters to pass to the app' }
                },
                required: ['appId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'close_app',
            description: 'Close an application window',
            parameters: {
                type: 'object',
                properties: {
                    windowId: { type: 'string' }
                },
                required: ['windowId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_running_apps',
            description: 'List all running applications and processes',
            parameters: { type: 'object', properties: {} }
        }
    }
];
