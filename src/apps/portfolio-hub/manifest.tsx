import dynamic from 'next/dynamic'
import { Terminal } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const PortfolioApp = dynamic(() => import('./index'), {
    loading: () => <div className="flex items-center justify-center h-full text-cyan-500 font-mono animate-pulse"> LOADING SYSTEM CORE...</div>
})

export const manifest: AppManifest = {
    id: 'system-core',
    title: 'PORTFOLIO_HUB',
    icon: Terminal,
    component: PortfolioApp,
    defaultWindowOptions: {
        isMaximized: true
    }
}
