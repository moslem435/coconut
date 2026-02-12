import { create } from 'zustand'

export type ProcessStatus = 'starting' | 'running' | 'suspended' | 'terminated' | 'error'

export interface ProcessControlBlock {
    pid: number
    name: string
    appId: string
    status: ProcessStatus
    windowId?: string
    startTime: number
    memoryUsage?: number // Simulated in MB
    cpuUsage?: number // Simulated %
}

interface ProcessState {
    processes: Record<number, ProcessControlBlock>
    nextPid: number
    
    // Actions
    createProcess: (appId: string, name: string, windowId?: string) => number
    updateProcessStatus: (pid: number, status: ProcessStatus) => void
    killProcess: (pid: number) => void
    getProcessByWindowId: (windowId: string) => ProcessControlBlock | undefined
}

export const useProcessStore = create<ProcessState>((set, get) => ({
    processes: {},
    nextPid: 1000, // User processes start from 1000

    createProcess: (appId, name, windowId) => {
        const pid = get().nextPid
        const pcb: ProcessControlBlock = {
            pid,
            name,
            appId,
            status: 'starting',
            windowId,
            startTime: Date.now(),
            memoryUsage: Math.floor(Math.random() * 50) + 10, // Sim 10-60MB
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

    killProcess: (pid) => {
        set(state => {
            const { [pid]: removed, ...rest } = state.processes
            console.log(`[ProcessManager] Killed Process ${pid}`)
            return { processes: rest }
        })
    },

    getProcessByWindowId: (windowId) => {
        return Object.values(get().processes).find(p => p.windowId === windowId)
    }
}))
