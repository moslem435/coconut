
import { System, ThemeMode } from '@/os/sdk';
import { SYSTEM_PATHS } from '@/os/config/paths';

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
        System.settings.setTheme(args.mode);
        return `Theme set to ${args.mode}`;
    },

    set_wallpaper: (args: { url: string }) => {
        System.settings.setWallpaper(args.url);
        return `Wallpaper set to image: ${args.url}`;
    },

    set_volume: (args: { level: number }) => {
        const volume = Math.max(0, Math.min(100, args.level));
        System.settings.setVolume(volume);
        return `Volume set to ${volume}%`;
    },

    get_system_status: () => {
        const settings = System.settings.getSettings();
        const processes = System.process.list();

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
        const windowId = System.process.launch(appId, params);
        return `Launched app: ${appId} (Window ID: ${windowId})`;
    },

    close_app: (args: { windowId: string }) => {
        System.window.close(args.windowId);
        return `Closed window: ${args.windowId}`;
    },

    get_running_apps: () => {
        const apps = System.process.list().map(p => ({
            pid: p.pid,
            name: p.name,
            windowId: p.windowId
        }));
        return JSON.stringify(apps);
    },

    // --- File System ---
    create_directory: async (args: { path: string }) => {
        try {
            await System.fs.createDirectory(args.path);
            return `Directory created at '${args.path}'`;
        } catch (e: any) {
            // If error is "Path exists but is not a directory", it's an error.
            // If it already exists as a folder, System.fs.createDirectory returns the id, so no error thrown usually?
            // Let's check System.fs implementation: it throws "Path exists but is not a directory".
            // If it is a folder, it returns node.id.
            // So we are good.
            return `Error creating directory: ${e.message || e}`;
        }
    },

    create_file: async (args: { path: string, content: string }) => {
        try {
            // console.log(`[SystemTools] create_file: writing to '${args.path}', length: ${args.content?.length}`);
            if (!args.content) {
                console.warn(`[SystemTools] create_file: Warning - content is empty for '${args.path}'`);
            }
            await System.fs.writeFile(args.path, args.content);

            // Verify write
            // const readBack = await System.fs.readFile(args.path);
            // if (readBack !== args.content) {
            //     console.error(`[SystemTools] create_file: Verification failed for '${args.path}'. Expected len ${args.content.length}, got ${readBack.length}`);
            // } else {
            //     console.log(`[SystemTools] create_file: Verification success for '${args.path}'`);
            // }

            return `File created at '${args.path}'`;
        } catch (e: any) {
            console.error(`[SystemTools] create_file error:`, e);
            return `Error creating file: ${e.message || e}`;
        }
    },

    list_directory: (args: { path: string }) => {
        try {
            const files = System.fs.readDir(args.path);
            return JSON.stringify(files.map(f => f.name));
        } catch (e) {
            return `Error listing directory: ${e}`;
        }
    },

    read_file: async (args: { path: string }) => {
        try {
            const content = await System.fs.readFile(args.path);
            return content;
        } catch (e: any) {
            return `Error reading file: ${e.message || e}`;
        }
    },

    update_file: async (args: { path: string; content: string }) => {
        try {
            await System.fs.writeFile(args.path, args.content);
            return `File updated at '${args.path}'`;
        } catch (e: any) {
            return `Error updating file: ${e.message || e}`;
        }
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
                    appId: {
                        type: 'string',
                        description: 'The application ID. Available apps: "vscode-lite" (Code Editor), "terminal" (Terminal), "file-explorer" (Files), "settings" (Settings), "portfolio-hub" (Portfolio), "notepad" (Text Editor), "music-player" (Music), "photo-gallery" (Photos), "weather" (Weather), "task-manager" (Task Manager), "ai-chat" (AI Assistant), "code-runner" (Code Runner), "yume" (Dream Log), "emulator" (Game Emulator).'
                    },
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
    },
    {
        type: 'function',
        function: {
            name: 'create_directory',
            description: 'Create a new directory (folder) in the file system',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: `The directory path (e.g. "${SYSTEM_PATHS.DESKTOP}/MyApp")` }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_file',
            description: 'Create a file in the file system',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path' },
                    content: { type: 'string', description: 'The file content' }
                },
                required: ['path', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List files in a directory',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The directory path' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the content of an existing file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path to read' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_file',
            description: 'Overwrite an existing file with new content',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path to update' },
                    content: { type: 'string', description: 'The new file content' }
                },
                required: ['path', 'content']
            }
        }
    }
];

export const TOOL_CATEGORIES = {
    chat: [],
    control: [
        'set_theme',
        'set_wallpaper',
        'set_volume',
        'get_system_status',
        'launch_app',
        'close_app',
        'get_running_apps'
    ],
    builder: [
        'create_directory',
        'create_file',
        'read_file',
        'update_file'
    ]
};
