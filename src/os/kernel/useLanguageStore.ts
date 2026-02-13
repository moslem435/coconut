import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations } from './locales'

export type Language = 'en' | 'zh'

interface LanguageState {
    language: Language
    setLanguage: (lang: Language) => void
    toggleLanguage: () => void
    t: (key: string) => string
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'zh' as Language,
            setLanguage: (lang: Language) => set({ language: lang }),
            toggleLanguage: () => set((state) => ({
                language: state.language === 'en' ? 'zh' : 'en'
            })),
            t: (key: string) => {
                const lang = get().language
                return translations[lang]?.[key] || key
            }
        }),
        {
            name: 'portfolio_lang',
            partialize: (state) => ({ language: state.language }),
        }
    )
)
