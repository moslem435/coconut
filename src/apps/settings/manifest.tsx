import { AppManifest } from '@/os/registry/types'
import { Settings } from 'lucide-react'
import dynamic from 'next/dynamic'

const SettingsApp = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Settings...</div>
})

export const manifest: AppManifest = {
    id: 'settings',
    title: 'SETTINGS',
    icon: Settings,
    theme: {
        backgroundColor: '#475569',
        iconColor: '#ffffff',
        lineColor: '#94a3b8' // Slate 400
    },
    component: SettingsApp,
    defaultWindowOptions: {
        width: 900,
        height: 600,
        titleBarColor: 'auto'
    }
}
