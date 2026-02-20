import { useMemo } from 'react'
import { ExternalLink, Check, X } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

export function useTaskbarMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'taskbar-icon'
    data: ContextMenuData,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { pinnedAppIds, pinApp, unpinApp } = useSystemSettings()
    const { openWindow, closeWindow, focusWindow, minimizeWindow, windows } = useWindowStore()

    return useMemo(() => {
        if (!visible || !isVisibleType || !data?.appId) return []

        const isPinned = pinnedAppIds.includes(data.appId)

        return [
            {
                label: t('menu.open'),
                icon: ExternalLink,
                action: () => {
                    if (data.windowId) {
                        const win = windows[data.windowId]
                        if (win?.isMinimized) minimizeWindow(data.windowId) // Toggle minimize actually? No, implementation implies restore/focus
                        focusWindow(data.windowId)
                    } else {
                        // Launch App
                        const app = APPS_REGISTRY[data.appId!]
                        if (app) {
                            const title = app.id === 'settings' ? t('start.settings') : t(`app.${app.id}`)
                            openWindow(app.id, title, app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
                        }
                    }
                    hideMenu()
                }
            },
            {
                label: isPinned ? t('menu.unpin') : t('menu.pin'),
                icon: Check,
                checked: isPinned,
                action: () => {
                    if (isPinned) {
                        unpinApp(data.appId!)
                    } else {
                        pinApp(data.appId!)
                    }
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.close'),
                icon: X,
                danger: true,
                disabled: !data.windowId,
                action: () => {
                    if (data.windowId) closeWindow(data.windowId)
                    hideMenu()
                }
            }
        ].filter(item => !item.disabled)
    }, [visible, isVisibleType, data, pinnedAppIds, windows, t, pinApp, unpinApp, openWindow, closeWindow, focusWindow, minimizeWindow, hideMenu])
}
