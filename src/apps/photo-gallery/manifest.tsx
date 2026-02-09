import { AppManifest } from '@/os/registry/types'
import { Image } from 'lucide-react'
import dynamic from 'next/dynamic'

const PhotoGallery = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'photo-gallery',
  title: 'Photos',
  icon: Image,
  component: PhotoGallery,
  defaultWindowOptions: {
    width: 800,
    height: 600,
    isResizable: true,
    isMaximized: true
  }
}
