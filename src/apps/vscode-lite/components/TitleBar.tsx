import React from 'react'
import { Menu, Save, Play, Terminal as TerminalIcon, Globe, LayoutTemplate, X, Minus, Square } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { VSCODE_COLORS } from '../constants'
import { Menubar } from './Menubar'
import { useWindowContext } from '@/os/kernel/WindowContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'

interface TitleBarProps {
  onOpenFile: () => void
  onSave: () => void
  onToggleTerminal: () => void
  showTerminal: boolean
  onTogglePreview: () => void
  showPreview: boolean
  onRun: () => void
  onOpenCommandPalette: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onOpenFile,
  onSave,
  onToggleTerminal,
  showTerminal,
  onTogglePreview,
  showPreview,
  onRun,
  onOpenCommandPalette
}) => {
  const { t } = useLanguage()
  const windowContext = useWindowContext() // { windowId, dragControls }
  const { minimizeWindow, maximizeWindow, closeWindow, windows } = useWindowStore()

  const windowId = windowContext?.windowId
  const windowState = windowId ? windows[windowId] : null
  const isMaximized = windowState?.isMaximized ?? false

  const menus = [
    {
      label: t('vscode.file'),
      items: [
        { label: 'New File', action: () => { }, shortcut: 'Ctrl+N' },
        { label: 'Open File...', action: onOpenFile, shortcut: 'Ctrl+O' },
        { separator: true, label: '' },
        { label: 'Save', action: onSave, shortcut: 'Ctrl+S' },
        { label: 'Save As...', disabled: true },
        { separator: true, label: '' },
        { label: 'Exit', action: () => windowId && closeWindow(windowId) }
      ]
    },
    {
      label: t('vscode.edit'),
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
      ]
    },
    {
      label: t('vscode.view'),
      items: [
        { label: 'Command Palette...', action: onOpenCommandPalette, shortcut: 'Ctrl+Shift+P' },
        { separator: true, label: '' },
        { label: 'Explorer', action: () => { } },
        { label: 'Search', action: () => { } },
        { label: 'Source Control', action: () => { } },
        { separator: true, label: '' },
        { label: 'Toggle Word Wrap', action: () => { } },
      ]
    },
    {
      label: t('vscode.terminal'),
      items: [
        { label: 'New Terminal', action: onToggleTerminal, shortcut: 'Ctrl+`' },
        { label: 'Run Active File', action: onRun },
      ]
    },
    {
      label: t('vscode.help'),
      items: [
        { label: 'Welcome' },
        { label: 'Documentation' },
        { separator: true, label: '' },
        { label: 'About' }
      ]
    }
  ]

  return (
    <div
      className="h-8 flex items-center px-2 text-xs select-none justify-between shrink-0"
      style={{ backgroundColor: VSCODE_COLORS.titleBar, color: VSCODE_COLORS.text }}
      onPointerDown={(e) => {
        if (windowContext?.dragControls) {
          windowContext.dragControls.start(e)
        }
      }}
      onDoubleClick={() => {
        if (windowId) maximizeWindow(windowId)
      }}
    >
      <div className="flex gap-2 items-center h-full" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mr-2">
          <Menu size={14} className="cursor-pointer" style={{ color: '#007acc' }} />
        </div>
        <Menubar menus={menus} />
      </div>

      {/* Center Title (Optional) */}
      {/* <div className="absolute left-1/2 -translate-x-1/2 opacity-50 text-xs pointer-events-none">
          {windowState?.title || 'VS Code'}
      </div> */}

      <div className="flex items-center h-full">
        {/* Quick Actions */}
        <div className="flex gap-3 items-center mr-4" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={onSave} className="hover:text-white" title={t('vscode.save')}>
            <Save size={14} />
          </button>
          <button
            onClick={onToggleTerminal}
            className={`hover:text-white ${showTerminal ? 'text-blue-400' : ''}`}
            title={t('vscode.terminal')}
          >
            <LayoutTemplate size={14} />
          </button>
          <button
            className={`hover:text-white ${showPreview ? 'text-blue-400' : ''}`}
            onClick={onTogglePreview}
            title="Toggle Preview"
          >
            <Globe size={14} />
          </button>
          <button
            className="hover:text-green-400"
            title={t('vscode.runcode')}
            onClick={onRun}
          >
            <Play size={14} />
          </button>
        </div>

        {/* Window Controls */}
        {windowId && (
          <div className="flex items-center h-full ml-2 border-l border-[#3c3c3c] pl-2" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className="p-1.5 hover:bg-[#3c3c3c] rounded-sm transition-colors"
              onClick={() => minimizeWindow(windowId)}
            >
              <Minus size={14} />
            </button>
            <button
              className="p-1.5 hover:bg-[#3c3c3c] rounded-sm transition-colors"
              onClick={() => maximizeWindow(windowId)}
            >
              <Square size={12} strokeWidth={2} />
            </button>
            <button
              className="p-1.5 hover:bg-red-500 hover:text-white rounded-sm transition-colors"
              onClick={() => closeWindow(windowId)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
