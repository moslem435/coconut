import dynamic from 'next/dynamic'
import { Briefcase } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'
import PortfolioSplashScreen from './SplashScreen'

const PortfolioApp = dynamic(() => import('./index'), {
    loading: () => <div className="flex items-center justify-center h-full text-cyan-500 font-mono animate-pulse">LOADING...</div>
})

export const manifest: AppManifest = {
    id: 'portfolio-hub',
    title: 'Portfolio Hub',
    icon: Briefcase,
    // iconUrl: removed for flat style
    theme: {
        backgroundColor: '#171717',
        iconColor: '#ffffff',
        lineColor: '#ffffff'
    },
    component: PortfolioApp,
    splashScreen: PortfolioSplashScreen,
    defaultWindowOptions: {
        isMaximized: true
    }
}
