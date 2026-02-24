import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProcessControlBlock, ProcessStatus, ProcessPriority } from './process/types'
import { updateAllProcesses } from './process/simulator'
import { eventBus } from './EventBus'

// Re-export types for backward compatibility
export type { ProcessControlBlock, ProcessStatus, ProcessPriority } from './process/types'

interface ProcessState {
    processes: Record<number, ProcessControlBlock>
    nextPid: number

    // Selectors
    getProcessList: () => ProcessControlBlock[]
    getTotalCpu: () => number
    getTotalMem: () => number
    getProcessCount: () => number

    // Actions
    createProcess: (appId: string, name: string, windowId?: string) => number
    updateProcessStatus: (pid: number, status: ProcessStatus) => void
    setProcessPriority: (pid: number, priority: ProcessPriority) => void
    killProcess: (pid: number) => void
    getProcessByWindowId: (windowId: string) => ProcessControlBlock | undefined
    tick: () => void
}

export const useProcessStore = create<ProcessState>()(
    persist(
        (set, get) => ({
            processes: {},
            nextPid: 1000, // User processes start from 1000

            // Selectors
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
                    memoryUsage: Math.floor(Math.random() * 40) + 20, // 20-60MB initial
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
                
                // Emit event so other stores (like WindowStore) can react
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

// --- Worker Integration ---

let worker: Worker | null = null;

if (typeof window !== 'undefined') {
    worker = new Worker(new URL('./worker/process.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e) => {
        const { processes } = e.data
        const store = useProcessStore.getState()
        
        // Update store with calculated metrics
        // We need to merge metrics back carefully to not overwrite other state changes
        // But since this is a simulation, we assume process list stability for now or just update metrics
        
        // Optimization: Convert array back to map
        const updatedMap = { ...store.processes }
        
        processes.forEach((p: ProcessControlBlock) => {
            if (updatedMap[p.pid]) {
                updatedMap[p.pid] = { 
                    ...updatedMap[p.pid], 
                    cpuUsage: p.cpuUsage, 
                    memoryUsage: p.memoryUsage 
                }
            }
        })
        
        useProcessStore.setState({ processes: updatedMap })
    }

    // Start the loop
    setInterval(() => {
        const store = useProcessStore.getState()
        const processList = Object.values(store.processes)
        if (processList.length > 0 && worker) {
            worker.postMessage({ processes: processList })
        }
    }, 2000)
}

// 监听应用启动事件，自动创建进程
eventBus.on('app:launched', ({ appId, windowId }) => {
    const store = useProcessStore.getState()
    store.createProcess(appId, appId, windowId)
})

// 监听窗口关闭事件，自动终止进程
eventBus.on('window:closed', ({ id }) => {
    const store = useProcessStore.getState()
    const process = store.getProcessByWindowId(id)
    if (process) {
        store.killProcess(process.pid)
    }
})
