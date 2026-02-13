import en from './en'
import zh from './zh'

export const translations: Record<string, Record<string, string>> = { en, zh }
export type TranslationKey = keyof typeof en
