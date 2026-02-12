import { AppManifest } from '@/os/registry/types'
import { Music } from 'lucide-react'
import dynamic from 'next/dynamic'

const MusicPlayer = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Music...</div>
})

export const manifest: AppManifest = {
  id: 'music-player',
  title: 'Music',
  icon: Music,
  theme: {
        backgroundColor: '#f43f5e',
        iconColor: '#ffffff',
        lineColor: '#fb7185' // Rose-400
    },
  component: MusicPlayer,
  defaultWindowOptions: {
    width: 900,
    height: 650,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'auto'
  }
}
