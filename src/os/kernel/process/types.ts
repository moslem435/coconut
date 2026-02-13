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
