/**
 * @fileoverview 进程管理 Store - 程序控制块生命周期与模拟指标管理
 * 
 * 架构设计：
 * - 每个应用窗口对应一个ProcessControlBlock(PCB)，模拟操作系统进程概念
 * - CPU/内存用量在Web Worker中异步计算，避免阻塞主线程
 * - 通过EventBus与窗口管理器双向解耦：窗口关闭则进程终止，进程终止则窗口关闭
 * - 使用persist中间件永久化PCB，页面刷新后能恢复进程列表
 * 
 * 为什么PID从1000开始：
 * - 模拟真实操作系统中用户进程和系统进程的PID区间划分标准
 * 
 * @author yume
 * @created 2026-02-12
 * @lastModified 2026-02-26
 * @module src/os/kernel/useProcessStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProcessControlBlock, ProcessStatus, ProcessPriority } from './process/types'
import { updateAllProcesses } from './process/simulator'
import { eventBus } from './EventBus'

// 向后兼容：重新导出类型供现有消费者无缝切换
export type { ProcessControlBlock, ProcessStatus, ProcessPriority } from './process/types'

/**
 * 进程管理 Store 状态接口
 * 
 * 将选择器(Selectors)和操作(Actions)分开定义以便单独测试
 */
interface ProcessState {
    /** 每个key为PID的进程控制块映射表 */
    processes: Record<number, ProcessControlBlock>
    /** 下一个可用PID，单调递增不复用 */
    nextPid: number

    // 选择器
    /** 返回进程列表数组 */
    getProcessList: () => ProcessControlBlock[]
    /** 返回所有进程的CPU用量总和 */
    getTotalCpu: () => number
    /** 返回所有进程的内存用量总和(MB) */
    getTotalMem: () => number
    /** 返回当前进程总数 */
    getProcessCount: () => number

    // 操作
    /** 创建新进程，返回分配的PID */
    createProcess: (appId: string, name: string, windowId?: string) => number
    /** 更新指定进程的运行状态 */
    updateProcessStatus: (pid: number, status: ProcessStatus) => void
    /** 设置进程调度优先级 */
    setProcessPriority: (pid: number, priority: ProcessPriority) => void
    /** 终止进程并广播 process:killed 事件 */
    killProcess: (pid: number) => void
    /** 通过窗口ID查找对应的进程 */
    getProcessByWindowId: (windowId: string) => ProcessControlBlock | undefined
    /** 触发一次指标更新（已迁移至Worker） */
    tick: () => void
}

export const useProcessStore = create<ProcessState>()(
    persist(
        (set, get) => ({
            processes: {},
            nextPid: 1000, // 用户进程 PID 从 1000 起，模拟真实操作系统的用户空间PID区间

            // 选择器
            getProcessList: () => Object.values(get().processes),
            getTotalCpu: () => Object.values(get().processes).reduce((acc, p) => acc + (p.cpuUsage || 0), 0),
            getTotalMem: () => Object.values(get().processes).reduce((acc, p) => acc + (p.memoryUsage || 0), 0),
            getProcessCount: () => Object.keys(get().processes).length,

            createProcess: (appId, name, windowId) => {
                const pid = get().nextPid
                const pcb: ProcessControlBlock = {
                    pid,
                    name,
                    appId,
                    status: 'starting',
                    priority: 'normal',
                    windowId,
                    startTime: Date.now(),
                    memoryUsage: Math.floor(Math.random() * 40) + 20, // 初始内存 20-60MB，模拟真实进程内存占用
                    cpuUsage: 0
                }

                set(state => ({
                    processes: { ...state.processes, [pid]: pcb },
                    nextPid: state.nextPid + 1
                }))

                console.log(`[ProcessManager] Created Process ${pid} (${name})`)
                return pid
            },

            updateProcessStatus: (pid, status) => {
                set(state => {
                    const pcb = state.processes[pid]
                    if (!pcb) return state
                    return {
                        processes: { ...state.processes, [pid]: { ...pcb, status } }
                    }
                })
            },

            setProcessPriority: (pid, priority) => {
                set(state => {
                    const pcb = state.processes[pid]
                    if (!pcb) return state
                    return {
                        processes: { ...state.processes, [pid]: { ...pcb, priority } }
                    }
                })
            },

            killProcess: (pid) => {
                const state = get()
                const process = state.processes[pid]
                if (!process) return

                set(state => {
                    const { [pid]: removed, ...rest } = state.processes
                    return { processes: rest }
                })

                console.log(`[ProcessManager] Killed Process ${pid}`)

                // 广播进程终止事件，让窗口管理器关闭对应窗口（解耦直接调用）
                eventBus.emit('process:killed', {
                    pid,
                    appId: process.appId,
                    windowId: process.windowId
                })
            },

            getProcessByWindowId: (windowId) => {
                return Object.values(get().processes).find(p => p.windowId === windowId)
            },

            tick: () => {
                // Optimistic update via worker
                // Logic moved to ProcessWorkerClient
            }
        }),
        {
            name: 'process-storage',
            partialize: (state) => ({
                processes: state.processes,
                nextPid: state.nextPid
            })
        }
    )
)

// --- Worker 集成 ---
// 为什么使用Worker而非直接计算：指标异步计算避免每2秒刷新阻塞主线程

let worker: Worker | null = null;

if (typeof window !== 'undefined') {
    worker = new Worker(new URL('./worker/process.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e) => {
        const { processes } = e.data
        const store = useProcessStore.getState()

        // 将Worker计算出的CPU/内存指标合并回主状态
        // 为什么不直接覆盖状态：Worker执行期间可能有新进程创建/终止，直接覆盖会丢失这些变更

        // 性能优化：将Worker返回的数组转回映射，方便按PID查询
        const updatedMap = { ...store.processes }

        processes.forEach((p: ProcessControlBlock) => {
            if (updatedMap[p.pid]) {
                updatedMap[p.pid] = {
                    ...updatedMap[p.pid],
                    cpuUsage: p.cpuUsage,
                    memoryUsage: p.memoryUsage
                } as any
            }
        })

        useProcessStore.setState({ processes: updatedMap })
    }

    // 每2秒将进程列表发送到Worker计算CPU/内存指标
    // 为什么2秒间隔：既保证任务管理器数据新鲜度，又不过度消耗计算资源
    setInterval(() => {
        const store = useProcessStore.getState()
        const processList = Object.values(store.processes)
        if (processList.length > 0 && worker) {
            worker.postMessage({ processes: processList })
        }
    }, 2000)
}

// 监听应用启动事件，自动创建进程
// 为什么通过事件而非窗口Store直接调用：避免循环依赖(WindowStore依赖ProcessStore，ProcessStore反过来又依赖WindowStore)
eventBus.on('app:launched', ({ appId, windowId }) => {
    const store = useProcessStore.getState()
    store.createProcess(appId, appId, windowId)
})

// 监听窗口关闭事件，自动终止进程
// 为什么需要双向监听：窗口关闭导致进程终止，进程终止导致窗口关闭，两者应屏蔽重入
eventBus.on('window:closed', ({ id }) => {
    const store = useProcessStore.getState()
    const process = store.getProcessByWindowId(id)
    if (process) {
        store.killProcess(process.pid)
    }
})
