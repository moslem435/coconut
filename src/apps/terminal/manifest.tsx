import { AppManifest } from '@/os/registry/types'
import { TerminalSquare } from 'lucide-react'
import dynamic from 'next/dynamic'

const Terminal = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Terminal...</div>
})

export const manifest: AppManifest = {
    id: 'terminal',
    title: 'Terminal',
    icon: TerminalSquare,
    theme: {
        backgroundColor: '#333333',
        iconColor: '#ffffff',
        lineColor: '#e5e7eb' // Gray-200
    },
    component: Terminal,
    defaultWindowOptions: {
        width: 900,
        height: 600
    }
}
