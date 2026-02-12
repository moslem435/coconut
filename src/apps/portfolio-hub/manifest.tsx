import { AppManifest } from '@/os/registry/types'
import { LayoutDashboard } from 'lucide-react'
import dynamic from 'next/dynamic'

const PortfolioHub = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Portfolio...</div>
})

export const manifest: AppManifest = {
    id: 'portfolio-hub',
    title: 'Portfolio Hub',
    icon: LayoutDashboard,
    // iconUrl: removed for flat style
    theme: {
        backgroundColor: '#171717',
        iconColor: '#ffffff',
        lineColor: '#ffffff'
    },
    component: PortfolioHub,
    defaultWindowOptions: {
        isMaximized: true
    }
}
