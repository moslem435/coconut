import dynamic from 'next/dynamic'
import { Trash } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const TrashApp = dynamic(() => import('./index'))

export const manifest: AppManifest = {
    id: 'trash',
    title: 'PURGE',
    icon: Trash,
    component: TrashApp,
    defaultWindowOptions: {
        width: 600,
        height: 400
    }
}
