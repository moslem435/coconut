"use client";

import React, { ReactNode } from 'react';
import { useLanguageStore } from './useLanguageStore';

// Re-export type for backward compatibility
export type { Language } from './useLanguageStore';

/**
 * Compatibility shim: The actual state is now managed by useLanguageStore (Zustand).
 * This hook preserves the original interface so existing consumers need no changes.
 */
export const useLanguage = () => {
  const store = useLanguageStore();
  return {
    language: store.language,
    setLanguage: store.setLanguage,
    toggleLanguage: store.toggleLanguage,
    t: store.t,
  };
};

/**
 * Compatibility shim: LanguageProvider is now a passthrough.
 * Zustand stores don't need a Provider wrapper.
 * Kept to avoid breaking layout.tsx imports.
 */
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
