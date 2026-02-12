'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useProcessStore, ProcessControlBlock } from '@/os/kernel/useProcessStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { XCircle, RefreshCw } from 'lucide-react'

export default function TaskManager() {
    const killProcess = useProcessStore(state => state.killProcess)
    const setProcessPriority = useProcessStore(state => state.setProcessPriority)
    const { closeWindow } = useWindowStore()
    
    // Optimized: Only subscribe to what we need
    const [processList, setProcessList] = useState<ProcessControlBlock[]>([])
    const [totalCpu, setTotalCpu] = useState(0)
    const [totalMem, setTotalMem] = useState(0)
    
    // Canvas for CPU chart
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const cpuHistoryRef = useRef<number[]>([])

    useEffect(() => {
        // Optimized: Use selectors to minimize re-renders
        const update = () => {
            const store = useProcessStore.getState()
            setProcessList(store.getProcessList())
            setTotalCpu(store.getTotalCpu())
            setTotalMem(store.getTotalMem())
            
            // Update CPU chart
            const cpu = Math.min(100, store.getTotalCpu())
            cpuHistoryRef.current.push(cpu)
            if (cpuHistoryRef.current.length > 60) {
                cpuHistoryRef.current.shift()
            }
            drawCpuChart()
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    const drawCpuChart = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        const width = canvas.width
        const height = canvas.height
        const history = cpuHistoryRef.current
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
        }
        
        // Draw CPU line
        if (history.length > 1) {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2
            ctx.beginPath()
            
            history.forEach((cpu, i) => {
                const x = (width / 60) * i
                const y = height - (cpu / 100) * height
                if (i === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            })
            
            ctx.stroke()
            
            // Fill area under line
            ctx.lineTo(width, height)
            ctx.lineTo(0, height)
            ctx.closePath()
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
            ctx.fill()
        }
    }

    const handleEndTask = (pid: number, windowId?: string) => {
        killProcess(pid)
        if (windowId) {
            closeWindow(windowId)
        }
    }

    return (
        <div className="h-full w-full bg-slate-900 text-slate-200 flex flex-col font-sans text-sm pt-10">
            {/* Header with CPU Chart */}
            <div className="p-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-slate-100">Processes ({processList.length})</div>
                    <div className="flex gap-2">
                        <div className="px-2 py-1 bg-slate-700 rounded text-xs">CPU: {Math.min(100, Math.round(totalCpu))}%</div>
                        <div className="px-2 py-1 bg-slate-700 rounded text-xs">Mem: {totalMem} MB</div>
                    </div>
                </div>
                {/* CPU Chart */}
                <canvas 
                    ref={canvasRef} 
                    width={600} 
                    height={60}
                    className="w-full h-[60px] bg-slate-950 rounded"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 text-slate-400 sticky top-0">
                        <tr>
                            <th className="p-2 font-medium w-16">PID</th>
                            <th className="p-2 font-medium">Name</th>
                            <th className="p-2 font-medium w-24">Status</th>
                            <th className="p-2 font-medium w-24">Priority</th>
                            <th className="p-2 font-medium w-20">Mem</th>
                            <th className="p-2 font-medium w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processList.map(p => (
                            <tr key={p.pid} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                <td className="p-2 font-mono text-slate-500">{p.pid}</td>
                                <td className="p-2 font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        {p.name}
                                        {p.windowId && <span className="text-[10px] px-1 bg-blue-900/50 text-blue-300 rounded border border-blue-800">GUI</span>}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        p.status === 'running' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' :
                                        p.status === 'starting' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="p-2">
                                    <select 
                                        value={p.priority} 
                                        onChange={(e) => setProcessPriority(p.pid, e.target.value as any)}
                                        className="bg-slate-800 text-xs rounded border border-slate-700 p-1 outline-none focus:border-blue-500"
                                    >
                                        <option value="high">High</option>
                                        <option value="normal">Normal</option>
                                        <option value="low">Low</option>
                                    </select>
                                </td>
                                <td className="p-2 text-slate-400">{p.memoryUsage} MB</td>
                                <td className="p-2 text-right">
                                    <button 
                                        onClick={() => handleEndTask(p.pid, p.windowId)}
                                        className="p-1 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded transition-colors"
                                        title="End Task"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {processList.length === 0 && (
                    <div className="p-8 text-center text-slate-600">No active processes</div>
                )}
            </div>
            
            {/* Status Bar */}
            <div className="p-1 bg-slate-950 text-[10px] text-slate-500 flex justify-between px-3">
                <span>Total Threads: {processList.length * 4 + 12}</span>
                <span>Kernel: v1.0.1</span>
            </div>
        </div>
    )
}
