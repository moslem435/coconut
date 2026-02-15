import { AppManifest } from '@/os/registry/types'
import { Monitor } from 'lucide-react'
import dynamic from 'next/dynamic'

const EmulatorApp = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Emulator...</div>
})

export const manifest: AppManifest = {
    id: 'emulator',
    title: 'Retro PC',
    icon: Monitor,
    theme: {
        backgroundColor: '#1a1b26',
        iconColor: '#a9b1d6',
        lineColor: '#565f89'
    },
    component: EmulatorApp,
    defaultWindowOptions: {
        width: 1024,
        height: 768,
        isResizable: true
    }
}
