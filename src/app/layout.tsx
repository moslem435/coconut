import type { Metadata } from "next";
import './globals.css'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { SiteProtection } from '@/os/system/SiteProtection'
import { LanguageProvider } from "@/os/kernel/LanguageContext"
import { SystemSettingsProvider } from "@/os/kernel/SystemSettingsContext"

export const metadata: Metadata = {
  title: 'Coconut OS',
  description: 'Interactive 3D Portfolio Experience',
}

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
