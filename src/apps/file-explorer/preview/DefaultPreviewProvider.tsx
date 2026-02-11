import React from 'react'
import { IPreviewProvider } from '@/os/services/PreviewService'
import { FileText } from 'lucide-react'

export const DefaultPreviewProvider: IPreviewProvider = {
    id: 'default-preview',
    name: 'Binary Viewer',
    priority: 0,
    canHandle: () => true, // Catch all
    render: (ctx) => (
        <div className="h-full flex flex-col items-center justify-center text-white/50 gap-4">
            <FileText size={64} strokeWidth={1} />
            <div className="text-center">
                <p className="text-lg font-medium text-white/80">{ctx.name}</p>
                <p className="text-sm">Preview not available for this file type</p>
            </div>
        </div>
    )
}
