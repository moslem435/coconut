import React from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { VSCODE_COLORS } from '../constants'

interface StatusBarProps {
  line: number
  col: number
  language: string
  errorCount: number
  warningCount: number
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  line, 
  col, 
  language, 
  errorCount = 0, 
  warningCount = 0 
}) => {
  const { t } = useLanguage()

  return (
    <div 
      className="h-6 flex items-center justify-between px-3 text-xs select-none shrink-0"
      style={{ backgroundColor: VSCODE_COLORS.statusBar, color: 'white' }}
    >
      <div className="flex gap-4">
        <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded">
          <div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">×</div> 
          {errorCount}
        </div>
        <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded">
          <div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">!</div> 
          {warningCount}
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <span className="cursor-pointer hover:bg-white/20 px-1 rounded">
          {t('vscode.ln')} {line}, {t('vscode.col')} {col}
        </span>
        <span className="cursor-pointer hover:bg-white/20 px-1 rounded">UTF-8</span>
        <span className="cursor-pointer hover:bg-white/20 px-1 rounded uppercase">{language}</span>
        <span className="hover:bg-white/20 px-1 cursor-pointer rounded">{t('vscode.prettier')}</span>
      </div>
    </div>
  )
}
