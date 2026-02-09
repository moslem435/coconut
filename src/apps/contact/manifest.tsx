import { AppManifest } from '@/os/registry/types'
import { Mail } from 'lucide-react'
import dynamic from 'next/dynamic'

const ContactApp = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'contact',
  title: 'Contact',
  icon: Mail,
  component: ContactApp,
    defaultWindowOptions: {
        width: 900,
        height: 600,
        titleBarColor: 'dark'
    }
}
