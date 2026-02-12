import { create } from 'zustand'

export type ProcessStatus = 'starting' | 'running' | 'suspended' | 'terminated' | 'error'
export type ProcessPriority = 'high' | 'normal' | 'low'

export interface ProcessControlBlock {
    pid: number
    name: string
    appId: string
    status: ProcessStatus
    priority: ProcessPriority
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
    setProcessPriority: (pid: number, priority: ProcessPriority) => void
    killProcess: (pid: number) => void
    getProcessByWindowId: (windowId: string) => ProcessControlBlock | undefined
    tick: () => void
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
            priority: 'normal',
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
            const newProcesses = { ...state.processes }
            let changed = false
            
            // 1. Measure Memory (Real)
            // @ts-ignore
            const perfMemory = window.performance?.memory
            const totalJSHeap = perfMemory ? Math.round(perfMemory.usedJSHeapSize / 1024 / 1024) : 0

            // 2. Measure CPU Load (Main Thread Blocking Time)
            // We use the time since last tick to detect lag.
            // Expected tick is called via setInterval every ~2000ms in Shell.tsx (but we might want faster ticks for smoother UI)
            // Actually, to measure blocking, we need to compare actual time vs expected time.
            const now = performance.now()
            const lastTick = (state as any).lastTick || now
            const delta = now - lastTick
            // Store lastTick for next run (using a hidden property on state or just assume small drift)
            // Ideally we'd store it in the store but that triggers rerenders. 
            // Let's use a module-level variable or just re-calculate based on expected interval if passed.
            // Simplified: Use a tight loop performance check
            
            // Better approach for "Load":
            // Use performance.getEntriesByType('longtask') if available (Chrome only)
            // or just assume if we are running, we use some CPU.
            
            let systemLoad = 0
            if (typeof PerformanceObserver !== 'undefined') {
                 // We can't synchronously get load, but we can check if there were long tasks recently.
                 // For now, let's implement a "Lag Meter":
                 // If delta > expected (2000ms) + 100ms, we are lagging.
                 const expected = 2000
                 const lag = Math.max(0, delta - expected)
                 // Map lag to 0-100% CPU. e.g. 500ms lag = 100% CPU
                 systemLoad = Math.min(100, (lag / 500) * 100)
            }
            
            // Add a base load if any process is running (OS overhead)
            const runningProcesses = Object.values(newProcesses).filter(p => p.status === 'running')
            const totalRunning = runningProcesses.length
            if (totalRunning > 0) {
                systemLoad = Math.max(systemLoad, 5) // Minimum 5% if anything runs
            }

            // Distribute System Load among processes based on priority
            const totalWeight = runningProcesses.reduce((acc, p) => {
                const weight = p.priority === 'high' ? 3 : (p.priority === 'low' ? 0.5 : 1)
                return acc + weight
            }, 0)

            Object.values(newProcesses).forEach(p => {
                if (p.status !== 'running') {
                    if (p.cpuUsage !== 0) {
                        p.cpuUsage = 0
                        changed = true
                    }
                    return
                }
                
                // Calculate Share
                const weight = p.priority === 'high' ? 3 : (p.priority === 'low' ? 0.5 : 1)
                const share = totalWeight > 0 ? (weight / totalWeight) : 0
                
                // Assign CPU Usage
                // Real system load + some per-process jitter to look alive
                const jitter = Math.random() * 5
                const newCpu = Math.min(100, Math.round((systemLoad * share) + jitter))
                
                // Memory Distribution (Same as before)
                let newMem = 0
                if (totalJSHeap > 0) {
                     const memShare = (totalJSHeap / totalRunning) * weight
                     newMem = Math.round(memShare)
                } else {
                    const memVariation = Math.floor(Math.random() * 5) - 2
                    newMem = Math.max(10, (p.memoryUsage || 20) + memVariation)
                }

                if (p.cpuUsage !== newCpu || p.memoryUsage !== newMem) {
                    p.cpuUsage = newCpu
                    p.memoryUsage = newMem
                    changed = true
                }
            })
            
            // Save lastTick in a way that doesn't trigger UI updates? 
            // Actually, we are returning new state, so we can just add a hidden property or ignore it.
            // But we need it for the next calculation.
            // Let's rely on the fact that this is a closure and we can use a module variable if we wanted, 
            // but module variables reset on HMR.
            // Let's add `lastTick` to the store interface but maybe not expose it to UI?
            // Or just hack it into the state update.
            return changed ? { processes: newProcesses, lastTick: now } as any : { lastTick: now } as any
        })
    }
}))
