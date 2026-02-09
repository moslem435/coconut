import dynamic from 'next/dynamic'
import { Settings } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const SettingsApp = dynamic(() => import('./index'), {
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/20"> LOADING_MODULE...</div>
})

export const manifest: AppManifest = {
    id: 'settings',
    title: 'SETTINGS',
    icon: Settings,
    theme: {
        backgroundColor: '#475569',
        iconColor: '#ffffff'
    },
    component: SettingsApp,
    defaultWindowOptions: {
        width: 900,
        height: 600,
        titleBarColor: 'auto'
    }
}
