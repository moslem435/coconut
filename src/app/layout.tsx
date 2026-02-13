import type { Metadata } from "next";
import { Roboto, Orbitron, Rajdhani } from 'next/font/google'
import './globals.css'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { SiteProtection } from '@/os/system/SiteProtection'
import { LanguageProvider } from "@/os/kernel/LanguageContext"

import { SystemSettingsProvider } from "@/os/kernel/SystemSettingsContext"

const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-roboto' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-rajdhani' })

export const metadata: Metadata = {
  title: 'FolioOS',
  description: 'Interactive 3D Portfolio Experience',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark overflow-hidden" suppressHydrationWarning>
      <body className={`${roboto.variable} ${orbitron.variable} ${rajdhani.variable} font-sans bg-black text-white antialiased overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-100`}>
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
