import dynamic from 'next/dynamic'
import { Folder } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const FileExplorerApp = dynamic(() => import('./index'), {
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/20">LOADING...</div>
})

export const manifest: AppManifest = {
    id: 'file-explorer',
    title: 'File Explorer',
    icon: Folder,
    theme: {
        backgroundColor: '#3b82f6',
        iconColor: '#ffffff'
    },
    component: FileExplorerApp,
    defaultWindowOptions: {
        width: 800,
        height: 500,
        isResizable: true,
        titleBarColor: 'auto'
    }
}
