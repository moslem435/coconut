import { useDesktopMenuItems } from './useDesktopMenuItems'
import { useWindowMenuItems } from './useWindowMenuItems'
import { useTaskbarMenuItems } from './useTaskbarMenuItems'
import { useFileMenuItems } from './useFileMenuItems'
import { useExplorerMenuItems } from './useExplorerMenuItems'
import { useWeatherMenuItems } from './useWeatherMenuItems'
import { ContextMenuData, MenuType, Position } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

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

    if (!visible) return []

    if (type === 'desktop') return desktopItems
    if (type === 'window-titlebar') return windowItems
    if (type === 'taskbar-icon') return taskbarItems
    if (type === 'desktop-item') return fileItems
    if (type === 'explorer-background') return explorerItems
    if (type === 'weather-widget') return weatherItems

    return []
}
