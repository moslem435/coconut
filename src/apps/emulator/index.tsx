'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Script from 'next/script'
import { Monitor, AlertCircle } from 'lucide-react'
import { OS_PRESETS, OSConfig } from './config'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useImageDownloader } from './hooks/useImageDownloader'
import { ImageStorage } from './services/ImageStorage'
import { EmulatorSidebar } from './components/EmulatorSidebar'
import { EmulatorTerminal } from './components/EmulatorTerminal'

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
    const [emulatorInstance, setEmulatorInstance] = useState<any>(null)
    
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
                setEmulatorInstance(starter)

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
            setEmulatorInstance(null)
        } finally {
            setIsStarting(false)
        }
    }, [selectedOS, customUrl, isLocalReady, t])

    const stopEmulator = () => {
        if (emulatorRef.current) {
            emulatorRef.current.destroy()
            emulatorRef.current = null
        }
        setEmulatorInstance(null)
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
        <div className="flex h-full bg-[var(--os-bg-window)] text-[var(--os-text-primary)] overflow-hidden pt-10">
            <Script 
                src="/v86/libv86.js" 
                strategy="afterInteractive"
                onLoad={() => setV86Loaded(true)}
                onError={() => setLocalError('Failed to load emulator core.')}
            />

            {/* Sidebar Resource Manager */}
            <div className="w-64 shrink-0 h-full border-r border-[var(--os-border)] bg-[var(--os-bg-panel)]">
                <EmulatorSidebar 
                    selectedOS={selectedOS}
                    onSelectOS={(os) => {
                        setSelectedOS(os)
                        setCustomUrl('')
                    }}
                    isLocalReady={isLocalReady}
                    onDownload={handleDownload}
                    onDelete={handleDeleteLocal}
                    isDownloading={isDownloading}
                    progress={progress}
                    isRunning={isRunning}
                    onStart={startEmulator}
                    onStop={stopEmulator}
                    isStarting={isStarting}
                    v86Loaded={v86Loaded}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Screen Area */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {/* Overlay for Status/Download/Error */}
                    {!isRunning && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--os-bg-base)]">
                            <div className="flex flex-col items-center gap-4 text-[var(--os-text-muted)]">
                                {isDownloading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 border-4 border-[var(--os-accent)]/30 border-t-[var(--os-accent)] rounded-full animate-spin" />
                                        <p className="text-[var(--os-accent)] font-medium">Downloading... {progress}%</p>
                                        <p className="text-xs text-[var(--os-text-muted)]">Saved to Local Storage (OPFS)</p>
                                    </div>
                                ) : (
                                    <>
                                        <Monitor size={64} className="opacity-20" />
                                        <div className="text-center">
                                            <h3 className="text-lg font-medium text-[var(--os-text-primary)]">{selectedOS?.name || 'Select OS'}</h3>
                                            <p className="text-sm text-[var(--os-text-secondary)] mt-1">
                                                {isLocalReady ? 'Ready to Boot' : 'Download Required'}
                                            </p>
                                            {displayedError && (
                                                <div className="mt-4 flex items-center justify-center gap-2 text-[var(--os-danger)] text-sm bg-[var(--os-danger)]/10 px-4 py-2 rounded">
                                                    <AlertCircle size={16} />
                                                    {displayedError}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* v86 Screen Container */}
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

                {/* Terminal Area */}
                <div className="h-48 shrink-0 bg-[#1e1e1e] border-t border-[var(--os-border)]">
                    <EmulatorTerminal emulator={emulatorInstance} />
                </div>
            </div>
        </div>
    )
}
