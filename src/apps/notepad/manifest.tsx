import { AppManifest } from '@/os/registry/types'
import { StickyNote } from 'lucide-react'
import dynamic from 'next/dynamic'

const Notepad = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Notepad...</div>
})

export const manifest: AppManifest = {
    id: 'notepad',
    title: 'Notepad',
    icon: StickyNote,
    theme: {
        backgroundColor: '#eab308',
        iconColor: '#000000',
        lineColor: '#facc15' // Yellow-400
    },
    component: Notepad,
    defaultWindowOptions: {
        width: 800,
        height: 600,
        titleBarColor: 'auto'
    }
}
