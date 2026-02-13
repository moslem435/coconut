import { ProcessControlBlock, ProcessPriority } from './types'

/**
 * Simplified Process Simulator
 * Provides realistic-looking CPU and memory usage without complex measurements
 */

// Base resource usage by priority
const PRIORITY_CPU_BASE = {
    high: 15,
    normal: 8,
    low: 3
}

const PRIORITY_MEM_BASE = {
    high: 80,
    normal: 50,
    low: 30
}

/**
 * Update CPU and memory usage for a single process
 */
export function updateProcessMetrics(
    pcb: ProcessControlBlock,
    totalProcesses: number
): void {
    if (pcb.status !== 'running') {
        pcb.cpuUsage = 0
        pcb.memoryUsage = pcb.memoryUsage || PRIORITY_MEM_BASE[pcb.priority]
        return
    }

    // CPU: Base + jitter - penalty for multiple processes
    const baseCpu = PRIORITY_CPU_BASE[pcb.priority]
    const jitter = Math.random() * 10 - 5 // -5 to +5
    const congestionPenalty = Math.max(0, (totalProcesses - 3) * 2) // Slow down if too many processes

    pcb.cpuUsage = Math.max(0, Math.min(100, baseCpu + jitter - congestionPenalty))

    // Memory: Gradual increase over time with small variation
    const currentMem = pcb.memoryUsage || PRIORITY_MEM_BASE[pcb.priority]
    const memDrift = Math.random() * 3 - 1 // -1 to +2 (slight upward drift)
    const runtime = (Date.now() - pcb.startTime) / 1000 // seconds
    const memGrowth = Math.min(20, runtime / 60) // Up to 20MB growth per minute

    pcb.memoryUsage = Math.round(Math.min(500, currentMem + memDrift + memGrowth))
}

/**
 * Batch update all processes
 */
export function updateAllProcesses(processes: ProcessControlBlock[]): void {
    const runningCount = processes.filter(p => p.status === 'running').length

    processes.forEach(pcb => {
        updateProcessMetrics(pcb, runningCount)
    })
}

/**
 * Get system-wide totals
 */
export function getSystemTotals(processes: ProcessControlBlock[]): {
    totalCpu: number
    totalMem: number
} {
    return processes.reduce(
        (acc, p) => ({
            totalCpu: acc.totalCpu + (p.cpuUsage || 0),
            totalMem: acc.totalMem + (p.memoryUsage || 0)
        }),
        { totalCpu: 0, totalMem: 0 }
    )
}
