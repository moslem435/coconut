/**
 * @fileoverview Next.js 根布局组件
 * 
 * 功能：
 * - 全局样式导入(PDF查看器样式、Tailwind CSS)
 * - 全局Provider配置(系统设置、语言、站点保护)
 * - 元数据配置(SEO)
 * 
 * 架构决策：
 * - 在layout层级注入全局Provider，确保所有子页面共享状态
 * - suppressHydrationWarning抑制 hydration 不匹配警告(由主题切换引起)
 * 
 * @author yume
 * @created 2026-02-02
 * @lastModified 2026-02-26
 * @module src/app/layout
 */

import type { Metadata } from "next";
import './globals.css'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { SiteProtection } from '@/os/system/SiteProtection'
import { LanguageProvider } from "@/os/kernel/LanguageContext"
import { SystemSettingsProvider } from "@/os/kernel/SystemSettingsContext"

/**
 * 应用元数据配置
 * 
 * 用于SEO和浏览器标签页显示
 */
export const metadata: Metadata = {
  title: 'Coconut OS',
  description: 'Interactive 3D Portfolio Experience',
}

/**
 * 根布局组件
 * 
 * Provider层级(从内到外)：
 * 1. LanguageProvider - 语言/国际化
 * 2. SystemSettingsProvider - 系统设置(主题、音效等)
 * 3. SiteProtection - 站点访问保护
 * 
 * 为什么按此顺序嵌套：
 * - 外层Provider不依赖内层，内层可以访问外层状态
 * - SiteProtection在最外层，确保先通过访问检查再渲染内容
 * 
 * @param children - 子组件(页面内容)
 * @returns JSX.Element
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overflow-hidden" suppressHydrationWarning>
      <body className={`font-sans antialiased overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-100`}>
        <SiteProtection />
        <SystemSettingsProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SystemSettingsProvider>
      </body>
    </html>
  )
}
