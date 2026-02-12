import { AppManifest } from '@/os/registry/types'
import { Activity } from 'lucide-react'
import dynamic from 'next/dynamic'

const TaskManagerApp = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Task Manager...</div>
})

export const manifest: AppManifest = {
    id: 'task-manager',
    title: 'Task Manager',
    icon: Activity,
    theme: {
        backgroundColor: '#1e293b',
        iconColor: '#f87171',
    },
    component: TaskManagerApp,
    defaultWindowOptions: {
        width: 600,
        height: 400,
        titleBarColor: 'dark'
    }
}
