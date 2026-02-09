import { AppManifest } from '@/os/registry/types'
import { Calculator as CalculatorIcon } from 'lucide-react'
import Calculator from './index'

export const manifest: AppManifest = {
    id: 'calculator',
    title: 'Calculator',
    icon: CalculatorIcon,
    component: Calculator,
    defaultWindowOptions: {
        size: { width: 320, height: 480 },
        taskbarPosition: { x: 0, y: 0 }
    }
}
