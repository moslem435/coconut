'use client'

import React, { useState, useEffect, useRef } from 'react'
import { RefreshCw, X, ExternalLink, Globe } from 'lucide-react'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'

interface PreviewProps {
    onClose: () => void
}

export const Preview: React.FC<PreviewProps> = ({ onClose }) => {
    const { instance } = useWebContainerStore()
    const [url, setUrl] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (!instance) return

        // Listen for server-ready event
        const handleServerReady = (port: number, url: string) => {
            console.log('Server ready:', url)
            setUrl(url)
            setIsLoading(false)
        }

        instance.on('server-ready', handleServerReady)

        // If check if likely already running? 
        // WebContainer API doesn't easily expose "current running servers" list directly 
        // without keeping track ourselves.
        // For now, we rely on the event or user action.

        return () => {
            // instance.off('server-ready', handleServerReady) // WebContainer types might not support off?
        }
    }, [instance])

    const handleRefresh = () => {
        if (iframeRef.current) {
            setIsLoading(true)
            iframeRef.current.src = iframeRef.current.src
        }
    }

    return (
        <div className="h-full w-full flex flex-col bg-white">
            {/* Address Bar */}
            <div className="h-8 bg-[#f0f0f0] border-b border-[#e1e1e1] flex items-center px-2 gap-2 text-xs shrink-0">
                <Globe size={14} className="text-gray-500" />
                <input
                    className="flex-1 bg-white border border-[#d1d1d1] rounded px-2 py-0.5 text-gray-700 outline-none focus:border-blue-500 transition-colors text-xs"
                    value={url}
                    readOnly
                    placeholder="Application URL..."
                />
                <button
                    className="p-1 hover:bg-[#e1e1e1] rounded text-gray-600"
                    onClick={handleRefresh}
                    title="Refresh"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <button
                    className="p-1 hover:bg-[#e1e1e1] rounded text-gray-600"
                    onClick={() => window.open(url, '_blank')}
                    title="Open in New Tab"
                >
                    <ExternalLink size={14} />
                </button>
                <button
                    className="p-1 hover:bg-[#e1e1e1] rounded text-gray-600"
                    onClick={onClose}
                    title="Close Preview"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Iframe */}
            <div className="flex-1 relative bg-white">
                {url ? (
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="w-full h-full border-none"
                        onLoad={() => setIsLoading(false)}
                        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                        <Globe size={48} className="mb-4 opacity-20" />
                        <div>No application running</div>
                        <div className="text-xs mt-2">Run 'npm start' in terminal</div>
                    </div>
                )}
            </div>
        </div>
    )
}
