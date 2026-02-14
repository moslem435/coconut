/// <reference lib="webworker" />

import { ProcessControlBlock, ProcessPriority } from '../process/types'

// Re-implement simulation logic here to avoid importing from non-worker modules
// (or ensure simulator.ts is worker-safe, which it seems to be)

const PRIORITY_CPU_BASE: Record<ProcessPriority, number> = {
    high: 15,
    normal: 8,
    low: 3
}

const PRIORITY_MEM_BASE: Record<ProcessPriority, number> = {
    high: 80,
    normal: 50,
    low: 30
}

function updateProcessMetrics(
    pcb: ProcessControlBlock,
    totalProcesses: number
): void {
    if (pcb.status !== 'running') {
        pcb.cpuUsage = 0
        pcb.memoryUsage = pcb.memoryUsage || PRIORITY_MEM_BASE[pcb.priority]
        return
    }

    const baseCpu = PRIORITY_CPU_BASE[pcb.priority]
    const jitter = Math.random() * 10 - 5
    const congestionPenalty = Math.max(0, (totalProcesses - 3) * 2)

    pcb.cpuUsage = Math.max(0, Math.min(100, baseCpu + jitter - congestionPenalty))

    const currentMem = pcb.memoryUsage || PRIORITY_MEM_BASE[pcb.priority]
    const memDrift = Math.random() * 3 - 1
    const runtime = (Date.now() - pcb.startTime) / 1000
    const memGrowth = Math.min(20, runtime / 60)

    pcb.memoryUsage = Math.round(Math.min(500, currentMem + memDrift + memGrowth))
}

self.onmessage = (e: MessageEvent<{ processes: ProcessControlBlock[] }>) => {
    const { processes } = e.data
    const runningCount = processes.filter(p => p.status === 'running').length

    processes.forEach(pcb => {
        updateProcessMetrics(pcb, runningCount)
    })

    self.postMessage({ processes })
}
