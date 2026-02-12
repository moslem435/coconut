import { AppManifest } from '@/os/registry/types'
import { Globe } from 'lucide-react'
import dynamic from 'next/dynamic'

const Browser = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Browser...</div>
})

export const manifest: AppManifest = {
    id: 'browser',
    title: 'Browser',
    icon: Globe,
    theme: {
        backgroundColor: '#0ea5e9',
        iconColor: '#ffffff',
        lineColor: '#38bdf8' // Sky-400
    },
    component: Browser,
    defaultWindowOptions: {
        width: 1024,
        height: 768,
        titleBarColor: 'auto'
    }
}
