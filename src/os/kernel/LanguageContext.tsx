"use client";

/**
 * @fileoverview 语言上下文兼容层 - 迁移到 Zustand Store 后的向后兼容 shim
 * 
 * 为什么保留这个文件：
 * - 原始代码使用 React Context，迁移到 Zustand 后保留接口避免改动大量消费者
 * - LanguageProvider 现在是透传组件，不再需要 Provider 包裹
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-02-13
 * @module src/os/kernel/LanguageContext
 */

import React, { ReactNode } from 'react';
import { useLanguageStore } from './useLanguageStore';

// Re-export type for backward compatibility
export type { Language } from './useLanguageStore';

/**
 * 向后兼容 Hook: 封装 useLanguageStore，保留原有接口
 * 现有消费者无需改动，直接替换 useLanguage() 即可
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
 * 向后兼容 Provider: LanguageProvider 现已是透传组件
 * Zustand Store 不需要 Provider 包裹，依靠模块单例实现全局状态
 */
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
