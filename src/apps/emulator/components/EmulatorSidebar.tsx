import { OS_PRESETS, OSConfig } from '../config'
import { HardDrive, Download, Trash2, Play, Power, Cpu, CircuitBoard, Server, Settings, Monitor } from 'lucide-react'

interface EmulatorSidebarProps {
    selectedOS: OSConfig | null;
    onSelectOS: (os: OSConfig) => void;
    isLocalReady: boolean;
    onDownload: () => void;
    onDelete: () => void;
    isDownloading: boolean;
    progress: number;
    isRunning: boolean;
    onStart: () => void;
    onStop: () => void;
    isStarting: boolean;
    v86Loaded: boolean;
}

export function EmulatorSidebar({
    selectedOS,
    onSelectOS,
    isLocalReady,
    onDownload,
    onDelete,
    isDownloading,
    progress,
    isRunning,
    onStart,
    onStop,
    isStarting,
    v86Loaded
}: EmulatorSidebarProps) {
    
    // Format bytes to MB/GB
    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024)
        return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
    }

    return (
        <div className="h-full bg-[#1e1e1e] border-r border-[#333] flex flex-col text-sm select-none">
            {/* Header */}
            <div className="p-3 border-b border-[#333] flex items-center gap-2">
                <Server size={16} className="text-blue-400" />
                <span className="font-bold text-gray-200">RESOURCES</span>
            </div>

            {/* OS List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2">OPERATING SYSTEMS</div>
                {OS_PRESETS.map(os => (
                    <div 
                        key={os.id}
                        onClick={() => !isRunning && onSelectOS(os)}
                        className={`
                            group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
                            ${selectedOS?.id === os.id ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200'}
                            ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <Monitor size={14} />
                        <span className="flex-1 truncate">{os.name}</span>
                        {selectedOS?.id === os.id && isLocalReady && (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Local Ready" />
                        )}
                    </div>
                ))}
            </div>

            {/* Selected OS Details Panel */}
            {selectedOS && (
                <div className="p-4 bg-[#252526] border-t border-[#333]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center text-blue-400">
                            <Monitor size={18} />
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-medium text-white truncate">{selectedOS.name}</div>
                            <div className="text-xs text-gray-500 truncate">{selectedOS.id}</div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333]">
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Cpu size={12} /> RAM
                            </div>
                            <div className="text-gray-200 font-mono">{formatSize(selectedOS.memory_size)}</div>
                        </div>
                        <div className="bg-[#1e1e1e] p-2 rounded border border-[#333]">
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <CircuitBoard size={12} /> VRAM
                            </div>
                            <div className="text-gray-200 font-mono">{formatSize(selectedOS.vga_memory_size)}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                        {!isRunning ? (
                            <>
                                {/* Start Button */}
                                <button
                                    onClick={onStart}
                                    disabled={!v86Loaded || (selectedOS.id !== 'windows98' && !isLocalReady) || isStarting}
                                    className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isStarting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Play size={16} />
                                    )}
                                    {isStarting ? 'Booting...' : 'Power On'}
                                </button>

                                {/* Download/Delete Management */}
                                {selectedOS.id !== 'windows98' && (
                                    <div className="flex gap-2">
                                        {!isLocalReady ? (
                                            <button
                                                onClick={onDownload}
                                                disabled={isDownloading}
                                                className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white py-1.5 rounded transition-colors disabled:opacity-50"
                                            >
                                                <Download size={14} />
                                                {isDownloading ? `${progress}%` : 'Download'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={onDelete}
                                                className="flex-1 flex items-center justify-center gap-2 bg-[#333] hover:bg-red-900/50 text-gray-300 hover:text-red-400 py-1.5 rounded transition-colors border border-[#444]"
                                            >
                                                <Trash2 size={14} />
                                                Delete Cache
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={onStop}
                                className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white py-1.5 rounded transition-colors"
                            >
                                <Power size={16} />
                                Power Off
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
