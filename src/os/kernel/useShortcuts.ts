/**
 * @fileoverview 键盘快捷键 Hook - 窗口激活态识别快捷键
 * 
 * 为什么需要这个 Hook而非全局监听器：
 * - 快捷键只应在当前激活窗口中触发，避免多个窗口同时响应
 * - 每个窗口可独立注册自己的快捷键集合
 * 
 * @author yume
 * @created 2026-02-10
 * @lastModified 2026-02-10
 * @module src/os/kernel/useShortcuts
 */

import { useEffect, useRef } from 'react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useWindowId } from '@/os/kernel/WindowContext'

/** 快捷键回调函数类型 */
type ShortcutHandler = (e: KeyboardEvent) => void
/** 快捷键映射表，键为组合键如 'Ctrl+S' */
type Shortcuts = Record<string, ShortcutHandler>

/**
 * 键盘快捷键绑定 Hook
 * 
 * 只有当前窗口激活时才触发快捷键，避免多窗口之间冒 制
 * 
 * @param shortcuts - 映射表，键为组合键，值为回调
 * @example
 * ```typescript
 * useShortcuts({
 *   'Ctrl+S': (e) => { e.preventDefault(); save(); }
 * })
 * ```
 * 支持修饰符: Ctrl, Alt, Shift, Meta
 */
export function useShortcuts(shortcuts: Shortcuts) {
    const windowId = useWindowId()
    const activeWindowId = useWindowStore(state => state.activeWindowId)
    
    // 用 ref 缓存 shortcuts，避免 shortcuts 引用变化时重新绑定监听器导致水戚效应
    const shortcutsRef = useRef(shortcuts)
    useEffect(() => {
        shortcutsRef.current = shortcuts
    }, [shortcuts])

    useEffect(() => {
        // 如果在窗口内部，只有当前窗口激活时才响应快捷键
        if (windowId && windowId !== activeWindowId) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase()
            // 过滤单独修饰符按下（如单独按 Ctrl 不触发任何快捷键）
            if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) return

            // 遍历所有已注册的快捷键并尝试匹配
            for (const [combo, handler] of Object.entries(shortcutsRef.current)) {
                const parts = combo.split('+').map(p => p.trim())
                const targetKey = parts.pop()?.toUpperCase()
                
                if (targetKey !== key) continue

                // Check modifiers
                const requiresCtrl = parts.includes('Ctrl')
                const requiresAlt = parts.includes('Alt')
                const requiresShift = parts.includes('Shift')
                const requiresMeta = parts.includes('Meta')

                // 修饰符严格匹配：需要精确匹配修饰符状态，避免意外触发
                if (
                    e.ctrlKey === requiresCtrl &&
                    e.altKey === requiresAlt &&
                    e.shiftKey === requiresShift &&
                    e.metaKey === requiresMeta
                ) {
                    handler(e)
                    // 匹配后即展，防止同一事件触发多个快捷键
                    return 
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [windowId, activeWindowId])
}
