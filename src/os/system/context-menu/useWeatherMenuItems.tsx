import { useMemo } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

export function useWeatherMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'weather-widget'
    data: ContextMenuData,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { setShowWeatherWidget } = useSystemSettings()

    return useMemo(() => {
        if (!visible || !isVisibleType) return []

        return [
            {
                label: t('menu.refresh') || 'Refresh',
                icon: RefreshCw,
                action: () => {
                    if (data?.onRefresh) data.onRefresh()
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.close') || 'Close',
                icon: X,
                danger: true,
                action: () => {
                    setShowWeatherWidget(false)
                    hideMenu()
                }
            }
        ]
    }, [visible, isVisibleType, data, t, setShowWeatherWidget, hideMenu])
}
