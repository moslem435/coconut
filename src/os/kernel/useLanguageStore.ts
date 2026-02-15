import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations } from './locales'
import en from './locales/en'

export type Language = 'en' | 'zh'
export type TranslationKey = keyof typeof en

interface LanguageState {
    language: Language
    setLanguage: (lang: Language) => void
    toggleLanguage: () => void
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
                // 1. Try current language
                // 2. Fallback to English
                // 3. Fallback to key itself
                let text = translations[lang]?.[key] || translations['en']?.[key] || key

                // Simple interpolation: "Hello {name}" -> "Hello World"
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
