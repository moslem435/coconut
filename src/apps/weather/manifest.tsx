import { CloudSun } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'
import dynamic from 'next/dynamic'

const WeatherApp = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Weather...</div>
})

export const manifest: AppManifest = {
  id: 'weather',
  title: 'Weather',
  icon: CloudSun,
  component: WeatherApp,

  defaultWindowOptions: {
    width: 800,
    height: 600,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'auto'
  },
  theme: {
    backgroundColor: '#0ea5e9', // Sky blue-ish
    iconColor: '#ffffff'
  }
}
