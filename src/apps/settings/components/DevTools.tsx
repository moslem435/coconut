import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Cpu, HardDrive, Activity, Bell, 
    RefreshCw, Trash2, Download, Power,
    CheckCircle2, AlertTriangle, Info, Loader2,
    Zap, Terminal, FileJson, Save
} from 'lucide-react'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useDynamicIslandStore } from '@/os/kernel/useDynamicIslandStore'
import { eventBus, SystemEvents } from '@/os/kernel/EventBus'

export function DevTools() {
    const [activeTab, setActiveTab] = useState<'island' | 'kernel' | 'storage' | 'logs'>('island')
    
    return (
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] w-full">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--os-text-secondary)] uppercase tracking-wider">
                    Developer Tools
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">
                    Active
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--os-border)]/50 pb-2 overflow-x-auto no-scrollbar">
                <TabButton 
                    active={activeTab === 'island'} 
                    onClick={() => setActiveTab('island')} 
                    icon={<Bell size={14} />} 
                    label="Island" 
                />
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
                    {activeTab === 'island' && (
                        <TabContent key="island">
                            <IslandTab />
                        </TabContent>
                    )}
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

function IslandTab() {
    const { showNotification, showSuccess, showError, showLoading } = useDynamicIslandStore()
    
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <ActionButton 
                    onClick={() => showSuccess('Saved Successfully')}
                    icon={<CheckCircle2 size={14} />}
                    label="Success"
                    color="green"
                />
                <ActionButton 
                    onClick={() => showError('Connection Failed')}
                    icon={<AlertTriangle size={14} />}
                    label="Error"
                    color="red"
                />
                <ActionButton 
                    onClick={() => showNotification('System Update', 'New version available', <Zap size={18} className="text-yellow-400"/>)}
                    icon={<Info size={14} />}
                    label="Notification"
                    color="blue"
                />
                <ActionButton 
                    onClick={() => showLoading('Installing packages...')}
                    icon={<Loader2 size={14} className="animate-spin" />}
                    label="Loading"
                    color="gray"
                />
            </div>
            <div className="p-3 rounded-lg bg-[var(--os-bg-base)] border border-[var(--os-border)] text-xs text-[var(--os-text-secondary)]">
                <p>Click buttons to test Dynamic Island states. Ensure Island is visible.</p>
            </div>
        </div>
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

function StorageTab() {
    const { files, createItem } = useFileSystemStore()
    
    const handleReset = () => {
        if (confirm('Are you sure you want to reset the file system? This action cannot be undone.')) {
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
    const [logs, setLogs] = useState<{time: string, event: string, data: any}[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const sub = eventBus.onAny((event, data) => {
            setLogs(prev => {
                const newLogs = [...prev, {
                    time: new Date().toLocaleTimeString(),
                    event: String(event),
                    data
                }].slice(-50) // Keep last 50
                return newLogs
            })
        })
        return () => sub.unsubscribe()
    }, [])

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--os-border)]/50">
                <span className="text-xs text-[var(--os-text-secondary)]">Live System Events</span>
                <button 
                    onClick={() => setLogs([])}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--os-bg-base)] hover:bg-[var(--os-hover-bg)] border border-[var(--os-border)] transition-colors"
                >
                    Clear
                </button>
            </div>
            <div className="h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1 p-1">
                {logs.length === 0 && (
                    <div className="text-center text-[var(--os-text-secondary)] opacity-50 py-8">
                        No events captured yet...
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 p-1.5 rounded hover:bg-[var(--os-hover-bg)] border border-transparent hover:border-[var(--os-border)] transition-colors">
                        <span className="text-[var(--os-text-secondary)] opacity-70 shrink-0">{log.time}</span>
                        <span className="text-[var(--os-accent)] font-bold shrink-0">{log.event}</span>
                        <span className="text-[var(--os-text-primary)] truncate opacity-80">
                            {JSON.stringify(log.data)}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    )
}

function ActionButton({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: 'green' | 'red' | 'blue' | 'gray' }) {
    const colorMap = {
        green: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20',
        red: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20',
        blue: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
        gray: 'bg-[var(--os-text-primary)]/10 text-[var(--os-text-primary)] hover:bg-[var(--os-text-primary)]/20 border-[var(--os-text-primary)]/20'
    }

    return (
        <button 
            onClick={onClick}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors flex items-center justify-center gap-2 ${colorMap[color]}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}
