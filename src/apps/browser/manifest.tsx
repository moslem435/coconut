import { AppManifest } from '@/os/registry/types'
import { Chrome } from 'lucide-react'
import Browser from './index'

export const manifest: AppManifest = {
    id: 'browser',
    title: 'Browser',
    icon: Chrome,
    component: Browser,
    defaultWindowOptions: {
        size: { width: 1000, height: 700 },
        taskbarPosition: { x: 0, y: 0 }
    }
}
