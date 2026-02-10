import { AppManifest } from '@/os/registry/types'
import { Calculator as CalculatorIcon } from 'lucide-react'
import Calculator from './index'

export const manifest: AppManifest = {
    id: 'calculator',
    title: 'Calculator',
    icon: CalculatorIcon,
    theme: {
        backgroundColor: '#f97316',
        iconColor: '#ffffff',
        lineColor: '#fb923c' // Orange-400
    },
    component: Calculator,
    defaultWindowOptions: {
        width: 320,
        height: 480,
        isResizable: false
    }
}
