import { AppManifest } from '@/os/registry/types'
import { Phone } from 'lucide-react'
import dynamic from 'next/dynamic'

const ContactApp = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'contact',
  title: 'Contact',
  icon: Phone,
  theme: {
        backgroundColor: '#22c55e',
        iconColor: '#ffffff',
        lineColor: '#4ade80' // Green-400
    },
  component: ContactApp,
    defaultWindowOptions: {
        width: 800,
        height: 600,
        titleBarColor: 'dark'
    }
}
