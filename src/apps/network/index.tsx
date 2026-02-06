import React from 'react'
import { Globe, WifiOff } from 'lucide-react'

export default function NetworkNodeApp() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-red-500 p-8 select-none relative overflow-hidden">
            {/* Grid Background Effect */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'linear-gradient(rgba(255, 0, 0, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 0, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full animate-pulse" />
                <Globe size={64} className="relative z-10 opacity-80" />
                <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1 border border-red-900">
                    <WifiOff size={20} />
                </div>
            </div>

            <h2 className="text-xl font-mono tracking-widest mb-2 font-bold text-red-500">NODE_OFFLINE</h2>
            <p className="font-mono text-sm opacity-60 text-center max-w-xs leading-relaxed text-red-400">
                Unable to establish uplink with the main network grid.
                Signal interference detected.
            </p>

            <div className="mt-8 flex gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping delay-75" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping delay-150" />
            </div>
        </div>
    )
}
