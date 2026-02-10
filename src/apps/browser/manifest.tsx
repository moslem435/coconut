import { AppManifest } from '@/os/registry/types'
import { Chrome } from 'lucide-react'
import Browser from './index'

export const manifest: AppManifest = {
    id: 'browser',
    title: 'Browser',
    icon: Chrome,
    theme: {
        backgroundColor: '#0ea5e9',
        iconColor: '#ffffff',
        lineColor: '#38bdf8' // Sky-400
    },
    component: Browser,
    defaultWindowOptions: {
        width: 1024,
        height: 768,
        titleBarColor: 'dark'
    }
}
