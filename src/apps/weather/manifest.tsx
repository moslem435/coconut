import { CloudSun } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'
import dynamic from 'next/dynamic'

const WeatherApp = dynamic(() => import('./index'), {
  loading: () => <div className="h-full w-full bg-black/90" />
})

export const manifest: AppManifest = {
  id: 'weather',
  title: 'Weather',
  icon: CloudSun,
  category: 'utility',
  component: WeatherApp,
  version: '1.0.0',
  description: 'Real-time weather forecast',
  defaultWindowOptions: {
    width: 800,
    height: 600,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'auto'
  },
  theme: {
    backgroundColor: '#0ea5e9', // Sky blue-ish
    textColor: '#ffffff'
  }
}
