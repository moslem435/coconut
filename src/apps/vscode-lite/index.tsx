'use client'

import React, { useState, useEffect } from 'react'
import { Workbench } from './components/layout/Workbench'
import { TitleBar } from './components/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { FilePickerDialog } from '@/os/ui/dialogs/FilePickerDialog'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useEditorStateV2 } from './hooks/useEditorStateV2'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'

export default function VSCode() {
  const { getItem } = useFileSystemStore()
  const { openFile: openFileInEditor, getFileContent } = useEditorStateV2()
  const { readFileContent } = useFileSystemStore()
  const { boot: bootWebContainer } = useWebContainerStore()
  
  // 未保存提示
  useUnsavedChanges()
  
  // 预启动 WebContainer（用于终端）
  useEffect(() => {
    bootWebContainer()
  }, [bootWebContainer])

  // State
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // --- Handlers ---
  const handleOpenFile = () => setPickerOpen(true)

  const handleFilePickerConfirm = async (pathOrId: string) => {
    const file = getItem(pathOrId)
    if (file && file.type === 'file') {
      const cachedContent = getFileContent(file.id)
      if (cachedContent !== undefined) {
        openFileInEditor(file.id, cachedContent)
      } else {
        const content = await readFileContent(file.id)
        openFileInEditor(file.id, content)
      }
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
