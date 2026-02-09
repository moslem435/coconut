import { AppManifest } from '@/os/registry/types'
import { Music } from 'lucide-react'
import dynamic from 'next/dynamic'

const MusicPlayer = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'music-player',
  title: 'Music',
  icon: Music,
  component: MusicPlayer,
  defaultWindowOptions: {
    width: 380,
    height: 600,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'light'
  }
}
