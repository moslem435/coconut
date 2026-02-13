import { create } from 'zustand'
import { ProcessControlBlock, ProcessStatus, ProcessPriority } from './process/types'
import { updateAllProcesses } from './process/simulator'

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

export const useProcessStore = create<ProcessState>((set, get) => ({
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
        set(state => {
            const { [pid]: removed, ...rest } = state.processes
            console.log(`[ProcessManager] Killed Process ${pid}`)
            return { processes: rest }
        })
    },

    getProcessByWindowId: (windowId) => {
        return Object.values(get().processes).find(p => p.windowId === windowId)
    },

    tick: () => {
        set(state => {
            const processList = Object.values(state.processes)

            // Update all process metrics using the simplified simulator
            updateAllProcesses(processList)

            // Build updated processes map
            const updatedProcesses = processList.reduce((acc, pcb) => {
                acc[pcb.pid] = pcb
                return acc
            }, {} as Record<number, ProcessControlBlock>)

            return { processes: updatedProcesses }
        })
    }
}))
