import { useWindowStore } from './useWindowStore'
import { useFileSystemStore } from './useFileSystemStore'
import { useWebContainerStore } from './useWebContainerStore'
import { toast } from '@/os/components/Toast'
import { AppBundleConfig } from './initialFileTree'

/**
 * AppLauncherService
 * 
 * Handles the logic for launching applications, including:
 * 1. Native apps (via APPS_REGISTRY)
 * 2. Static Web Apps (index.html in iframe)
 * 3. WebContainer Apps (Node.js apps)
 */
export class AppLauncherService {
    private static instance: AppLauncherService

    private constructor() {
        // Register self to WindowStore
        useWindowStore.getState().registerAppLauncher(this)
    }

    public static getInstance(): AppLauncherService {
        if (!AppLauncherService.instance) {
            AppLauncherService.instance = new AppLauncherService()
        }
        return AppLauncherService.instance
    }

    /**
     * Launch an app based on a file node (folder or shortcut)
     */
    public async launch(file: any): Promise<boolean> {
        console.log('[AppLauncher] Launching:', file)

        // 1. Native App (via appId)
        if (file.appId) {
            // Handled by caller or WindowStore usually, but if passed here:
            // We return false to let caller handle it via standard openWindow if they want,
            // or we could handle it here.
            // For now, assume this service focuses on App Bundles.
            return false
        }

        // 2. Check for App Bundle (Folder with package.json)
        if (file.type === 'folder') {
            const config = await this.detectAppConfig(file)
            if (config) {
                // Enhance file object with config for internal usage
                file.appConfig = config
                file.isAppBundle = true
                await this.launchAppBundle(file)
                return true
            }
        }
        
        return false
    }

    /**
     * Detect if a folder is an App Bundle by checking package.json
     */
    public async detectAppConfig(file: any): Promise<AppBundleConfig | null> {
        // Optimization: if already has config, return it
        if (file.isAppBundle && file.appConfig) return file.appConfig

        try {
            const { getChildren, readFileContent } = useFileSystemStore.getState()
            let children = getChildren(file.id)
            
            // If no children found, it might not be loaded yet
            if (children.length === 0) {
                console.log('[AppLauncher] No children found, folder might be empty or not loaded. Trying physical read...')
                
                // Fallback: Try to read directory directly from physical storage to ensure it's not a cache miss
                try {
                    const { resolvePath, getPath } = useFileSystemStore.getState()
                    // Use a more robust way to get system fs
                    const system = (await import('@/os/sdk/system')).default
                    if (!system || !system.fs) {
                        throw new Error('System FS not available')
                    }
                    const fs = system.fs
                    
                    // Try to resolve path, fallback to manual build if it looks broken
                    let path = resolvePath(file.id)
                    if (path === '/' || path === '') {
                        const nodes = getPath(file.id)
                        path = '/' + nodes.slice(1).map(n => n.name).join('/')
                        console.log('[AppLauncher] Path resolved to root, manual rebuild:', path)
                    }
                    
                    console.log('[AppLauncher] Attempting physical read at:', `${path}/package.json`)
                    
                    // Check for package.json physically
                    const pkgContent = await fs.readFile(`${path}/package.json`)
                    if (pkgContent) {
                         const pkg = JSON.parse(pkgContent)
                         console.log('[AppLauncher] Found package.json via physical read:', pkg.name)
                         
                         if (pkg.cocount) {
                            return pkg.cocount as AppBundleConfig
                         }
                         
                         // Heuristic fallback for physical read
                         if (pkg.name) {
                             // Check for entry file presence
                             let hasEntry = !!pkg.entry
                             if (!hasEntry) {
                                 try {
                                     await fs.readFile(`${path}/index.html`)
                                     hasEntry = true
                                 } catch {}
                             }
                             
                             if (hasEntry) {
                                return {
                                    type: 'web-static',
                                    icon: pkg.icon || '📦',
                                    window: {
                                        title: pkg.title || pkg.name,
                                        width: 800,
                                        height: 600
                                    }
                                }
                             }
                         }
                    }
                } catch (physicalErr) {
                    console.warn('[AppLauncher] Physical read fallback failed for path:', path, physicalErr)
                }
            } else {
                 console.log('[AppLauncher] Children found:', children.map(c => c.name))
            }

            const pkgJsonFile = children.find(c => c.name === 'package.json')
            
            if (pkgJsonFile) {
                const content = await readFileContent(pkgJsonFile.id)
                const pkg = JSON.parse(content)
                
                // 1. Standard Cocount Config
                if (pkg.cocount) {
                    return pkg.cocount as AppBundleConfig
                }

                // 2. Fallback: Heuristic Detection (If it looks like an app, treat it as one)
                // This handles cases where AI or user forgets the 'cocount' wrapper
                if (pkg.name && (pkg.entry || children.find(c => c.name === 'index.html'))) {
                    console.log('[AppLauncher] Heuristic match found for:', pkg.name)
                    return {
                        type: 'web-static',
                        icon: pkg.icon || '📦',
                        window: {
                            title: pkg.title || pkg.name,
                            width: 800,
                            height: 600
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[AppLauncher] Failed to read package.json:', e)
        }
        return null
    }

    private async launchAppBundle(file: any) {
        const config = file.appConfig as AppBundleConfig
        const { launchApp } = useWindowStore.getState()
        
        const appId = `app-${file.id}`
        const title = config.window?.title || file.name.replace('.app', '')
        const icon = config.icon
        
        // Window options
        const windowOptions = {
            width: config.window?.width || 800,
            height: config.window?.height || 600,
            titleBarColor: 'auto',
            isResizable: true,
            isMaximized: false
        }

        // --- Mode 1: Static Web App ---
        if (config.type === 'web-static') {
            await this.launchStaticApp(file, appId, title, icon, windowOptions)
            return
        }

        // --- Mode 2: WebContainer App ---
        if (config.type === 'web-container' || config.type === 'web-app') { // Support legacy 'web-app'
            await this.launchWebContainerApp(file, appId, title, icon, windowOptions)
            return
        }
    }

    /**
     * Generate a fresh Blob URL for a static app
     */
    public async getStaticAppBlobUrl(fileId: string): Promise<string | null> {
        const { readFileContent, getChildren, getItem } = useFileSystemStore.getState()
        const file = getItem(fileId)
        if (!file) return null

        const children = getChildren(fileId)
        const indexFile = children.find(c => c.name === 'index.html')
        if (!indexFile) return null

        try {
            let html = await readFileContent(indexFile.id)
            
            // Inline Scripts
            const scriptRegex = /<script\s+[^>]*?src=["'](.+?)["'][^>]*?>\s*<\/script>/gi;
            html = await this.processReplacements(html, scriptRegex, async (src) => {
                let scriptPath = src;
                if (scriptPath.startsWith('./')) scriptPath = scriptPath.slice(2);
                const scriptFile = children.find(c => c.name === scriptPath);
                if (scriptFile) {
                    const content = await readFileContent(scriptFile.id);
                    return `<script>try { ${content} } catch (e) { console.error(e); }</script>`;
                }
                return null;
            });

            // Inline Styles
            const styleRegex = /<link\s+[^>]*?href=["'](.+?)["'][^>]*?>/gi;
            html = await this.processReplacements(html, styleRegex, async (src) => {
                 let stylePath = src;
                 if (stylePath.startsWith('./')) stylePath = stylePath.slice(2);
                 const styleFile = children.find(c => c.name === stylePath);
                 if (styleFile && styleFile.name.endsWith('.css')) {
                     const content = await readFileContent(styleFile.id);
                     return `<style>\n${content}\n</style>`;
                 }
                 return null;
            });

            // Inject CSP
            const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:;">`;
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${cspMeta}`);
            } else {
                html = `${cspMeta}${html}`;
            }

            const blob = new Blob([html], { type: 'text/html' });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error('[AppLauncher] Failed to regenerate blob URL:', e)
            return null
        }
    }

    private async launchStaticApp(file: any, appId: string, title: string, icon: any, options: any) {
        const blobUrl = await this.getStaticAppBlobUrl(file.id)
        
        if (!blobUrl) {
            toast.error('Launch Failed', `index.html not found in "${file.name}"`)
            return
        }

        const { launchApp } = useWindowStore.getState()
        launchApp(appId, title, 'browser', icon, {
            ...options,
            initialUrl: blobUrl,
            isAppMode: true,
            hideTitleBar: false,
            filePath: file.id // Crucial for recovery
        })
    }

    private async processReplacements(html: string, regex: RegExp, replacer: (src: string) => Promise<string | null>): Promise<string> {
        // Reset regex state
        regex.lastIndex = 0;
        
        const matches: { fullMatch: string, src: string, index: number }[] = [];
        let match;
        
        // 1. Find all matches
        while ((match = regex.exec(html)) !== null) {
            matches.push({
                fullMatch: match[0],
                src: match[1] ?? '',
                index: match.index
            });
        }
        
        // 2. Process replacements in reverse order to preserve indices
        // Wait, async replacements mean we can't use standard string.replace with callback easily
        // So we collect all, resolve async, then replace string parts.
        
        let result = html;
        
        // Iterate backwards
        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i]!;
            const replacement = await replacer(m.src);
            if (replacement) {
                result = result.substring(0, m.index) + replacement + result.substring(m.index + m.fullMatch.length);
            }
        }
        
        return result;
    }

    private async launchWebContainerApp(file: any, appId: string, title: string, icon: any, options: any) {
        const { launchApp } = useWindowStore.getState()
        const wcStore = useWebContainerStore.getState()

        // Check if WebContainer is ready, try to boot if not
        if (!wcStore.instance) {
            toast.info('Starting Runtime', 'System Runtime is booting, please wait...')
            try {
                await wcStore.boot()
                if (!useWebContainerStore.getState().instance) {
                    toast.error('Runtime Error', 'Failed to start System Runtime. Please refresh the page.')
                    return
                }
            } catch (e: any) {
                toast.error('Runtime Error', `Failed to boot: ${e.message}`)
                return
            }
        }

        // Calculate real path from file system instead of hardcoding
        const { resolvePath } = useFileSystemStore.getState()
        const vfsPath = resolvePath(file.id) // e.g. /home/user/apps/calculator
        // WebContainer root maps to SYSTEM_PATHS.USER (/home/user)
        // So we strip the prefix to get the WC-relative path
        const SYSTEM_USER_PATH = '/home/user'
        const appPath = vfsPath.startsWith(SYSTEM_USER_PATH)
            ? vfsPath.replace(SYSTEM_USER_PATH, '') || '/'
            : `/apps/${file.name}` // Fallback
        
        console.log(`[AppLauncher] Starting ${file.name} in ${appPath} (VFS: ${vfsPath})...`)
        
        try {
            const { instance, runCommand } = useWebContainerStore.getState()
            if (!instance) return

            // Auto-detect node_modules: if missing, run npm install first
            let hasNodeModules = false
            try {
                const entries = await instance.fs.readdir(appPath)
                hasNodeModules = entries.includes('node_modules')
            } catch (e) {
                console.warn(`[AppLauncher] Cannot read app directory ${appPath}:`, e)
            }

            if (!hasNodeModules) {
                console.log(`[AppLauncher] node_modules not found, running npm install...`)
                toast.info('Installing Dependencies', `Running npm install for "${title}"...`)
                try {
                    await runCommand('npm', ['install'], appPath, (data) => {
                        console.log(`[${file.name} install] ${data}`)
                    })
                    console.log(`[AppLauncher] npm install completed for ${file.name}`)
                } catch (installErr: any) {
                    console.error(`[AppLauncher] npm install failed:`, installErr)
                    toast.error('Install Failed', `npm install failed for "${title}": ${installErr.message}. Please check package.json.`)
                    return
                }
            }

            // Run dev server
            runCommand('npm', ['run', 'dev'], appPath, (data) => {
                // console.log(`[${file.name}] ${data}`)
            }, { detached: true, successPattern: 'Local:' })
            
            // Launch browser immediately with a "Waiting..." state
            launchApp(appId, title, 'browser', icon, {
                ...options,
                initialUrl: 'about:blank', // Will be updated by server-ready
                isAppMode: true,
                waitForServer: true // Flag for browser to listen for next server-ready
            })

        } catch (e: any) {
            console.error('[AppLauncher] Failed to launch web container app:', e)
            toast.error('Launch Failed', `Failed to launch "${title}": ${e.message}`)
        }
    }
}

// Initialize
AppLauncherService.getInstance()