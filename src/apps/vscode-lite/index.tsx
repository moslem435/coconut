'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import { FilePickerDialog } from '@/os/ui/dialogs/FilePickerDialog'
import dynamic from 'next/dynamic'

import { ActivityBar } from './components/ActivityBar'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { TabBar } from './components/TabBar'
import { StatusBar } from './components/StatusBar'
import { EditorComponent } from './components/Editor'
import { VSCODE_COLORS } from './constants'

// Dynamically import XTerm
const XTerm = dynamic(() => import('@/os/components/XTerm'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Terminal...</div>
})

export default function VSCode() {
  const { files, getItem, updateFileContent, readFileContent } = useFileSystemStore()
  const { t } = useLanguage()

  // State
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer')
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({}) // fileId -> content
  const [showTerminal, setShowTerminal] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 })

  // --- Handlers ---

  const handleFileSelect = useCallback((id: string) => {
    if (!openFiles.includes(id)) {
      setOpenFiles(prev => [...prev, id])
    }
    setActiveFileId(id)
  }, [openFiles])

  const handleCloseFile = useCallback((id: string) => {
    const newOpen = openFiles.filter(fid => fid !== id)
    setOpenFiles(newOpen)
    
    if (activeFileId === id) {
      setActiveFileId(newOpen[newOpen.length - 1] || null)
    }
    
    // Optional: Warn about unsaved changes? For now, we discard them or keep them?
    // VS Code keeps them in memory usually until closed. If closed, it prompts.
    // Here we will just discard for simplicity, or maybe keep them in unsavedChanges map?
    // If we keep them, next time we open, they are there. That's better.
  }, [openFiles, activeFileId])

  const handleSave = useCallback(async () => {
    if (activeFileId && unsavedChanges[activeFileId] !== undefined) {
      const contentToSave = unsavedChanges[activeFileId]
      await updateFileContent(activeFileId, contentToSave)
      
      setUnsavedChanges(prev => {
        const next = { ...prev }
        delete next[activeFileId]
        return next
      })
    }
  }, [activeFileId, unsavedChanges, updateFileContent])

  const handleContentChange = useCallback((newContent: string | undefined) => {
    if (newContent === undefined) return
    setContent(newContent)
    if (activeFileId) {
      setUnsavedChanges(prev => ({ ...prev, [activeFileId]: newContent }))
    }
  }, [activeFileId])

  const handleOpenFile = () => setPickerOpen(true)

  const handleFilePickerConfirm = (pathOrId: string) => {
    const file = getItem(pathOrId)
    if (file && file.type === 'file') {
      handleFileSelect(pathOrId)
    }
    setPickerOpen(false)
  }

  // --- Shortcuts ---
  useShortcuts({
    'Ctrl+S': (e) => { e.preventDefault(); handleSave() },
    'Meta+S': (e) => { e.preventDefault(); handleSave() },
    'Ctrl+P': (e) => { e.preventDefault(); handleOpenFile() },
    'Meta+P': (e) => { e.preventDefault(); handleOpenFile() },
  })

  // --- Effects ---

  // Load content when active file changes
  useEffect(() => {
    let mounted = true
    if (activeFileId) {
      if (unsavedChanges[activeFileId] !== undefined) {
        setContent(unsavedChanges[activeFileId])
      } else {
        readFileContent(activeFileId).then(c => {
          if (mounted) setContent(c)
        }).catch(() => {
          if (mounted) setContent('')
        })
      }
    } else {
      setContent('')
    }
    return () => { mounted = false }
  }, [activeFileId]) // Only when file changes

  // Derived state for current file
  const activeFile = activeFileId ? files[activeFileId] : null
  const language = activeFile ? (activeFile.name.split('.').pop() || 'plaintext') : 'plaintext'

  return (
    <div className="h-full w-full flex flex-col font-sans text-[#cccccc] pt-10" style={{ backgroundColor: VSCODE_COLORS.bg }}>
      
      {/* Top Bar */}
      <TitleBar 
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showTerminal={showTerminal}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar activeView={activeView} onChangeView={setActiveView} />
        
        {/* Sidebar */}
        <Sidebar 
          activeView={activeView} 
          activeFileId={activeFileId} 
          onFileSelect={handleFileSelect} 
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs */}
          <TabBar 
            openFiles={openFiles}
            activeFileId={activeFileId}
            unsavedChanges={Object.keys(unsavedChanges).reduce((acc, key) => ({...acc, [key]: true}), {})}
            onSelect={setActiveFileId}
            onClose={handleCloseFile}
          />

          {/* Editor or Welcome Screen */}
          <div className="flex-1 relative overflow-hidden">
            {activeFileId && activeFile ? (
              <EditorComponent 
                fileId={activeFileId}
                fileName={activeFile.name}
                content={content}
                onChange={handleContentChange}
                onSave={handleSave}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 select-none bg-[#1e1e1e]">
                <div className="text-6xl mb-4 font-thin">VS Code</div>
                <div className="text-sm">{t('vscode.start')}</div>
                <div className="mt-8 text-xs flex flex-col gap-2">
                  <div className="flex gap-2"><span>{t('vscode.commands')}</span><span className="bg-[#333] px-1 rounded">Ctrl+Shift+P</span></div>
                  <div className="flex gap-2"><span>{t('vscode.gofile')}</span><span className="bg-[#333] px-1 rounded">Ctrl+P</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-48 border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col shrink-0">
               <div className="flex items-center justify-between px-2 py-1 bg-[#252526] text-xs uppercase tracking-wider text-gray-400 select-none">
                <div className="flex gap-4">
                  <span className="text-white font-bold border-b border-white cursor-pointer">{t('vscode.terminal')}</span>
                  <span className="cursor-pointer hover:text-white">{t('vscode.output')}</span>
                  <span className="cursor-pointer hover:text-white">{t('vscode.problems')}</span>
                </div>
                <div className="cursor-pointer hover:text-white" onClick={() => setShowTerminal(false)}>
                  <span className="text-xs">×</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <XTerm className="h-full w-full" style={{ backgroundColor: '#1e1e1e' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar 
        line={cursorPosition.line} 
        col={cursorPosition.col} 
        language={language.toUpperCase()}
        errorCount={0}
        warningCount={0}
      />

      <FilePickerDialog
        isOpen={pickerOpen}
        mode="open"
        onConfirm={handleFilePickerConfirm}
        onCancel={() => setPickerOpen(false)}
        initialPath="root"
      />
    </div>
  )
}
