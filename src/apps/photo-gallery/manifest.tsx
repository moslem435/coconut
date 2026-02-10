import { AppManifest } from '@/os/registry/types'
import { Image } from 'lucide-react'
import dynamic from 'next/dynamic'

const PhotoGallery = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'photo-gallery',
  title: 'Photos',
  icon: Image,
  theme: {
        backgroundColor: '#8b5cf6',
        iconColor: '#ffffff',
        lineColor: '#a78bfa' // Violet-400
    },
  component: PhotoGallery,
  defaultWindowOptions: {
    width: 800,
    height: 600,
    isResizable: true,
    isMaximized: true
  }
}
