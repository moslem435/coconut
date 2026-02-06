import dynamic from 'next/dynamic'
import { Globe } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const NetworkApp = dynamic(() => import('./index'))

export const manifest: AppManifest = {
    id: 'network',
    title: 'NET_NODE',
    icon: Globe,
    component: NetworkApp,
    defaultWindowOptions: {
        width: 800,
        height: 600
    }
}
