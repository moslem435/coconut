import React from 'react'
import { Trash2 } from 'lucide-react'

export default function TrashApp() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-gray-400 p-8 select-none">
            <div className="mb-4 opacity-50">
                <Trash2 size={48} />
            </div>
            <h2 className="text-lg font-mono tracking-widest mb-2">Trash</h2>
            <p className="font-mono text-xs opacity-50">System purge completed.</p>
        </div>
    )
}
