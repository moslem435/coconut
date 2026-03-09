
import { System, ThemeMode } from '@/os/sdk';
import { SYSTEM_PATHS } from '@/os/config/paths';
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore';

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
    },

    // --- Execution ---
    run_command: async (args: { cmd: string, args?: string[], cwd?: string, detached?: boolean, successPattern?: string }) => {
        // Prevent running long-running processes that would timeout (unless detached mode is requested)
        const longRunningCommands = ['dev', 'start', 'watch', 'serve'];
        if (args.cmd === 'npm' && args.args && args.args.some(arg => longRunningCommands.includes(arg)) && !args.detached) {
            return `Command '${args.cmd} ${args.args.join(' ')}' skipped. Long-running processes (like dev servers) block execution. To run this, you MUST set "detached": true in the arguments.`;
        }

        let output = '';

        try {
            // Ensure WebContainer is ready
            const store = useWebContainerStore.getState();
            if (!store.instance) {
                try {
                    await store.boot();
                    // Double check after boot
                    if (!store.instance && !useWebContainerStore.getState().instance) {
                        return `Failed to initialize WebContainer. Please refresh the page and try again.`;
                    }
                } catch (bootError: any) {
                    // Check if it's a session conflict
                    if (bootError.message && bootError.message.includes('session conflict')) {
                        return `WebContainer initialization conflict detected. Please refresh the page to reset the environment, then try again.`;
                    }
                    return `Failed to initialize WebContainer: ${bootError.message || bootError}`;
                }
            }

            // Track the last output length when we dispatched a prompt
            // This allows us to detect new prompts after user responds
            let lastPromptOutputLength = 0;

            // Dispatch a custom event to notify UI about the output stream
            // This is a temporary solution until we have a proper streaming tool response architecture
            const dispatchOutput = (data: string) => {
                // Strip ANSI escape codes (colors, cursor movements, etc.)
                // eslint-disable-next-line no-control-regex
                const cleanData = data.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

                output += cleanData;
                window.dispatchEvent(new CustomEvent('ai-builder:command-output', {
                    detail: { cmd: args.cmd, output: cleanData }
                }));

                // Skip if output hasn't grown significantly since last prompt
                // This prevents duplicate triggers for the same prompt
                if (output.length - lastPromptOutputLength < 10) return;

                // Heuristic detection for interactive prompts
                // Check the FULL output (not just the current chunk) for better detection
                const trimmed = cleanData.trim();
                const fullOutput = output;
                const fullOutputTrimmed = fullOutput.trim();
                const fullOutputLower = fullOutput.toLowerCase();

                // 1. Detect prompt patterns (questions, colons, prompts)
                const hasPromptPattern =
                    fullOutputTrimmed.endsWith('?') ||
                    fullOutputTrimmed.endsWith(':') ||
                    fullOutputTrimmed.endsWith('?:') || // Vite uses "?:"
                    fullOutputTrimmed.endsWith('>') ||
                    fullOutputTrimmed.endsWith('...') || // Waiting indicator
                    // Yes/No confirmations (case insensitive)
                    /\(y\/n\)/i.test(fullOutput) ||
                    /\[y\/n\]/i.test(fullOutput) ||
                    /\(yes\/no\)/i.test(fullOutput) ||
                    /\[yes\/no\]/i.test(fullOutput) ||
                    /\[y\/n\]/i.test(fullOutput) ||
                    // Selection prompts
                    fullOutputLower.includes('select a') ||
                    fullOutputLower.includes('select an') ||
                    fullOutputLower.includes('choose a') ||
                    fullOutputLower.includes('choose an') ||
                    fullOutputLower.includes('please select') ||
                    fullOutputLower.includes('please choose') ||
                    fullOutputLower.includes('pick a') ||
                    fullOutputLower.includes('which') ||
                    // Input prompts
                    fullOutputLower.includes('enter your') ||
                    fullOutputLower.includes('enter a') ||
                    fullOutputLower.includes('enter the') ||
                    fullOutputLower.includes('type your') ||
                    fullOutputLower.includes('provide a') ||
                    fullOutputLower.includes('input') ||
                    // Common field names
                    fullOutputLower.includes('package name:') ||
                    fullOutputLower.includes('project name:') ||
                    fullOutputLower.includes('name:') ||
                    fullOutputLower.includes('version:') ||
                    fullOutputLower.includes('description:') ||
                    fullOutputLower.includes('author:') ||
                    fullOutputLower.includes('license:') ||
                    fullOutputLower.includes('dest dir:') ||
                    fullOutputLower.includes('directory:') ||
                    // Password/sensitive input
                    fullOutputLower.includes('password:') ||
                    fullOutputLower.includes('passphrase:') ||
                    fullOutputLower.includes('token:') ||
                    fullOutputLower.includes('secret:') ||
                    // Framework/tool specific
                    fullOutputLower.includes('use vite') ||
                    fullOutputLower.includes('framework:') ||
                    fullOutputLower.includes('template:') ||
                    fullOutputLower.includes('variant:') ||
                    // Special characters used by modern CLIs
                    fullOutputLower.includes('◆') || // Vite
                    fullOutputLower.includes('◇') || // Alternative
                    fullOutputLower.includes('●') || // Bullet
                    fullOutputLower.includes('○') || // Circle
                    fullOutputLower.includes('▸') || // Arrow
                    fullOutputLower.includes('❯') || // Prompt arrow
                    fullOutputLower.includes('›'); // Right arrow

                // 2. Check for option markers (visual indicators of choices)
                const hasOptions = /[○●•❯›│▸◆◇]\s+/g.test(output);

                // 3. Check for numbered options (1. Option, 1) Option, [1] Option)
                const hasNumberedOptions = /^\s*[\[\(]?\d+[\.\)\]]\s+\w+/m.test(output);

                // 4. Check for text input prompts (where no options might be present)
                const isTextInputPrompt =
                    /project name:|package name:|enter your|enter a|enter the|name:|version:|description:|author:|license:|dest dir:|directory:|password:|passphrase:|token:|secret:/i.test(fullOutputTrimmed);

                // 5. Check for waiting state (output ends with colon or prompt and hasn't grown)
                const looksLikeWaiting =
                    (fullOutputTrimmed.endsWith(':') || fullOutputTrimmed.endsWith('>')) &&
                    output.length > 20 &&
                    output.length < 500;

                // 6. Content length check (reasonable size for a prompt)
                const hasReasonableContent = output.length > 20 && output.length < 3000;

                // Debug logging
                if (hasPromptPattern || hasOptions || hasNumberedOptions || isTextInputPrompt || looksLikeWaiting) {
                    console.log('[SystemTools] Prompt detection check:', {
                        hasPromptPattern,
                        hasOptions,
                        hasNumberedOptions,
                        isTextInputPrompt,
                        looksLikeWaiting,
                        hasReasonableContent,
                        outputLength: output.length,
                        lastLine: fullOutputTrimmed.split('\n').pop()?.slice(-100)
                    });
                }

                // Trigger interactive prompt if any of these conditions are met:
                // 1. Prompt pattern + options (visual or numbered)
                // 2. Text input prompt detected
                // 3. Looks like waiting for input
                // 4. Prompt pattern + reasonable content (not too short, not too long)
                const shouldTrigger =
                    (hasPromptPattern && (hasOptions || hasNumberedOptions)) ||
                    isTextInputPrompt ||
                    looksLikeWaiting ||
                    (hasPromptPattern && hasReasonableContent);

                if (shouldTrigger) {
                    // Update the last prompt output length to allow future prompts
                    lastPromptOutputLength = output.length;

                    console.log('[SystemTools] ✅ Interactive prompt detected!');
                    console.log('[SystemTools] Full output:', output);

                    // Extract the prompt line (usually the last non-empty line)
                    const lines = fullOutputTrimmed.split('\n').filter(l => l.trim());
                    const promptLine = lines[lines.length - 1] || trimmed;

                    window.dispatchEvent(new CustomEvent('ai-builder:interactive-prompt', {
                        detail: {
                            cmd: args.cmd,
                            prompt: promptLine,
                            output: output
                        }
                    }));
                }
            };

            // Create a timeout promise (60 seconds for most commands)
            const timeoutMs = 60000;
            const timeoutPromise = new Promise<number>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds. The command may be waiting for user input or taking too long.`));
                }, timeoutMs);
            });

            // Race between command execution and timeout
            let exitCode = -1;
            try {
                exitCode = await Promise.race([
                    store.runCommand(
                        args.cmd,
                        args.args || [],
                        args.cwd || '/',
                        dispatchOutput,
                        {
                            detached: args.detached,
                            successPattern: args.successPattern
                        }
                    ),
                    timeoutPromise
                ]);
            } catch (cmdError: any) {
                // WebContainer / npx fallback: file system might not have fully flushed bin symlinks yet
                const isNpxError = args.cmd === 'npx' && (
                    output.includes('could not determine executable to run') ||
                    cmdError.message?.includes('exit code 1')
                );

                if (isNpxError && args.args && args.args.length > 0) {
                    console.log(`[SystemTools] npx execution failed (possibly timing). Retrying in 2 seconds...`);

                    // Wait 2 seconds for WebContainer file system to settle
                    await new Promise(r => setTimeout(r, 2000));

                    output = ''; // Reset output buffer
                    console.log(`[SystemTools] Retrying original npx command...`);

                    const retryTimeoutPromise = new Promise<number>((_, reject) => {
                        setTimeout(() => {
                            reject(new Error(`Fallback command timed out after ${timeoutMs / 1000} seconds.`));
                        }, timeoutMs);
                    });

                    exitCode = await Promise.race([
                        store.runCommand(
                            args.cmd,
                            args.args,
                            args.cwd || '/',
                            dispatchOutput,
                            {
                                detached: args.detached,
                                successPattern: args.successPattern
                            }
                        ),
                        retryTimeoutPromise
                    ]);
                } else {
                    throw cmdError;
                }
            }

            // After command completes successfully, sync WebContainer to VFS
            if (exitCode === 0) {
                console.log(`[SystemTools] Command succeeded, syncing WC to VFS...`);
                try {
                    // Always sync from root to catch all changes
                    // This is especially important for commands like "npm create vite"
                    // which create new directories
                    await store.syncWCToVFS('/');
                    console.log(`[SystemTools] ✅ Sync complete`);
                } catch (syncError) {
                    console.warn(`[SystemTools] Sync failed:`, syncError);
                }

                if (args.detached) {
                    return `Process started successfully in background.\nInitial Output:\n${output.slice(0, 2000)}`;
                }
                return `Command executed successfully.\nOutput:\n${output.slice(0, 1000)}${output.length > 1000 ? '...(truncated)' : ''}`;
            } else {
                return `Command failed with exit code ${exitCode}.\nOutput:\n${output.slice(0, 1000)}`;
            }
        } catch (e: any) {
            // Include output in error message if available
            // This is crucial for commands that fail but output useful stderr info
            const outputInfo = (output && output.length > 0) ? `\nOutput before failure:\n${output.slice(0, 1000)}` : '';

            // Check if it's a timeout error
            if (e.message && e.message.includes('timed out')) {
                return `Error: ${e.message}${outputInfo}\n\nTip: Avoid interactive commands. Use non-interactive alternatives (e.g., 'npm init -y' instead of 'npm init', or add '-y' flag to skip prompts).`;
            }

            return `Error running command: ${e.message || e}${outputInfo}`;
        }
    },

    get_file_tree: (args: { path: string, depth?: number }) => {
        try {
            // Basic recursive listing (simplified for now)
            // In real implementation we might want a tree structure
            const files = System.fs.readDir(args.path);
            return JSON.stringify(files.map(f => f.name));
        } catch (e) {
            return `Error getting file tree: ${e}`;
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
                    path: { type: 'string', description: `The directory path (e.g. "${SYSTEM_PATHS.DESKTOP}/MyApp.coco")` }
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
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a shell command in the WebContainer environment. For long-running processes (like dev servers), use "detached": true. CRITICAL: Commands MUST be non-interactive and complete within 60 seconds (unless detached). NEVER use: "npm create vite" (interactive), "npm init" (use "npm init -y"), or any command that waits for user input.',
            parameters: {
                type: 'object',
                properties: {
                    cmd: { type: 'string', description: 'The command to run (e.g., "npm")' },
                    args: { type: 'array', items: { type: 'string' }, description: 'Arguments for the command (e.g., ["install", "react"])' },
                    cwd: { type: 'string', description: 'Current working directory for the command (e.g. "/home/user/apps/myapp")' },
                    detached: { type: 'boolean', description: 'Set to true for long-running processes (e.g. npm run dev). Returns early after detecting successPattern.' },
                    successPattern: { type: 'string', description: 'String to watch for in output to confirm successful start in detached mode (default: "Local:")' }
                },
                required: ['cmd']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_file_tree',
            description: 'Get a list of files in a directory (shallow)',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The directory path' }
                },
                required: ['path']
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
    filesystem: [
        'create_directory',
        'create_file',
        'read_file',
        'update_file',
        'run_command',
        'get_file_tree'
    ],
    builder: [
        'create_directory',
        'create_file',
        'read_file',
        'update_file',
        'run_command',
        'get_file_tree'
    ]
};
