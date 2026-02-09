import { AppManifest } from '@/os/registry/types'
import { Trash2 } from 'lucide-react'
import RecycleBin from './index'

export const manifest: AppManifest = {
    id: 'recycle-bin',
    title: 'Recycle Bin',
    icon: Trash2,
    component: RecycleBin,
    defaultWindowOptions: {
        size: { width: 700, height: 500 },
        taskbarPosition: { x: 0, y: 0 },
        titleBarColor: 'dark'
    }
}
