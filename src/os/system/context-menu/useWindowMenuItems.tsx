import { useMemo } from 'react'
import { Minimize2, Maximize2, Minus, ArrowLeftToLine, ArrowRightToLine, X } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

export function useWindowMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'window-titlebar'
    data: ContextMenuData,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { windows, maximizeWindow, minimizeWindow, closeWindow, updateWindowSize, updateWindowPosition } = useWindowStore()

    return useMemo(() => {
        if (!visible || !isVisibleType || !data?.windowId) return []

        const win = windows[data.windowId]
        if (!win) return []

        const handleSnap = (direction: 'left' | 'right') => {
            if (!data?.windowId) return

            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight - 64 // - taskbar
            const width = screenWidth / 2

            updateWindowSize(data.windowId, { width, height: screenHeight })
            updateWindowPosition(data.windowId, {
                x: direction === 'left' ? 0 : width,
                y: 0
            })
            hideMenu()
        }

        return [
            {
                label: win.isMaximized ? t('menu.restore') : t('menu.maximize'),
                icon: win.isMaximized ? Minimize2 : Maximize2,
                action: () => {
                    maximizeWindow(data.windowId!)
                    hideMenu()
                }
            },
            {
                label: t('menu.minimize'),
                icon: Minus,
                action: () => {
                    minimizeWindow(data.windowId!)
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.snap.left'),
                icon: ArrowLeftToLine,
                action: () => handleSnap('left')
            },
            {
                label: t('menu.snap.right'),
                icon: ArrowRightToLine,
                action: () => handleSnap('right')
            },
            { type: 'separator' },
            {
                label: t('menu.close'),
                icon: X,
                danger: true,
                action: () => {
                    closeWindow(data.windowId!)
                    hideMenu()
                }
            }
        ]
    }, [visible, isVisibleType, data, windows, t, maximizeWindow, minimizeWindow, closeWindow, updateWindowSize, updateWindowPosition, hideMenu])
}
