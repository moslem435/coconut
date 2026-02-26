import { AppManifest } from '@/os/registry/types'
import { Globe } from 'lucide-react'
import dynamic from 'next/dynamic'

const YumeApp = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Yume...</div>
})

export const manifest: AppManifest = {
    id: 'yume',
    title: 'Yume',
    icon: Globe,
    theme: {
        backgroundColor: '#ffffff',
        iconColor: '#000000',
    },
    component: YumeApp,
    defaultWindowOptions: {
        width: 1024,
        height: 768,
        titleBarColor: 'auto',
        isResizable: true
    }
}
