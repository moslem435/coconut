import dynamic from 'next/dynamic'
import { Terminal } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'
import PortfolioSplashScreen from './SplashScreen'

const PortfolioApp = dynamic(() => import('./index'), {
    loading: () => <div className="flex items-center justify-center h-full text-cyan-500 font-mono animate-pulse">LOADING...</div>
})

export const manifest: AppManifest = {
    id: 'portfolio-hub',
    title: 'PORTFOLIO_HUB',
    icon: Terminal,
    // iconUrl: removed for flat style
    theme: {
        backgroundColor: '#171717',
        iconColor: '#ffffff'
    },
    component: PortfolioApp,
    splashScreen: PortfolioSplashScreen,
    defaultWindowOptions: {
        isMaximized: true
    }
}
