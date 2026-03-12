import { useWindowStore } from './useWindowStore'
import { useFileSystemStore } from './useFileSystemStore'
import { useWebContainerStore } from './useWebContainerStore'
import { useDialogStore } from './useDialogStore'
import { useSystemSettingsStore } from './useSystemSettingsStore'
import { DependencyCacheService } from './DependencyCacheService'
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
    private static webContainerLaunchPromises = new Map<string, Promise<void>>()
    private static webContainerStartupUrls = new Map<string, string>()
    private static staticAppBlobUrls = new Map<string, { url: string; hash: number }>()

    private static hashString(input: string) {
        let hash = 2166136261
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i)
            hash = Math.imul(hash, 16777619)
        }
        return hash >>> 0
    }

    private static getWebContainerStartupUrl(cacheKey: string, title: string) {
        const cached = AppLauncherService.webContainerStartupUrls.get(cacheKey)
        if (cached) return cached
        const html = `<html><head><meta charset="utf-8"/></head><body style="margin:0;background:#0b1220;height:100vh;"></body></html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        AppLauncherService.webContainerStartupUrls.set(cacheKey, url)
        return url
    }

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
                    const { System } = await import('@/os/sdk/system')
                    if (!System || !System.fs) {
                        throw new Error('System FS not available')
                    }
                    const fs = System.fs
                    
                    // Try to resolve path, fallback to manual build if it looks broken
                    let physicalPath = resolvePath(file.id)
                    if (physicalPath === '/' || physicalPath === '') {
                        const nodes = getPath(file.id)
                        physicalPath = '/' + nodes.slice(1).map(n => n.name).join('/')
                        console.log('[AppLauncher] Path resolved to root, manual rebuild:', physicalPath)
                    }
                    
                    console.log('[AppLauncher] Attempting physical read at:', `${physicalPath}/package.json`)
                    
                    // Check for package.json physically
                    const pkgContent = await fs.readFile(`${physicalPath}/package.json`)
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
                                     await fs.readFile(`${physicalPath}/index.html`)
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
                    console.warn('[AppLauncher] Physical read fallback failed:', physicalErr)
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
            const htmlHash = AppLauncherService.hashString(html)
            const cached = AppLauncherService.staticAppBlobUrls.get(fileId)
            if (cached && cached.hash === htmlHash) {
                return cached.url
            }
            
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

            const cspMeta = `<meta http-equiv="Content-Security-Policy" content="
                default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; 
                script-src * 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh; 
                style-src * 'unsafe-inline' blob: data: https://fonts.googleapis.com; 
                img-src * data: blob:; 
                font-src * data: blob: https://fonts.gstatic.com; 
                connect-src * data: blob: wss:;
            ">`;

            const proxyBase = typeof window !== 'undefined'
                ? `${window.location.origin}/api/proxy?url=`
                : '/api/proxy?url=';
            const shouldProxy = (rawUrl: string) => {
                try {
                    const hostname = new URL(rawUrl).hostname.toLowerCase();
                    return [
                        'cdn.tailwindcss.com',
                        'cdn.jsdelivr.net',
                        'unpkg.com',
                        'fonts.googleapis.com',
                        'fonts.gstatic.com'
                    ].includes(hostname);
                } catch {
                    return false;
                }
            };
            const toProxy = (rawUrl: string) => `${proxyBase}${encodeURIComponent(rawUrl)}`;

            const externalScriptRegex = /<script\s+([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi;
            html = html.replace(externalScriptRegex, (match, p1, src, p2) => {
                if (!shouldProxy(src)) return match;
                return `<script ${p1}src="${toProxy(src)}"${p2}>`;
            });

            const externalLinkRegex = /<link\s+([^>]*?)href=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi;
            html = html.replace(externalLinkRegex, (match, p1, href, p2) => {
                if (!shouldProxy(href)) return match;
                return `<link ${p1}href="${toProxy(href)}"${p2}>`;
            });

            const deferProxyScriptRegex = /<script\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
            html = html.replace(deferProxyScriptRegex, (match, p1, src, p2) => {
                const attrs = `${p1} ${p2}`.toLowerCase();
                if (attrs.includes('defer') || attrs.includes('async')) return match;
                if (!src.includes('/api/proxy?url=')) return match;
                return `<script defer ${p1}src="${src}"${p2}>`;
            });

            html = html.replace(
                /<script>\s*lucide\.createIcons\(\);\s*<\/script>/i,
                `<script>window.addEventListener('DOMContentLoaded', () => { try { (lucide && lucide.createIcons) && lucide.createIcons(); } catch {} });</script>`
            );
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${cspMeta}`);
            } else {
                html = `${cspMeta}${html}`;
            }

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob)
            AppLauncherService.staticAppBlobUrls.set(fileId, { url, hash: htmlHash })
            return url
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
        const { launchApp, focusWindow, updateWindow, windows } = useWindowStore.getState()
        const wcStore = useWebContainerStore.getState()

        const startUrl = AppLauncherService.getWebContainerStartupUrl(appId, title)
        
        // Helper to update launch status
        const updateStatus = (status: string, label: string) => {
            const { windows, updateWindow } = useWindowStore.getState()
            const win = windows[appId]
            if (win) {
                updateWindow(appId, {
                    componentProps: {
                        ...(win.componentProps || {}),
                        launchStatus: status,
                        launchLabel: label
                    }
                })
            }
        }

        const existingWin = windows[appId]
        if (existingWin) {
            updateWindow(appId, {
                componentProps: {
                    ...(existingWin.componentProps || {}),
                    initialUrl: startUrl,
                    isAppMode: true,
                    waitForServer: true,
                    launchStatus: 'booting',
                    // launchLabel: 'Starting System Runtime...'
                }
            })
            focusWindow(appId)
        } else {
            launchApp(appId, title, 'browser', icon, {
                ...options,
                initialUrl: startUrl,
                isAppMode: true,
                waitForServer: true,
                launchStatus: 'booting',
                // launchLabel: 'Starting System Runtime...'
            })
        }

        const existingPromise = AppLauncherService.webContainerLaunchPromises.get(appId)
        if (existingPromise) {
            focusWindow(appId)
            await existingPromise
            return
        }

        const launchPromise = (async () => {
        // Check if WebContainer is ready, try to boot if not
        if (!wcStore.instance) {
            updateStatus('booting', '')
            // toast.info('Starting Runtime', 'System Runtime is booting, please wait...')
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

            try {
                await DependencyCacheService.ensureCacheDir()
            } catch (e) {
                console.warn('[AppLauncher] Failed to ensure dependency cache directory:', e)
            }

            // Auto-detect node_modules: if missing, run npm install first
            let hasNodeModules = false
            try {
                const entries = await instance.fs.readdir(appPath)
                hasNodeModules = entries.includes('node_modules')
            } catch (e) {
                console.warn(`[AppLauncher] Cannot read app directory ${appPath}:`, e)
            }

            if (!hasNodeModules) {
                const useCache = useSystemSettingsStore.getState().useDependencyCache
                let restored = false
                
                if (useCache) {
                    try {
                        // 1. Try restore from OPFS Cache
                        const cacheInfo = await DependencyCacheService.computeCacheKeyFromWebContainerFs(instance.fs as any, appPath, { preferPackageJson: false })
                        if (cacheInfo) {
                            // Check for Tar Snapshot first (Faster)
                        if (await DependencyCacheService.hasSnapshot(cacheInfo.key)) {
                            updateStatus('restoring', '')
                            restored = await DependencyCacheService.restoreSnapshot({
                                key: cacheInfo.key,
                                wcFs: instance.fs as any,
                                appPath,
                            })
                        }
                        // Fallback to Directory Snapshot
                        else if (await DependencyCacheService.isDirSnapshotComplete(cacheInfo.key)) {
                            updateStatus('restoring', '')
                            restored = await DependencyCacheService.restoreDirSnapshotToWebContainerFs({
                                key: cacheInfo.key,
                                wcFs: instance.fs as any,
                                appPath,
                            })
                        }
                    }

                    // 2. Try restore from Pre-built Template (Public Assets)
                    if (!restored) {
                        // Check if this looks like a standard React template
                        // Heuristic: check if package.json dependencies match our standard template
                        // For simplicity, we just check for a special flag or assume standard if it's a new app
                        // Here we simply try to fetch the standard template tar if no other cache exists
                        try {
                            updateStatus('downloading', '')
                            const templateName = 'react-template.tar' // We can make this dynamic later
                            const response = await fetch(`/templates/${templateName}`, { method: 'HEAD' })
                            if (response.ok) {
                                console.log('[AppLauncher] Found pre-built template cache, downloading...')
                                const blob = await (await fetch(`/templates/${templateName}`)).blob()
                                const arrayBuffer = await blob.arrayBuffer()
                                
                                updateStatus('extracting', '')
                                const { TarService } = await import('@/os/utils/TarService')
                                await TarService.extractTarToWebContainer(
                                    arrayBuffer, 
                                    instance.fs as any, 
                                    `${appPath}/node_modules`
                                )
                                restored = true
                                console.log('[AppLauncher] Template cache restored successfully')
                            }
                        } catch (templateErr) {
                            console.warn('[AppLauncher] Failed to load template cache:', templateErr)
                        }
                    }

                    if (restored) {
                        try {
                            const entriesAfter = await instance.fs.readdir(appPath)
                            hasNodeModules = entriesAfter.includes('node_modules')
                        } catch {}
                    }
                } catch (e) {
                    console.warn('[AppLauncher] Dependency restore attempt failed:', e)
                }
            } else {
                console.log('[AppLauncher] Dependency cache disabled by user setting. Skipping restore.')
            }

            if (hasNodeModules) {
                updateStatus('restored', '')
            }
        }

        if (!hasNodeModules) {
            console.log(`[AppLauncher] node_modules not found, running npm install...`)
            // Auto-install without confirmation for "App-like" experience
            updateStatus('installing', '')
            
            try {
                // Add verbose logging to help diagnose npm issues
                // Use default install first
                await runCommand('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], appPath, (data) => {
                    console.log(`[${file.name} install] ${data}`)
                })
                console.log(`[AppLauncher] npm install completed for ${file.name}`)

                // Only save cache if enabled
                if (useSystemSettingsStore.getState().useDependencyCache) {
                    try {
                        const cacheInfo = await DependencyCacheService.computeCacheKeyFromWebContainerFs(instance.fs as any, appPath, { preferPackageJson: false })
                        if (cacheInfo) {
                            ;(async () => {
                                try {
                                    // Save snapshot
                                    await DependencyCacheService.saveSnapshot({
                                        key: cacheInfo.key,
                                        wcFs: instance.fs as any,
                                        appPath,
                                        source: cacheInfo.source,
                                        sourceName: cacheInfo.sourceName,
                                    })
                                    toast.success('Snapshot Saved', `Dependency snapshot saved for "${title}"`)
                                } catch (e) {
                                    console.warn('[AppLauncher] Dependency caching failed:', e)
                                    // Non-fatal, just log
                                }
                            })()
                        }
                    } catch (e) {
                        console.warn('[AppLauncher] Dependency caching failed:', e)
                    }
                }
            } catch (installErr: any) {
                console.error(`[AppLauncher] npm install failed, retrying with cache cleanup...`, installErr)
                
                // --- AUTO-RETRY: Clean cache and try again ---
                try {
                    updateStatus('installing', 'Retrying...')
                    toast.info('Install Retry', 'Cleaning cache and retrying install...')
                    
                    // Nuke cache
                    try {
                        await runCommand('rm', ['-rf', '/.cache/npm', 'node_modules', 'package-lock.json'], appPath)
                    } catch {}

                    // Retry install
                    await runCommand('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--loglevel=verbose'], appPath, (data) => {
                        console.log(`[${file.name} install-retry] ${data}`)
                    })
                    console.log(`[AppLauncher] Retry install successful!`)
                } catch (retryErr: any) {
                    console.error(`[AppLauncher] Retry install failed:`, retryErr)
                    toast.error('Install Failed', `npm install failed for "${title}": ${retryErr.message}. Please check package.json.`)
                    return
                }
            }
        }

        // Run dev server
        updateStatus('starting', '')
            
            // OPTIMISTIC UI: Wait a bit, then assume it's starting if it takes too long
            // This is just visual feedback, the actual ready signal comes from server-ready event
            
            // --- FIX: Enhanced Error Handling for Startup ---
            try {
                // Check if npm run dev script exists first
                const pkgContent = await instance.fs.readFile(`${appPath}/package.json`, 'utf-8');
                const pkg = JSON.parse(pkgContent);
                if (!pkg.scripts || !pkg.scripts.dev) {
                     throw new Error('No "dev" script found in package.json');
                }

                // EMERGENCY FIX: Force executable permissions for .bin files
                // Tar restore might have lost them, or they are symlinks that need fixing.
                try {
                    console.log('[AppLauncher] Applying permission fix for .bin executables...');
                    const binPath = `${appPath}/node_modules/.bin`;
                    
                    // Check if .bin exists
                    let hasBin = false;
                    try {
                        await instance.fs.readdir(binPath);
                        hasBin = true;
                    } catch {}

                    if (hasBin) {
                        // Optimization: Use batch chmod -R instead of individual files
                        // This avoids spawning dozens of processes which freezes the UI
                        try {
                            await runCommand('chmod', ['-R', '+x', 'node_modules/.bin'], appPath);
                        } catch (e) {
                            console.warn('[AppLauncher] Batch permission fix warning:', e);
                        }
                    }
                } catch (chmodErr) {
                    console.warn('[AppLauncher] Permission fix warning (non-fatal):', chmodErr);
                }

                await runCommand('npm', ['run', 'dev'], appPath, async (data) => {
                    console.log(`[DevServer] ${data}`)
                    // Check for common error patterns in output
                    if (data.includes('EADDRINUSE')) {
                         toast.error('Port Conflict', 'Port is already in use. Please close other apps.');
                    }
                    if (data.includes('Vite Error') || data.includes('Error:') || data.includes('permission denied')) {
                         console.error('[DevServer Error]', data);
                         
                         // --- AUTO HEALING: Permission Denied ---
                         if (data.includes('permission denied')) {
                             console.log('[AppLauncher] Detected permission denied. Triggering auto-repair...');
                             const repairToastId = toast.loading('Repairing Runtime', 'Fixing permissions issues, please wait...');
                             updateStatus('installing', 'Repairing Runtime...');
                             
                             try {
                                 // Re-run npm install to fix broken symlinks/permissions
                                 await runCommand('npm', ['install', '--force', '--no-audit'], appPath);
                                 console.log('[AppLauncher] Repair complete. Restarting dev server...');
                                 toast.dismiss(repairToastId);
                                 toast.success('Repaired', 'Runtime environment repaired.');
                                 
                                 // We can't easily "restart" the current runCommand from inside its callback without complex logic.
                                 // But since we are inside the callback, the current process is likely exiting or printing error.
                                 // We should ideally kill the current process and restart.
                                 // However, `runCommand` wrapper doesn't expose kill easily here.
                                 // The simplest way is to let the user refresh, or just rely on the fact that `npm run dev` will fail/exit 
                                 // and the user has to click open again.
                                 
                                 // BETTER: Suggest reload
                                 toast.info('Restart Required', 'Please close and reopen the app to apply fixes.');
                             } catch (repairErr) {
                                 console.error('[AppLauncher] Auto-repair failed:', repairErr);
                                 toast.error('Repair Failed', 'Could not auto-repair. Please reinstall the app.');
                             }
                         }
                    }
                }, { 
                    detached: true, 
                    successPattern: 'Local:',
                });
            } catch (runErr: any) {
                console.error('[AppLauncher] Failed to run dev server:', runErr);
                updateStatus('error', 'Startup Failed');
                toast.error('Startup Failed', `Failed to start dev server: ${runErr.message}`);
                
                // If startup failed, it might be due to broken node_modules (e.g. symlinks lost).
                // Suggest reinstall
                // TODO: Add a "Reinstall" button in UI
                return;
            }

        } catch (e: any) {
            console.error('[AppLauncher] Failed to launch web container app:', e)
            toast.error('Launch Failed', `Failed to launch "${title}": ${e.message}`)
        }
        })()

        AppLauncherService.webContainerLaunchPromises.set(appId, launchPromise)
        try {
            await launchPromise
        } finally {
            AppLauncherService.webContainerLaunchPromises.delete(appId)
        }
    }
}

// Initialize
AppLauncherService.getInstance()
