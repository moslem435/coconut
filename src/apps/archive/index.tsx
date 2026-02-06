import React from 'react'
import { FileLock } from 'lucide-react'

export default function ArchiveApp() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-cyan-500 p-8 select-none">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full animate-pulse" />
                <FileLock size={64} className="relative z-10 opacity-80" />
            </div>
            <h2 className="text-xl font-mono tracking-widest mb-2 font-bold">RESTRICTED_ACCESS</h2>
            <p className="font-mono text-sm opacity-60 text-center max-w-xs leading-relaxed">
                This sector contains classified historical data.
                <br />
                Decryption key required.
            </p>

            <div className="mt-8 border border-cyan-900/50 bg-cyan-950/10 px-4 py-2 rounded text-xs font-mono text-cyan-700">
                ERROR_CODE: 0xBAD_ACCESS
            </div>
        </div>
    )
}
