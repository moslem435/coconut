import { TestTube } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'
import { SandboxedAppFrame } from '@/os/components/SandboxedAppFrame'

export const manifest: AppManifest = {
    id: 'sandbox-test',
    title: 'Sandbox Test',
    icon: TestTube,
    theme: {
        backgroundColor: '#0f172a',
        iconColor: '#34d399',
    },
    // We use the SandboxedAppFrame as the component
    component: () => <SandboxedAppFrame appId="sandbox-test" />,
    defaultWindowOptions: {
        width: 600,
        height: 400,
        titleBarColor: 'dark'
    },
    sandbox: true,
    permissions: ['alert'] // Only allow alert, deny fs.*
}
