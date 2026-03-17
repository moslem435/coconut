import dynamic from 'next/dynamic'
import { AppManifest } from '@/os/registry/types'
import { Trash2 } from 'lucide-react'

const RecycleBin = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Recycle Bin...</div>
})

export const manifest: AppManifest = {
    id: 'recycle-bin',
    title: 'Recycle Bin',
    icon: Trash2,
    theme: {
        backgroundColor: '#71717a',
        iconColor: '#ffffff',
        lineColor: '#a1a1aa' // Zinc-400
    },
    component: RecycleBin,
    defaultWindowOptions: {
        width: 900,
        height: 600,
        titleBarColor: 'auto'
    }
}
