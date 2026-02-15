'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Script from 'next/script'
import { Play, Power, Save, Upload, AlertCircle, Monitor, Download, HardDrive, Trash2 } from 'lucide-react'
import { OS_PRESETS, OSConfig } from './config'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useImageDownloader } from './hooks/useImageDownloader'
import { ImageStorage } from './services/ImageStorage'

declare global {
    interface Window {
        V86Starter: any;
        V86: any;
    }
}

export default function EmulatorApp() {
    const { t } = useLanguage()
    const [isRunning, setIsRunning] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [selectedOS, setSelectedOS] = useState<OSConfig | null>(OS_PRESETS[0])
    const [customUrl, setCustomUrl] = useState('')
    const [v86Loaded, setV86Loaded] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [isLocalReady, setIsLocalReady] = useState(false)
    
    const { progress, isDownloading, error: downloadError, downloadImage } = useImageDownloader()
    
    const emulatorRef = useRef<any>(null)
    const screenRef = useRef<HTMLDivElement>(null)

    // Check if image exists locally when OS changes
    useEffect(() => {
        const checkLocal = async () => {
            if (!selectedOS) return
            // For custom URL, we don't cache yet (or could, but simple for now)
            if (selectedOS.id === 'windows98') {
                setIsLocalReady(false)
                return
            }
            
            const filename = selectedOS.url.split('/').pop() || 'image.iso'
            const exists = await ImageStorage.checkExists(filename)
            setIsLocalReady(exists)
        }
        checkLocal()
    }, [selectedOS])

    const handleDownload = async () => {
        if (!selectedOS || !selectedOS.url) return
        const filename = selectedOS.url.split('/').pop() || 'image.iso'
        const success = await downloadImage(selectedOS.url, filename)
        if (success) {
            setIsLocalReady(true)
        }
    }

    const handleDeleteLocal = async () => {
        if (!selectedOS || !selectedOS.url) return
        if (!confirm(t('emulator.confirm_delete'))) return
        
        const filename = selectedOS.url.split('/').pop() || 'image.iso'
        try {
            await ImageStorage.deleteFile(filename)
            setIsLocalReady(false)
        } catch (e) {
            console.error(e)
        }
    }

    const startEmulator = useCallback(async () => {
        console.log('startEmulator called')
        setIsStarting(true)
        const V86Constructor = window.V86Starter || window.V86
        if (!V86Constructor) {
            console.error('V86Starter/V86 not found in window')
            setLocalError('Emulator core not loaded properly')
            setIsStarting(false)
            return
        }
        if (!selectedOS) {
            console.error('No OS selected')
            setIsStarting(false)
            return
        }
        if (!screenRef.current) {
            console.error('Screen container not found')
            setIsStarting(false)
            return
        }
        
        // Priority: Custom URL -> Local File -> Remote URL (fallback)
        // But here we enforce Local-First for presets
        
        let bootSource: any = {}
        const filename = selectedOS.url.split('/').pop() || 'image.iso'

        try {
            if (customUrl) {
                // Windows 98 / Custom
                bootSource = { url: customUrl }
            } else if (isLocalReady) {
                // Load from OPFS
                // v86 needs ArrayBuffer or File object.
                // However, passing File object directly sometimes has issues in async context or worker
                // Let's try explicit buffer read
                console.log('Loading local file:', filename)
                try {
                    const buffer = await ImageStorage.getFileBuffer(filename)
                    console.log('File loaded, size:', buffer.byteLength)
                    bootSource = { buffer }
                } catch (e) {
                    console.error('Failed to read local file:', e)
                    setLocalError('Failed to read local cache. Please delete and download again.')
                    setIsStarting(false)
                    return
                }
            } else {
                // Fallback to remote? Or force download?
                // Let's force download if not windows98
                if (selectedOS.id !== 'windows98') {
                    setLocalError(t('emulator.error.not_downloaded'))
                    setIsStarting(false)
                    return
                }
            }

            const config: any = {
                wasm_path: '/v86/v86.wasm',
                memory_size: selectedOS.memory_size,
                vga_memory_size: selectedOS.vga_memory_size,
                screen_container: screenRef.current,
                bios: { url: selectedOS.bios.url },
                vga_bios: { url: selectedOS.vga_bios.url },
                autostart: true,
                disable_mouse: false,
                disable_keyboard: false
            }

            // Assign boot source
            if (selectedOS.id === 'linux-buildroot' || customUrl.endsWith('.iso')) {
                config.cdrom = bootSource
            } else if (selectedOS.id === 'kolibrios') {
                config.fda = bootSource
            } else {
                config.hda = bootSource
            }

            if (emulatorRef.current) emulatorRef.current.destroy()
            
            console.log('Starting v86 with config:', { 
                ...config, 
                cdrom: config.cdrom ? 'Present' : 'None',
                hda: config.hda ? 'Present' : 'None',
                fda: config.fda ? 'Present' : 'None'
            })
            
            // Wait for DOM update to ensure container has size
            await new Promise(resolve => setTimeout(resolve, 100))

            try {
                const starter = new V86Constructor(config)
                emulatorRef.current = starter

                // Add debug listeners
                starter.add_listener('emulator-ready', () => {
                    console.log('v86: Emulator ready')
                })
                starter.add_listener('emulator-started', () => {
                    console.log('v86: Emulator started')
                })
                starter.add_listener('download-progress', (e: any) => {
                    console.log('v86 download progress:', e)
                })
                starter.add_listener('download-error', (e: any) => {
                    console.error('v86 download error:', e)
                    setLocalError('Emulator download error: ' + (e?.message || 'Unknown'))
                })
                
                // Wait for init
                // await new Promise<void>((resolve) => setTimeout(resolve, 100))
                
                setIsRunning(true)
                setLocalError(null)
            } catch (initErr: any) {
                 console.error('V86 init error:', initErr)
                 throw initErr
            }

        } catch (err: any) {
            console.error('Failed to start emulator:', err)
            setLocalError(err.message || 'Failed to start emulator')
            setIsRunning(false)
        } finally {
            setIsStarting(false)
        }
    }, [selectedOS, customUrl, isLocalReady, t])

    const stopEmulator = () => {
        if (emulatorRef.current) {
            emulatorRef.current.destroy()
            emulatorRef.current = null
        }
        setIsRunning(false)
        if (screenRef.current) screenRef.current.innerHTML = ''
    }

    useEffect(() => {
        return () => {
            if (emulatorRef.current) emulatorRef.current.destroy()
        }
    }, [])

    const displayedError = localError || downloadError

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden pt-10">
            <Script 
                src="/v86/libv86.js" 
                strategy="afterInteractive"
                onLoad={() => setV86Loaded(true)}
                onError={() => setLocalError('Failed to load emulator core.')}
            />

            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-[#2d2d2d] border-b border-[#3d3d3d] shrink-0">
                <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm font-semibold text-gray-300">{t('emulator.profile')}:</span>
                    <select 
                        className="bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 text-sm outline-none focus:border-blue-500 max-w-[150px]"
                        value={selectedOS?.id || ''}
                        onChange={(e) => {
                            const os = OS_PRESETS.find(p => p.id === e.target.value)
                            if (os) {
                                setSelectedOS(os)
                                setCustomUrl('')
                            }
                        }}
                        disabled={isRunning || isDownloading || isStarting}
                    >
                        {OS_PRESETS.map(os => (
                            <option key={os.id} value={os.id}>{os.name}</option>
                        ))}
                    </select>
                </div>

                {selectedOS?.id === 'windows98' && (
                     <input 
                        type="text" 
                        placeholder="ISO/IMG URL..." 
                        className="bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 text-sm outline-none focus:border-blue-500 w-48"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        disabled={isRunning}
                    />
                )}

                {/* Controls */}
                {!isRunning ? (
                    <>
                        {/* Download Button (Only for presets) */}
                        {selectedOS?.id !== 'windows98' && !isLocalReady && (
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 transition-colors"
                            >
                                <Download size={14} />
                                {isDownloading ? `${progress}%` : t('emulator.download')}
                            </button>
                        )}

                        {/* Start Button */}
                        <button 
                            onClick={startEmulator}
                            disabled={!v86Loaded || !selectedOS || (selectedOS.id !== 'windows98' && !isLocalReady) || isStarting}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isStarting ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Play size={14} />
                            )}
                            {isStarting ? 'Starting...' : t('emulator.start')}
                        </button>

                        {/* Delete Cache Button */}
                        {isLocalReady && (
                            <button 
                                onClick={handleDeleteLocal}
                                className="p-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded transition-colors"
                                title={t('emulator.delete_cache')}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </>
                ) : (
                    <button 
                        onClick={stopEmulator}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                    >
                        <Power size={14} />
                        {t('emulator.stop')}
                    </button>
                )}

                <div className="h-4 w-px bg-[#3d3d3d] mx-2" />

                <div className="flex-1" />

                {/* Status Indicators */}
                {isLocalReady && !isRunning && (
                    <div className="flex items-center gap-1 text-green-400 text-xs px-2">
                        <HardDrive size={12} />
                        Local Ready
                    </div>
                )}

                {displayedError && (
                    <div className="flex items-center gap-1 text-red-400 text-xs px-2 truncate max-w-[200px]" title={displayedError}>
                        <AlertCircle size={12} />
                        {displayedError}
                    </div>
                )}
            </div>

            {/* Screen Container */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {/* Overlay for Status/Download/Error */}
                {!isRunning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                            {isDownloading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    <p className="text-blue-400 font-medium">Downloading... {progress}%</p>
                                    <p className="text-xs text-gray-500">Saved to Local Storage (OPFS)</p>
                                </div>
                            ) : (
                                <>
                                    <Monitor size={64} className="opacity-20" />
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium text-gray-300">{selectedOS?.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {isLocalReady ? t('emulator.status.ready') : t('emulator.status.need_download')}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                {/* v86 Screen Container - Always mounted */}
                <div 
                    ref={screenRef} 
                    id="screen_container"
                    className="w-full h-full flex items-center justify-center bg-black"
                >
                    <style jsx global>{`
                        #screen_container canvas {
                            display: block;
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }
                    `}</style>
                </div>
            </div>
        </div>
    )
}
