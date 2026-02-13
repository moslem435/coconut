import React from 'react'
import { Menu, Save, Play, Terminal as TerminalIcon } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { VSCODE_COLORS } from '../constants'

interface TitleBarProps {
  onOpenFile: () => void
  onSave: () => void
  onToggleTerminal: () => void
  showTerminal: boolean
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenFile, onSave, onToggleTerminal, showTerminal }) => {
  const { t } = useLanguage()

  const menuItems = [
    { label: t('vscode.file'), action: onOpenFile },
    { label: t('vscode.edit') },
    { label: t('vscode.selection') },
    { label: t('vscode.view') },
    { label: t('vscode.go') },
    { label: t('vscode.run') },
    { label: t('vscode.terminal'), action: onToggleTerminal },
    { label: t('vscode.help') },
  ]

  return (
    <div 
      className="h-8 flex items-center px-2 text-xs select-none justify-between shrink-0"
      style={{ backgroundColor: VSCODE_COLORS.titleBar, color: VSCODE_COLORS.text }}
    >
      <div className="flex gap-4 items-center">
        <Menu size={14} className="cursor-pointer" style={{ color: VSCODE_COLORS.text }} />
        {menuItems.map((item, idx) => (
          <span 
            key={idx} 
            className="cursor-pointer hover:text-white"
            onClick={item.action}
          >
            {item.label}
          </span>
        ))}
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={onSave} className="hover:text-white" title={t('vscode.save')}>
          <Save size={14} />
        </button>
        <button 
          onClick={onToggleTerminal} 
          className={`hover:text-white ${showTerminal ? 'text-blue-400' : ''}`} 
          title={t('vscode.terminal')}
        >
          <TerminalIcon size={14} />
        </button>
        <button className="hover:text-green-400" title={t('vscode.runcode')}>
          <Play size={14} />
        </button>
      </div>
    </div>
  )
}
