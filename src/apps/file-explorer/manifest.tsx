import { AppManifest } from '@/os/registry/types'
import { FolderOpen } from 'lucide-react'
import dynamic from 'next/dynamic'

const FileExplorer = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Files...</div>
})

export const manifest: AppManifest = {
    id: 'file-explorer',
    title: 'File Explorer',
    icon: FolderOpen,
    theme: {
        backgroundColor: '#3b82f6',
        iconColor: '#ffffff',
        lineColor: '#60a5fa' // Blue-400
    },
    component: FileExplorer,
    defaultWindowOptions: {
        width: 900,
        height: 600,
        isResizable: true,
        titleBarColor: 'auto',
        hideTitleBar: true
    },
    multiInstance: true
}
