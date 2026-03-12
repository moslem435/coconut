/**
 * @fileoverview 语言 Store - 多语言切换与文本翻译管理
 * 
 * 为什么将翻译函数 t() 放入 Store 而非独立的 i18n 库：
 * - 编度更简单，组件只需 const { t } = useLanguageStore()
 * - 语言切换后依赖 t() 的组件自动重渲染（Zustand 订阅机制）
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-02-15
 * @module src/os/kernel/useLanguageStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations } from './locales'
import en from './locales/en'

/** 支持的语言类型 */
export type Language = 'en' | 'zh'
/** 翻译键类型（基于英文语言包推断，确保类型安全） */
export type TranslationKey = keyof typeof en

/**
 * 语言 Store 状态接口
 */
interface LanguageState {
    /** 当前语言 */
    language: Language
    /** 设置语言 */
    setLanguage: (lang: Language) => void
    /** 切换中英语言 */
    toggleLanguage: () => void
    /**
     * 翻译函数，支持参数插入
     * @param key - 翻译键
     * @param params - 插入参数，如 { name: 'World' } 与模板 'Hello {name}' 匹配
     * @returns 翻译后的字符串，找不到则返回 key 本身
     */
    t: (key: TranslationKey | string, params?: Record<string, string | number>) => string
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'zh' as Language,
            setLanguage: (lang: Language) => set({ language: lang }),
            toggleLanguage: () => set((state) => ({
                language: state.language === 'en' ? 'zh' : 'en'
            })),
            t: (key: string, params?: Record<string, string | number>) => {
                const lang = get().language
                // 翻译优先级：当前语言 → 英语备用 → key 本身
                let text = translations[lang]?.[key] || translations['en']?.[key] || key

                // 简单参数插入：将 {name} 替换为对应参数値
                if (params) {
                    Object.entries(params).forEach(([k, v]) => {
                        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v))
                    })
                }

                return text
            }
        }),
        {
            name: 'portfolio_lang',
            partialize: (state) => ({ language: state.language }),
        }
    )
)
