import React, { useState, useEffect, useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Save, FilePlus, FolderOpen } from 'lucide-react'

interface NotepadProps {
  fileId?: string // If passed, open this file
}

const Notepad: React.FC<NotepadProps> = ({ fileId: initialFileId }) => {
  const [content, setContent] = useState('')
  const [currentFileId, setCurrentFileId] = useState<string | null>(initialFileId || null)
  const [status, setStatus] = useState('')
  
  const { getItem, updateFileContent, createItem } = useFileSystemStore()
  const { t } = useLanguage()

  // Load content if fileId is provided
  useEffect(() => {
    if (initialFileId) {
      const file = getItem(initialFileId)
      if (file) {
        setContent(file.content || '')
        setCurrentFileId(initialFileId)
      }
    }
  }, [initialFileId, getItem])

  const handleSave = () => {
    if (currentFileId) {
      updateFileContent(currentFileId, content)
      setStatus(t('notepad.saved'))
      setTimeout(() => setStatus(''), 2000)
    } else {
      handleSaveAs()
    }
  }

  const handleSaveAs = () => {
    // Simple implementation: Create a new file on Desktop
    // In a real OS, this would open a File Picker dialog
    const name = prompt(t('notepad.prompt'), t('notepad.untitled'))
    if (name) {
      const newId = createItem('desktop', name, 'file', content)
      setCurrentFileId(newId)
      setStatus(`${t('notepad.savedto')} ${name}`)
      setTimeout(() => setStatus(''), 2000)
    }
  }

  const handleNew = () => {
    setContent('')
    setCurrentFileId(null)
    setStatus(t('notepad.newfile'))
  }

  // Keyboard shortcut for Save (Ctrl+S)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }, [currentFileId, content])

  return (
    <div className="h-full w-full flex flex-col bg-white/90 text-black backdrop-blur-sm pt-10" onKeyDown={handleKeyDown}>
      {/* Menu Bar */}
      <div className="flex items-center gap-2 p-1 border-b border-gray-300/50 text-sm bg-white/50">
        <button onClick={handleNew} className="p-1 hover:bg-gray-200 rounded flex items-center gap-1">
          <FilePlus size={16} /> {t('notepad.new')}
        </button>
        <button onClick={handleSave} className="p-1 hover:bg-gray-200 rounded flex items-center gap-1">
          <Save size={16} /> {t('notepad.save')}
        </button>
        <div className="flex-1" />
        <span className="text-gray-500 text-xs px-2">{status}</span>
      </div>

      {/* Text Area */}
      <textarea
        className="flex-1 w-full h-full p-4 resize-none outline-none font-mono text-sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        placeholder={t('notepad.placeholder')}
        autoFocus
      />
    </div>
  )
}

export default Notepad
