import { APPS_REGISTRY } from '@/os/registry/config'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useProcessStore, ProcessPriority } from '@/os/kernel/useProcessStore'

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

export type KernelEvent = {
    type: 'EVENT'
    topic: string
    payload: any
}

class EventBus {
    // Map<topic, Set<{ window: Window, origin: string }>>
    private subscribers: Map<string, Set<{ window: Window, origin: string }>> = new Map()

    subscribe(topic: string, source: Window, origin: string) {
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set())
        }
        // Avoid duplicate subscriptions from same window+origin
        const topicSubs = this.subscribers.get(topic)!
        const exists = Array.from(topicSubs).some(s => s.window === source)
        if (!exists) {
            topicSubs.add({ window: source, origin })
        }
    }

    unsubscribe(topic: string, source: Window) {
        const topicSubs = this.subscribers.get(topic)
        if (topicSubs) {
            // Find and remove the subscription for this window
            for (const sub of topicSubs) {
                if (sub.window === source) {
                    topicSubs.delete(sub)
                    break
                }
            }
        }
    }

    publish(topic: string, payload: any, senderOrigin: string) {
        const targets = this.subscribers.get(topic)
        if (targets) {
            targets.forEach(sub => {
                // Security Check: Only send to the origin that subscribed
                // If origin is null/opaque (e.g. sandboxed iframe without allow-same-origin), we might need to be careful.
                // But generally, postMessage targetOrigin should match the subscriber's origin.
                
                // For 'null' origin (common in sandboxed iframes), we might have to use '*' if we want to support them,
                // BUT the goal here is security. 
                // If origin is 'null', targetOrigin '*' is required but risky.
                // However, if we recorded 'null' during subscribe, we know it's the same 'null' context (conceptually).
                // Browser postMessage with targetOrigin '/' or specific domain is best.
                
                const targetOrigin = sub.origin === 'null' ? '*' : sub.origin
                
                sub.window.postMessage({
                    type: 'EVENT',
                    topic,
                    payload
                } as KernelEvent, targetOrigin)
            })
        }
    }
}

type SchedulerTask = {
    message: SysCallMessage
    source: Window
    origin: string
    priority: number // Higher is better
    timestamp: number
}

class KernelSystem {
    private static instance: KernelSystem
    private eventBus = new EventBus()
    private taskQueue: SchedulerTask[] = []
    private isProcessing = false
    
    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this))
            // Start scheduler loop
            this.schedulerLoop()
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

    private getProcessPriority(appId: string): number {
        const processes = Object.values(useProcessStore.getState().processes)
        // Find any running process for this app
        const proc = processes.find(p => p.appId === appId && p.status === 'running')
        if (!proc) return 1 // Default Normal

        switch (proc.priority) {
            case 'high': return 2
            case 'normal': return 1
            case 'low': return 0
            default: return 1
        }
    }

    private async schedulerLoop() {
        if (this.taskQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true
            
            // Sort by priority (desc) then timestamp (asc)
            this.taskQueue.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority
                return a.timestamp - b.timestamp
            })

            const task = this.taskQueue.shift()
            if (task) {
                await this.processTask(task)
            }
            
            this.isProcessing = false
        }
        
        // Use requestAnimationFrame or setTimeout for loop
        requestAnimationFrame(() => this.schedulerLoop())
    }

    private async processTask(task: SchedulerTask) {
        const { message: data, source, origin } = task
        
        try {
            const result = await this.executeSysCall(data.method, data.args, source, origin)
            this.sendResult(source, data.id, result, origin)
        } catch (error: any) {
            this.sendError(source, data.id, error.message, origin)
        }
    }

    private async handleMessage(event: MessageEvent) {
        const data = event.data as SysCallMessage
        
        // Basic validation
        if (!data || data.type !== 'SYSCALL' || !data.appId) return

        // Validate App exists
        const app = APPS_REGISTRY[data.appId]
        if (!app) {
            this.sendError(event.source as Window, data.id, 'Unknown App ID', event.origin)
            return
        }

        // Validate Permissions
        if (!this.checkPermission(app.id, data.method)) {
             console.warn(`[Kernel] Permission Denied: App ${app.id} tried to call ${data.method}`)
             this.sendError(event.source as Window, data.id, `Permission Denied: ${data.method}`, event.origin)
             return
        }

        // Enqueue Task
        const priority = this.getProcessPriority(data.appId)
        this.taskQueue.push({
            message: data,
            source: event.source as Window,
            origin: event.origin,
            priority,
            timestamp: performance.now()
        })
    }

    private checkPermission(appId: string, method: string): boolean {
        const app = APPS_REGISTRY[appId]
        if (!app) return false
        
        // Default: Deny everything if sandbox is true and no permissions listed
        if (app.sandbox && !app.permissions) return false

        // Check explicit permissions
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

    private async executeSysCall(method: string, args: any[], source: Window, origin: string): Promise<any> {
        console.log(`[Kernel] Executing ${method}`, args)

        switch (method) {
            case 'process.exit':
                return
            case 'fs.readFile':
                const content = await fs.readFile(args[0])
                return new TextDecoder().decode(content)
            case 'fs.writeFile':
                return fs.writeFile(args[0], args[1])
            case 'fs.readDir':
                return fs.readdir(args[0])
            case 'window.close':
                return 
            case 'alert':
                alert(`[Sandbox App]: ${args[0]}`)
                return
            case 'event.subscribe':
                this.eventBus.subscribe(args[0], source, origin)
                return true
            case 'event.unsubscribe':
                this.eventBus.unsubscribe(args[0], source)
                return true
            case 'event.publish':
                this.eventBus.publish(args[0], args[1], origin)
                return true
            default:
                throw new Error(`Unknown system call: ${method}`)
        }
    }

    private sendResult(source: Window, msgId: string, result: any, targetOrigin: string) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            result
        } as SysCallResponse, targetOrigin)
    }

    private sendError(source: Window, msgId: string, error: string, targetOrigin: string) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            error
        } as SysCallResponse, targetOrigin)
    }
}

export const Kernel = KernelSystem.getInstance()
