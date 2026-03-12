/**
 * @fileoverview Coconut OS 内核 - 系统调用与进程调度核心
 * 
 * 架构设计：
 * - 单例模式：确保整个应用只有一个内核实例
 * - 事件驱动：通过postMessage与iframe中的应用通信
 * - 优先级调度：基于进程优先级的事件队列处理
 * - 权限控制：根据应用注册信息检查系统调用权限
 * 
 * 核心功能：
 * - 系统调用分发与执行(fs.readFile, window.close等)
 * - 事件总线管理(发布/订阅模式)
 * - 任务调度与优先级管理
 * 
 * @author yume
 * @created 2026-02-12
 * @lastModified 2026-02-24
 * @module src/os/kernel/Kernel
 */

import { APPS_REGISTRY } from '@/os/registry/config'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useProcessStore, ProcessPriority } from '@/os/kernel/useProcessStore'

/**
 * 系统调用参数类型映射
 * 
 * 为什么使用映射类型而非any：
 * - 提供类型安全，编译时检查参数类型
 * - 支持IDE自动补全和类型提示
 * - 便于后续扩展新的系统调用
 */
export type SysCallArgs = {
    'process.exit': []
    'fs.readFile': [path: string]
    'fs.writeFile': [path: string, content: string | Uint8Array]
    'fs.readDir': [path: string]
    'window.close': []
    'alert': [message: string]
    'event.subscribe': [topic: string]
    'event.unsubscribe': [topic: string]
    'event.publish': [topic: string, payload: unknown]
}

/**
 * 系统调用方法名称类型
 * 从SysCallArgs自动推导，确保方法名与参数类型一致
 */
export type SysCallMethod = keyof SysCallArgs

/**
 * 系统调用消息结构
 * 
 * 为什么使用泛型：
 * - 根据method自动推断args类型
 * - 编译时确保参数类型匹配
 */
export type SysCallMessage<M extends SysCallMethod = SysCallMethod> = {
    /** 消息唯一标识，用于关联请求与响应 */
    id: string
    /** 消息类型标识 */
    type: 'SYSCALL'
    /** 发起调用的应用ID */
    appId: string
    /** 调用的系统方法名 */
    method: M
    /** 方法参数，类型由method决定 */
    args: SysCallArgs[M]
}

/**
 * 系统调用响应结构
 * 
 * 设计说明：
 * - 使用result和error互斥字段，模拟Rust的Result类型
 * - 避免使用异常控制流，提高性能
 */
export type SysCallResponse<T = unknown> = {
    /** 对应请求的消息ID */
    id: string
    /** 响应类型标识 */
    type: 'SYSCALL_RESULT'
    /** 调用成功时的返回值 */
    result?: T
    /** 调用失败时的错误信息 */
    error?: string
}

/**
 * 内核事件结构
 * 
 * 用途：
 * - 应用间通信的载体
 * - 支持任意类型的payload
 */
export type KernelEvent<T = unknown> = {
    /** 事件类型标识 */
    type: 'EVENT'
    /** 事件主题/频道 */
    topic: string
    /** 事件负载数据 */
    payload: T
}

/**
 * 事件总线类 - 应用间通信的核心
 * 
 * 架构设计：
 * - 发布/订阅模式：解耦事件生产者和消费者
 * - 按主题订阅：支持细粒度的事件过滤
 * - 窗口级管理：每个订阅关联到具体iframe窗口
 * 
 * 为什么需要origin：
 * - postMessage需要指定目标origin以确保安全
 * - 防止消息发送到非预期的窗口
 */
class EventBus {
    /**
     * 订阅者存储结构
     * Map<主题, Set<{窗口, 来源域名}>>
     * 
     * 为什么使用Set：
     * - 自动去重，防止同一窗口重复订阅
     * - 支持高效的添加、删除、遍历操作
     */
    private subscribers: Map<string, Set<{ window: Window, origin: string }>> = new Map()

    /**
     * 订阅指定主题的事件
     * 
     * @param topic - 事件主题/频道
     * @param source - 订阅者的窗口对象(通常是iframe.contentWindow)
     * @param origin - 窗口的origin，用于postMessage安全校验
     */
    subscribe(topic: string, source: Window, origin: string) {
        // 延迟初始化主题集合，减少内存占用
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set())
        }
        // 防止同一窗口重复订阅同一主题
        // 为什么需要检查：避免同一事件被同一窗口多次接收
        const topicSubs = this.subscribers.get(topic)!
        const exists = Array.from(topicSubs).some(s => s.window === source)
        if (!exists) {
            topicSubs.add({ window: source, origin })
        }
    }

    /**
     * 取消订阅指定主题
     * 
     * @param topic - 事件主题
     * @param source - 要取消订阅的窗口对象
     */
    unsubscribe(topic: string, source: Window) {
        const topicSubs = this.subscribers.get(topic)
        if (topicSubs) {
            // 遍历查找并删除匹配的订阅
            // 为什么使用for...of而非filter：直接操作Set更高效，避免创建新集合
            for (const sub of topicSubs) {
                if (sub.window === source) {
                    topicSubs.delete(sub)
                    break
                }
            }
        }
    }

    /**
     * 发布事件到指定主题的所有订阅者
     * 
     * @param topic - 事件主题
     * @param payload - 事件数据
     * @param senderOrigin - 发送者origin，用于安全校验
     */
    publish(topic: string, payload: unknown, senderOrigin: string) {
        const targets = this.subscribers.get(topic)
        if (targets) {
            targets.forEach(sub => {
                // 处理origin为'null'的情况(本地文件协议)
                // 为什么需要转换：本地文件iframe的origin是字符串'null'，需要转为'*'才能postMessage
                const targetOrigin = sub.origin === 'null' ? '*' : sub.origin
                
                // 发送事件消息到订阅窗口
                sub.window.postMessage({
                    type: 'EVENT',
                    topic,
                    payload
                } as KernelEvent, targetOrigin)
            })
        }
    }
}

/**
 * 调度任务结构
 * 
 * 调度策略说明：
 * - priority: 数值越大优先级越高，高优先级任务优先执行
 * - timestamp: 用于同优先级任务按FIFO顺序执行
 */
type SchedulerTask = {
    /** 系统调用消息 */
    message: SysCallMessage
    /** 消息来源窗口 */
    source: Window
    /** 消息来源origin */
    origin: string
    /** 任务优先级，数值越大优先级越高 */
    priority: number
    /** 任务创建时间戳，用于同优先级排序 */
    timestamp: number
}

/**
 * 内核系统主类 - 单例模式
 * 
 * 架构设计：
 * - 单例模式确保全局唯一实例
 * - 任务队列实现异步非阻塞处理
 * - requestAnimationFrame实现协作式多任务
 * 
 * 为什么使用单例：
 * - 内核是系统级资源，多个实例会导致状态不一致
 * - 简化全局访问，避免层层传递
 */
class KernelSystem {
    /** 单例实例 */
    private static instance: KernelSystem
    /** 事件总线实例 */
    private eventBus = new EventBus()
    /** 任务队列 - 待处理的系统调用 */
    private taskQueue: SchedulerTask[] = []
    /** 处理状态锁 - 防止并发处理 */
    private isProcessing = false
    
    /**
     * 私有构造函数 - 防止外部实例化
     * 
     * 初始化流程：
     * 1. 注册message事件监听器，接收iframe的系统调用
     * 2. 启动调度器循环
     */
    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this))
            // 启动调度器循环，开始处理任务队列
            this.schedulerLoop()
        }
    }

    /**
     * 获取内核单例实例
     * 
     * @returns KernelSystem单例
     */
    public static getInstance(): KernelSystem {
        if (!KernelSystem.instance) {
            KernelSystem.instance = new KernelSystem()
        }
        return KernelSystem.instance
    }

    /**
     * 初始化内核
     * 
     * 为什么需要显式init：
     * - 与构造函数分离，允许延迟初始化
     * - 提供初始化完成的确认点
     */
    public init() {
        console.log('[Kernel] Initialized')
    }

    /**
     * 获取应用对应的进程优先级
     * 
     * 优先级映射：
     * - high: 2 (高优先级，如系统应用)
     * - normal: 1 (默认优先级)
     * - low: 0 (低优先级，如后台任务)
     * 
     * @param appId - 应用ID
     * @returns 优先级数值，越大优先级越高
     */
    private getProcessPriority(appId: string): number {
        const processes = Object.values(useProcessStore.getState().processes)
        // 查找该应用的运行中进程
        const proc = processes.find(p => p.appId === appId && p.status === 'running')
        if (!proc) return 1 // 默认普通优先级

        switch (proc.priority) {
            case 'high': return 2
            case 'normal': return 1
            case 'low': return 0
            default: return 1
        }
    }

    /**
     * 调度器主循环
     * 
     * 调度算法：
     * 1. 按优先级降序排序(高优先级优先)
     * 2. 同优先级按时间戳升序(FIFO)
     * 3. 取出队首任务执行
     * 
     * 为什么使用requestAnimationFrame：
     * - 与浏览器渲染循环同步，避免阻塞UI
     * - 实现协作式多任务，每个任务执行后让出控制权
     */
    private async schedulerLoop() {
        if (this.taskQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true
            
            // 排序策略：优先级降序，同优先级按时间戳升序(FIFO)
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
        
        // 使用requestAnimationFrame实现协作式调度
        requestAnimationFrame(() => this.schedulerLoop())
    }

    /**
     * 处理单个调度任务
     * 
     * 错误处理策略：
     * - 使用try-catch捕获执行异常
     * - 错误信息通过postMessage返回，而非抛出
     * 
     * @param task - 调度任务
     */
    private async processTask(task: SchedulerTask) {
        const { message: data, source, origin } = task
        
        try {
            // 执行系统调用并获取结果
            const result = await this.executeSysCall(data.method, data.args, source, origin)
            // 发送成功响应
            this.sendResult(source, data.id, result, origin)
        } catch (error: any) {
            // 发送错误响应，不中断调度器运行
            this.sendError(source, data.id, error.message, origin)
        }
    }

    /**
     * 处理来自iframe的postMessage消息
     * 
     * 处理流程：
     * 1. 基础校验：检查消息格式和必需字段
     * 2. 应用校验：确认应用ID已注册
     * 3. 权限校验：检查应用是否有权限调用该方法
     * 4. 入队：将任务加入调度队列
     * 
     * @param event - MessageEvent事件对象
     */
    private async handleMessage(event: MessageEvent) {
        const data = event.data as SysCallMessage
        
        // 基础校验：确保是有效的系统调用消息
        if (!data || data.type !== 'SYSCALL' || !data.appId) return

        // 校验应用是否已注册
        const app = APPS_REGISTRY[data.appId]
        if (!app) {
            this.sendError(event.source as Window, data.id, 'Unknown App ID', event.origin)
            return
        }

        // 校验应用权限
        if (!this.checkPermission(app.id, data.method)) {
             console.warn(`[Kernel] Permission Denied: App ${app.id} tried to call ${data.method}`)
             this.sendError(event.source as Window, data.id, `Permission Denied: ${data.method}`, event.origin)
             return
        }

        // 获取进程优先级并入队
        const priority = this.getProcessPriority(data.appId)
        this.taskQueue.push({
            message: data,
            source: event.source as Window,
            origin: event.origin,
            priority,
            timestamp: performance.now()
        })
    }

    /**
     * 检查应用是否有权限执行指定系统调用
     * 
     * 权限规则：
     * - sandbox=true且permissions未定义：拒绝所有
     * - '*'：允许所有权限
     * - 'namespace.*'：允许该命名空间下所有权限
     * - 'specific.permission'：仅允许特定权限
     * 
     * @param appId - 应用ID
     * @param method - 系统调用方法名
     * @returns 是否有权限
     */
    private checkPermission(appId: string, method: string): boolean {
        const app = APPS_REGISTRY[appId]
        if (!app) return false
        
        // 沙箱应用默认拒绝所有权限
        // 为什么这样设计：遵循最小权限原则，未明确授权的权限默认拒绝
        if (app.sandbox && !app.permissions) return false

        // 权限匹配逻辑
        const requiredPermission = method
        
        // 支持通配符匹配：'*'匹配所有，'prefix.*'匹配前缀
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

    /**
     * 执行系统调用
     * 
     * 支持的系统调用：
     * - process.exit: 进程退出
     * - fs.readFile: 读取文件内容
     * - fs.writeFile: 写入文件
     * - fs.readDir: 读取目录
     * - window.close: 关闭窗口
     * - alert: 显示系统警告
     * - event.subscribe/unsubscribe/publish: 事件总线操作
     * 
     * @param method - 系统调用方法名
     * @param args - 方法参数数组
     * @param source - 调用来源窗口
     * @param origin - 调用来源origin
     * @returns 系统调用结果
     * @throws 未知系统调用时抛出错误
     */
    private async executeSysCall(method: string, args: unknown[], source: Window, origin: string): Promise<unknown> {
        console.log(`[Kernel] Executing ${method}`, args)

        switch (method) {
            case 'process.exit':
                // 进程退出由进程管理器处理，此处仅作占位
                return
            case 'fs.readFile':
                // 读取文件并解码为UTF-8字符串
                const content = await fs.readFile(args[0] as string)
                return new TextDecoder().decode(content)
            case 'fs.writeFile':
                // 写入文件内容
                return fs.writeFile(args[0] as string, args[1] as string)
            case 'fs.readDir':
                // 读取目录内容列表
                return fs.readdir(args[0] as string)
            case 'window.close':
                // 窗口关闭由窗口管理器处理，此处仅作占位
                return 
            case 'alert':
                // 显示系统警告对话框
                useDialogStore.getState().openAlert('System Alert', args[0] as string)
                return
            case 'event.subscribe':
                // 订阅指定主题的事件
                this.eventBus.subscribe(args[0] as string, source, origin)
                return true
            case 'event.unsubscribe':
                // 取消订阅指定主题
                this.eventBus.unsubscribe(args[0] as string, source)
                return true
            case 'event.publish':
                // 发布事件到指定主题
                this.eventBus.publish(args[0] as string, args[1], origin)
                return true
            default:
                // 未知系统调用抛出错误
                throw new Error(`Unknown system call: ${method}`)
        }
    }

    /**
     * 发送系统调用成功响应
     * 
     * @param source - 目标窗口
     * @param msgId - 对应请求的消息ID
     * @param result - 调用结果
     * @param targetOrigin - 目标origin
     */
    private sendResult(source: Window, msgId: string, result: unknown, targetOrigin: string) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            result
        } as SysCallResponse, targetOrigin)
    }

    /**
     * 发送系统调用错误响应
     * 
     * @param source - 目标窗口
     * @param msgId - 对应请求的消息ID
     * @param error - 错误信息
     * @param targetOrigin - 目标origin
     */
    private sendError(source: Window, msgId: string, error: string, targetOrigin: string) {
        source.postMessage({
            id: msgId,
            type: 'SYSCALL_RESULT',
            error
        } as SysCallResponse, targetOrigin)
    }
}

/**
 * 内核单例导出
 * 
 * 为什么使用单例导出而非类：
 * - 简化导入和使用
 * - 确保全局唯一实例
 */
export const Kernel = KernelSystem.getInstance()
