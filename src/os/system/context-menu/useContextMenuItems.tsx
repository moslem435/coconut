import { useDesktopMenuItems } from './useDesktopMenuItems'
import { useWindowMenuItems } from './useWindowMenuItems'
import { useTaskbarMenuItems } from './useTaskbarMenuItems'
import { useFileMenuItems } from './useFileMenuItems'
import { useExplorerMenuItems } from './useExplorerMenuItems'
import { useWeatherMenuItems } from './useWeatherMenuItems'
import { ContextMenuData, MenuType, Position } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'
import { useContextMenuRegistry } from '@/os/kernel/useContextMenuRegistry'

export function useContextMenuItems(
    visible: boolean,
    type: MenuType | null,
    data: ContextMenuData,
    position: Position,
    hideMenu: () => void
): MenuItem[] {
    const desktopItems = useDesktopMenuItems(visible, type === 'desktop', position, hideMenu)
    const windowItems = useWindowMenuItems(visible, type === 'window-titlebar', data, hideMenu)
    const taskbarItems = useTaskbarMenuItems(visible, type === 'taskbar-icon', data, hideMenu)
    const fileItems = useFileMenuItems(visible, type === 'desktop-item', data, hideMenu)
    const explorerItems = useExplorerMenuItems(visible, type === 'explorer-background', data, hideMenu)
    const weatherItems = useWeatherMenuItems(visible, type === 'weather-widget', data, hideMenu)

    // Get dynamic items from registry
    const { getMenuItems } = useContextMenuRegistry()
    const dynamicItems = visible && type ? getMenuItems(type, data) : []

    if (!visible) return []

    let items: MenuItem[] = []

    if (type === 'desktop') items = desktopItems
    else if (type === 'window-titlebar') items = windowItems
    else if (type === 'taskbar-icon') items = taskbarItems
    else if (type === 'desktop-item') items = fileItems
    else if (type === 'explorer-background') items = explorerItems
    else if (type === 'weather-widget') items = weatherItems
    
    // Merge dynamic items
    if (dynamicItems.length > 0) {
        if (items.length > 0) {
            items.push({ type: 'separator' })
        }
        // Map dynamic items to ensure hideMenu is called if action exists
        const wrappedDynamicItems = dynamicItems.map(item => item.action ? ({
            ...item,
            action: () => {
                item.action?.()
                hideMenu()
            }
        }) : item)
        items = [...items, ...wrappedDynamicItems]
    }

    return items
}
