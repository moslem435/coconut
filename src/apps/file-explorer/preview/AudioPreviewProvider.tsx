import React, { useState, useEffect, useRef } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward } from 'lucide-react'

const AudioPreview = ({ fileId, name }: { fileId: string; name: string }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const wavesurferRef = useRef<WaveSurfer | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Format time (mm:ss)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    useEffect(() => {
        let objectUrl: string | null = null

        const init = async () => {
            if (!containerRef.current) return

            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if (!path) throw new Error('File not found')

                // Use streaming blob
                const blob = await fs.getFileBlob(path)
                objectUrl = URL.createObjectURL(blob)

                // Initialize WaveSurfer
                wavesurferRef.current = WaveSurfer.create({
                    container: containerRef.current,
                    waveColor: 'rgba(255, 255, 255, 0.3)',
                    progressColor: '#3b82f6', // blue-500
                    cursorColor: '#60a5fa', // blue-400
                    barWidth: 2,
                    barGap: 3,
                    barRadius: 3,
                    height: 128,
                    normalize: true,
                })

                wavesurferRef.current.load(objectUrl)

                wavesurferRef.current.on('ready', () => {
                    setDuration(wavesurferRef.current?.getDuration() || 0)
                    setLoading(false)
                })

                wavesurferRef.current.on('audioprocess', () => {
                    setCurrentTime(wavesurferRef.current?.getCurrentTime() || 0)
                })

                // @ts-ignore - seek event might be missing from types but exists
                wavesurferRef.current.on('seek', () => {
                    setCurrentTime(wavesurferRef.current?.getCurrentTime() || 0)
                })

                wavesurferRef.current.on('finish', () => {
                    setIsPlaying(false)
                })

            } catch (e) {
                console.error(e)
                setError('Failed to load audio')
                setLoading(false)
            }
        }

        init()

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy()
            }
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [fileId])

    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause()
            setIsPlaying(!isPlaying)
        }
    }

    const toggleMute = () => {
        if (wavesurferRef.current) {
            const newMuted = !isMuted
            wavesurferRef.current.setVolume(newMuted ? 0 : volume)
            setIsMuted(newMuted)
        }
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value)
        setVolume(newVolume)
        setIsMuted(newVolume === 0)
        if (wavesurferRef.current) {
            wavesurferRef.current.setVolume(newVolume)
        }
    }

    const handleSpeedChange = (speed: number) => {
        if (wavesurferRef.current) {
            wavesurferRef.current.setPlaybackRate(speed)
        }
    }

    if (error) return <div className="p-4 text-red-400">{error}</div>

    return (
        <div className="h-full w-full bg-[#111] flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-2xl bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm shadow-2xl">
                {/* Header info */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                        <h3 className="text-white font-medium text-lg truncate max-w-md">{name}</h3>
                        <span className="text-white/40 text-xs font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/50"></div>}
                </div>

                {/* Waveform Container */}
                <div className="relative h-32 mb-6 bg-black/20 rounded-lg overflow-hidden border border-white/5">
                    <div ref={containerRef} className="w-full h-full" />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Volume */}
                    <div className="flex items-center gap-2 w-32 group">
                        <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors">
                            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                    </div>

                    {/* Center: Playback */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                wavesurferRef.current?.stop()
                                setIsPlaying(false)
                            }}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Stop"
                        >
                            <RotateCcw size={18} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>

                        <button
                            onClick={() => handleSpeedChange(1.5)}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-bold"
                            title="1.5x Speed"
                        >
                            1.5x
                        </button>
                    </div>

                    {/* Right: Spacer for balance */}
                    <div className="w-32 flex justify-end">
                        {/* Could add download button here later */}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const AudioPreviewProvider: IPreviewProvider = {
    id: 'audio-preview',
    name: 'Audio Player',
    priority: 85, // Higher than Video (if extension overlap)
    canHandle: (file, stat) => {
        if (stat?.mimeType?.startsWith('audio/')) return true
        return /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)
    },
    render: (ctx) => <AudioPreview fileId={ctx.fileId} name={ctx.name} />
}
