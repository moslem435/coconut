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

  const handleShowProblems = () => {
    console.log('Show Problems panel')
    // TODO: 切换到 Problems 标签
  }

  const handleChangeEncoding = () => {
    console.log('Change encoding - TODO')
    // TODO: 显示编码选择器
  }

  const handleChangeLanguage = () => {
    console.log('Change language mode - TODO')
    // TODO: 显示语言模式选择器
  }

  const handleFormatDocument = () => {
    console.log('Format document - TODO')
    // TODO: 触发格式化
  }

  return (
    <div 
      className="h-6 flex items-center justify-between px-3 text-xs select-none shrink-0"
      style={{ backgroundColor: VSCODE_COLORS.statusBar, color: 'white' }}
    >
      <div className="flex gap-4">
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded transition-colors"
          onClick={handleShowProblems}
          title="Show Problems"
        >
          <div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">×</div> 
          {errorCount}
        </div>
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded transition-colors"
          onClick={handleShowProblems}
          title="Show Problems"
        >
          <div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">!</div> 
          {warningCount}
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <span 
          className="cursor-pointer hover:bg-white/20 px-1 rounded transition-colors"
          title="Go to Line/Column"
        >
          {t('vscode.ln')} {line}, {t('vscode.col')} {col}
        </span>
        <span 
          className="cursor-pointer hover:bg-white/20 px-1 rounded transition-colors"
          onClick={handleChangeEncoding}
          title="Select Encoding"
        >
          UTF-8
        </span>
        <span 
          className="cursor-pointer hover:bg-white/20 px-1 rounded uppercase transition-colors"
          onClick={handleChangeLanguage}
          title="Select Language Mode"
        >
          {language}
        </span>
        <span 
          className="hover:bg-white/20 px-1 cursor-pointer rounded transition-colors"
          onClick={handleFormatDocument}
          title="Format Document (Ctrl+S)"
        >
          {t('vscode.prettier')}
        </span>
      </div>
    </div>
  )
}
