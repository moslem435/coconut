import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Cpu, HardDrive, Activity, Bell, 
    RefreshCw, Trash2, Download, Power,
    CheckCircle2, AlertTriangle, Info, Loader2,
    Zap, Terminal, FileJson, Save,
    Music, Phone, X, SkipBack, Pause, SkipForward,
    AlertCircle, Globe, Gauge, Bug, Filter
} from 'lucide-react'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { eventBus, SystemEvents } from '@/os/kernel/EventBus'

export function DevTools() {
    const [activeTab, setActiveTab] = useState<'kernel' | 'storage' | 'logs'>('kernel')
    
    return (
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] w-full">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--os-text-secondary)] uppercase tracking-wider">
                    Debug Mode
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">
                    Active
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--os-border)]/50 pb-2 overflow-x-auto no-scrollbar">
                <TabButton 
                    active={activeTab === 'kernel'} 
                    onClick={() => setActiveTab('kernel')} 
                    icon={<Cpu size={14} />} 
                    label="Kernel" 
                />
                <TabButton 
                    active={activeTab === 'storage'} 
                    onClick={() => setActiveTab('storage')} 
                    icon={<HardDrive size={14} />} 
                    label="Storage" 
                />
                <TabButton 
                    active={activeTab === 'logs'} 
                    onClick={() => setActiveTab('logs')} 
                    icon={<Activity size={14} />} 
                    label="Logs" 
                />
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'kernel' && (
                        <TabContent key="kernel">
                            <KernelTab />
                        </TabContent>
                    )}
                    {activeTab === 'storage' && (
                        <TabContent key="storage">
                            <StorageTab />
                        </TabContent>
                    )}
                    {activeTab === 'logs' && (
                        <TabContent key="logs">
                            <LogsTab />
                        </TabContent>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${active 
                    ? 'bg-[var(--os-accent)]/10 text-[var(--os-accent)] border border-[var(--os-accent)]/20' 
                    : 'text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]'}
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}

function TabContent({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {children}
        </motion.div>
    )
}



function ActionButton({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
    const colorClasses: Record<string, string> = {
        green: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
        gray: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
    }

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all
                ${colorClasses[color] || colorClasses.gray}
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}

function KernelTab() {
    const { processes, killProcess } = useProcessStore()
    const processList = Object.values(processes)
    const totalCpu = processList.reduce((acc, p) => acc + (p.cpuUsage || 0), 0)
    const totalMem = processList.reduce((acc, p) => acc + (p.memoryUsage || 0), 0)

    // Force update for realtime data
    const [, forceUpdate] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="space-y-3">
            <div className="flex gap-4 text-xs text-[var(--os-text-secondary)] p-2 bg-[var(--os-bg-base)] rounded-lg border border-[var(--os-border)]">
                <div className="flex items-center gap-2">
                    <Activity size={12} />
                    <span>CPU: {totalCpu.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <HardDrive size={12} />
                    <span>MEM: {totalMem.toFixed(0)}MB</span>
                </div>
                <div className="flex items-center gap-2">
                    <Terminal size={12} />
                    <span>Procs: {processList.length}</span>
                </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar border border-[var(--os-border)] rounded-lg">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--os-bg-base)] sticky top-0">
                        <tr className="border-b border-[var(--os-border)]">
                            <th className="p-2 font-medium text-[var(--os-text-secondary)]">PID</th>
                            <th className="p-2 font-medium text-[var(--os-text-secondary)]">Name</th>
                            <th className="p-2 font-medium text-[var(--os-text-secondary)]">Mem</th>
                            <th className="p-2 font-medium text-[var(--os-text-secondary)]">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processList.map(p => (
                            <tr key={p.pid} className="border-b border-[var(--os-border)]/50 last:border-0 hover:bg-[var(--os-hover-bg)]">
                                <td className="p-2 font-mono opacity-70">{p.pid}</td>
                                <td className="p-2">{p.name}</td>
                                <td className="p-2 font-mono opacity-70">{p.memoryUsage}MB</td>
                                <td className="p-2">
                                    <button 
                                        onClick={() => killProcess(p.pid)}
                                        className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                                        title="Kill Process"
                                    >
                                        <Power size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

import { useDialogStore } from '@/os/kernel/useDialogStore'

function StorageTab() {
    const { files, createItem } = useFileSystemStore()
    const { openConfirm } = useDialogStore()
    
    const handleReset = async () => {
        const confirmed = await openConfirm(
            'Factory Reset',
            'Are you sure you want to reset the file system? This action cannot be undone.'
        )

        if (confirmed) {
            // @ts-ignore
            if (useFileSystemStore.persist) {
                // @ts-ignore
                useFileSystemStore.persist.clearStorage()
            } else {
                localStorage.removeItem('filesystem-storage')
            }
            window.location.reload()
        }
    }

    const handleExport = () => {
        const data = JSON.stringify(files, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fs-snapshot-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleTestWrite = () => {
        createItem(
            'root',
            `test-${Date.now()}.txt`,
            'file',
            'This is a test file created by Developer Tools.'
        )
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <ActionButton 
                    onClick={handleReset}
                    icon={<Trash2 size={14} />}
                    label="Factory Reset"
                    color="red"
                />
                <ActionButton 
                    onClick={handleExport}
                    icon={<Download size={14} />}
                    label="Export Snapshot"
                    color="blue"
                />
                <ActionButton 
                    onClick={handleTestWrite}
                    icon={<Save size={14} />}
                    label="Write Test File"
                    color="green"
                />
            </div>
            
            <div className="p-3 rounded-lg bg-[var(--os-bg-base)] border border-[var(--os-border)] text-xs text-[var(--os-text-secondary)] font-mono">
                <div className="flex justify-between mb-1">
                    <span>Total Files:</span>
                    <span>{Object.keys(files).length}</span>
                </div>
                <div className="flex justify-between">
                    <span>Storage Key:</span>
                    <span>filesystem-storage</span>
                </div>
            </div>
        </div>
    )
}

function LogsTab() {
    const [logs, setLogs] = useState<{
        id: string,
        time: string, 
        event: string, 
        data: any,
        category: 'system' | 'app' | 'error' | 'network' | 'perf'
    }[]>([])
    const [filter, setFilter] = useState<'all' | 'system' | 'app' | 'error' | 'network' | 'perf'>('all')
    const logsEndRef = useRef<HTMLDivElement>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        const sub = eventBus.onAny((event, data) => {
            let category: 'system' | 'app' | 'error' | 'network' | 'perf' = 'system'
            const eventStr = String(event)
            
            if (eventStr.startsWith('sys:error') || eventStr.startsWith('sys:warn')) category = 'error'
            else if (eventStr.startsWith('sys:network')) category = 'network'
            else if (eventStr.startsWith('sys:perf')) category = 'perf'
            else if (eventStr.startsWith('app:') || data?.appId) category = 'app'
            
            setLogs(prev => {
                const newLogs = [...prev, {
                    id: Math.random().toString(36).substr(2, 9),
                    time: new Date().toLocaleTimeString(),
                    event: eventStr,
                    data,
                    category
                }]
                if (newLogs.length > 200) return newLogs.slice(-200)
                return newLogs
            })
        })
        return () => sub.unsubscribe()
    }, [])

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [logs, filter])

    const filteredLogs = logs.filter(l => filter === 'all' || l.category === filter)

    const getIcon = (category: string) => {
        switch (category) {
            case 'error': return <AlertTriangle size={12} className="text-red-500" />
            case 'network': return <Globe size={12} className="text-blue-500" />
            case 'perf': return <Gauge size={12} className="text-purple-500" />
            case 'app': return <Bug size={12} className="text-green-500" />
            default: return <Activity size={12} className="text-gray-500" />
        }
    }

    return (
        <div className="space-y-3">
             <div className="flex items-center justify-between p-2 bg-[var(--os-bg-base)] rounded-lg border border-[var(--os-border)]">
                <div className="flex gap-2">
                    {['all', 'system', 'app', 'error', 'network', 'perf'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-2 py-1 text-[10px] rounded capitalize transition-colors ${
                                filter === f 
                                ? 'bg-[var(--os-accent)] text-white' 
                                : 'text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)]'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setLogs([])}
                    className="p-1 hover:bg-[var(--os-hover-bg)] rounded transition-colors text-[var(--os-text-secondary)]"
                    title="Clear Logs"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="h-[300px] overflow-y-auto custom-scrollbar border border-[var(--os-border)] rounded-lg bg-[var(--os-bg-base)] font-mono text-[10px]">
                {filteredLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--os-text-secondary)] opacity-50">
                        No {filter !== 'all' ? filter : ''} events captured
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--os-border)]/30">
                        {filteredLogs.map((log) => (
                            <div 
                                key={log.id} 
                                className={`
                                    group hover:bg-[var(--os-hover-bg)] transition-colors
                                    ${expandedId === log.id ? 'bg-[var(--os-hover-bg)]' : ''}
                                `}
                            >
                                <div 
                                    className="flex items-center gap-2 p-1.5 cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                >
                                    <span className="text-[var(--os-text-secondary)] shrink-0 w-[60px]">{log.time}</span>
                                    <span className="shrink-0">{getIcon(log.category)}</span>
                                    <span className={`font-bold shrink-0 ${
                                        log.category === 'error' ? 'text-red-500' :
                                        log.category === 'network' ? 'text-blue-500' :
                                        log.category === 'app' ? 'text-green-500' :
                                        'text-[var(--os-text-primary)]'
                                    }`}>
                                        {log.event}
                                    </span>
                                    <span className="text-[var(--os-text-secondary)] truncate flex-1 opacity-70">
                                        {JSON.stringify(log.data)}
                                    </span>
                                </div>
                                
                                {expandedId === log.id && (
                                    <div className="p-2 bg-black/5 border-t border-[var(--os-border)]/30 overflow-x-auto">
                                        <pre className="text-[var(--os-text-secondary)]">
                                            {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    )
}
