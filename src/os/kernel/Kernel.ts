import { APPS_REGISTRY } from '@/os/registry/config'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useProcessStore } from '@/os/kernel/useProcessStore'

// Types
export type SysCallMessage = {
    id: string
    type: 'SYSCALL'
    appId: string
    method: string
    args: any[]
}

export type SysCallResponse = {
    id: string
    type: 'SYSCALL_RESULT'
    result?: any
    error?: string
}

class KernelSystem {
    private static instance: KernelSystem
    
    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this))
        }
    }

    public static getInstance(): KernelSystem {
        if (!KernelSystem.instance) {
            KernelSystem.instance = new KernelSystem()
        }
        return KernelSystem.instance
    }

    public init() {
        console.log('[Kernel] Initialized')
    }

    private async handleMessage(event: MessageEvent) {
        const data = event.data as SysCallMessage
        
        // Basic validation
        if (!data || data.type !== 'SYSCALL' || !data.appId) return

        // Validate App exists
        const app = APPS_REGISTRY[data.appId]
        if (!app) {
            this.sendError(event.source as Window, data.id, 'Unknown App ID')
            return
        }

        // Validate Permissions
        if (!this.checkPermission(app.id, data.method)) {
             console.warn(`[Kernel] Permission Denied: App ${app.id} tried to call ${data.method}`)
             this.sendError(event.source as Window, data.id, `Permission Denied: ${data.method}`)
             return
        }

        // Execute System Call
        try {
            const result = await this.executeSysCall(data.method, data.args)
            this.sendResult(event.source as Window, data.id, result)
        } catch (error: any) {
            this.sendError(event.source as Window, data.id, error.message)
        }
    }

    private checkPermission(appId: string, method: string): boolean {
        const app = APPS_REGISTRY[appId]
        if (!app) return false
        
        // Default: Deny everything if sandbox is true and no permissions listed
        if (app.sandbox && !app.permissions) return false

        // Check explicit permissions
        // Format: "module.method" e.g. "fs.read"
        // Also support wildcards like "fs.*"
        
        const requiredPermission = method
        
        // Super simple matcher
        return app.permissions?.some(p => {
            if (p === '*') return true
            if (p === requiredPermission) return true
            if (p.endsWith('.*')) {
                const prefix = p.slice(0, -2)
                return requiredPermission.startsWith(prefix)
            }
            return false
        }) ?? false
    }

    private async executeSysCall(method: string, args: any[]): Promise<any> {
        console.log(`[Kernel] Executing ${method}`, args)

        switch (method) {
            case 'process.exit':
                // Find process by window ID/Context
                // For now, we don't have sender context fully mapped to PID here
                // But we can assume args[0] might be exit code
                // And we can close the window
                return
            case 'fs.readFile':
                const content = await fs.readFile(args[0])
                return new TextDecoder().decode(content)
            case 'fs.writeFile':
                return fs.writeFile(args[0], args[1])
            case 'fs.readDir':
                return fs.readdir(args[0])
            case 'window.close':
                // args[0] should be appId usually, but for security we should only allow closing own window
                // But here we might pass the appId from the message context
                return 
            case 'alert':
                alert(`[Sandbox App]: ${args[0]}`)
                return
            default:
                throw new Error(`Unknown system call: ${method}`)
        }
    }

    private sendResult(source: Window, msgId: string, result: any) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            result
        } as SysCallResponse, '*' as any)
    }

    private sendError(source: Window, msgId: string, error: string) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            error
        } as SysCallResponse, '*' as any)
    }
}

export const Kernel = KernelSystem.getInstance()
