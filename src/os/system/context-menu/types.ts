import { LucideIcon } from 'lucide-react'

export interface MenuItem {
    label?: string
    icon?: LucideIcon
    action?: () => void
    danger?: boolean
    disabled?: boolean
    checked?: boolean
    type?: string // Allow 'separator' or other values
}
