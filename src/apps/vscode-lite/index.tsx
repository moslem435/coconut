'use client'

import React, { useState, useEffect } from 'react'
import { Workbench } from './components/layout/Workbench'
import { TitleBar } from './components/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { FilePickerDialog } from '@/os/ui/dialogs/FilePickerDialog'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useEditorState } from './hooks/useEditorState'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import dynamic from 'next/dynamic'

// Dynamically import XTerm
const XTerm = dynamic(() => import('@/os/components/XTerm'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Terminal...</div>
})

export default function VSCode() {
  const { getItem } = useFileSystemStore()
  const { openFile, activeFileId } = useEditorState()

  // State
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // --- Handlers ---
  const handleOpenFile = () => setPickerOpen(true)

  const handleFilePickerConfirm = (pathOrId: string) => {
    const file = getItem(pathOrId)
    if (file && file.type === 'file') {
      openFile(file.id) // Use hook to open
    }
    setPickerOpen(false)
  }

  // --- Commands ---
  const commands = [
    { id: 'workbench.action.showCommands', title: 'Show Command Palette', shortcut: 'Ctrl+Shift+P', action: () => setShowCommandPalette(true) },
    { id: 'workbench.action.files.newUntitledFile', title: 'New File', shortcut: 'Ctrl+N', action: () => { } }, // TODO: connect to dialog
    { id: 'workbench.action.files.openFile', title: 'Open File...', shortcut: 'Ctrl+O', action: handleOpenFile },
    { id: 'workbench.action.files.save', title: 'Save', shortcut: 'Ctrl+S', action: () => { } },
    { id: 'workbench.action.toggleSidebarVisibility', title: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => { } }, // TODO
    { id: 'workbench.action.terminal.toggleTerminal', title: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => setShowTerminal(prev => !prev) },
    { id: 'workbench.action.togglePreview', title: 'Toggle Preview', action: () => setShowPreview(prev => !prev) },
    { id: 'workbench.action.reloadWindow', title: 'Reload Window', action: () => window.location.reload() },
  ]

  // --- Shortcuts ---
  useShortcuts({
    'Ctrl+P': (e) => { e.preventDefault(); handleOpenFile() },
    'Meta+P': (e) => { e.preventDefault(); handleOpenFile() },
    'Ctrl+Shift+P': (e) => { e.preventDefault(); setShowCommandPalette(true) },
    'F1': (e) => { e.preventDefault(); setShowCommandPalette(true) },
    // Save shortcut is now handled in Editor component, but can be global too? 
    // Ideally EditorGroup/Editor should handle it to save active file.
  })

  return (
    <div className="h-full w-full flex flex-col font-sans text-[#cccccc] overflow-hidden">

      {/* Top Bar */}
      <TitleBar
        onOpenFile={handleOpenFile}
        onSave={() => { }} // Save handled in Editor component for now
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
        onTogglePreview={() => setShowPreview(!showPreview)}
        showPreview={showPreview}
        onRun={() => {
          setShowTerminal(true)
          setShowPreview(true)
        }}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Main Workbench Layout */}
      <div className="flex-1 overflow-hidden relative">
        <Workbench
          activeView={activeView}
          setActiveView={setActiveView}
          showTerminal={showTerminal}
          onToggleTerminal={setShowTerminal}
          showPreview={showPreview}
          onTogglePreview={setShowPreview}
        />

        {/* Terminal Overlay (Temporary, until integrated into Panel) */}
        {showTerminal && (
          <div className="absolute bottom-0 left-0 right-0 h-48 border-t border-[#3c3c3c] bg-[#1e1e1e] z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-2 py-1 bg-[#252526] text-xs uppercase tracking-wider text-gray-400 select-none">
              <span className="font-bold">Terminal</span>
              <div className="cursor-pointer hover:text-white" onClick={() => setShowTerminal(false)}>
                ×
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <XTerm className="h-full w-full" style={{ backgroundColor: '#1e1e1e' }} />
            </div>
          </div>
        )}
      </div>

      <FilePickerDialog
        isOpen={pickerOpen}
        mode="open"
        onConfirm={handleFilePickerConfirm}
        onCancel={() => setPickerOpen(false)}
        initialPath="root"
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
    </div>
  )
}
