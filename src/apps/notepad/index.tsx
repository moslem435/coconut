import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import { Save, FilePlus, FolderOpen, Search, ZoomIn, ZoomOut, Type, X } from 'lucide-react'
import { FilePickerDialog } from '@/os/ui/dialogs/FilePickerDialog'

interface NotepadProps {
  fileId?: string
}

const Notepad: React.FC<NotepadProps> = ({ fileId: initialFileId }) => {
  const [content, setContent] = useState('')
  const [currentFileId, setCurrentFileId] = useState<string | null>(initialFileId || null)
  const [status, setStatus] = useState('')
  const [showFind, setShowFind] = useState(false)
  const [findText, setFindText] = useState('')
  const [zoom, setZoom] = useState(100)
  const [wordWrap, setWordWrap] = useState(true)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  // File Picker State
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'open' | 'save'>('open')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { getItem, updateFileContent, createItem, readFileContent } = useFileSystemStore()
  const { t } = useLanguage()

  // Load content
  useEffect(() => {
    if (initialFileId) {
      const file = getItem(initialFileId)
      if (file) {
        readFileContent(initialFileId).then(c => {
          setContent(c)
          setCurrentFileId(initialFileId)
          setStatus(t('notepad.opened'))
        }).catch(e => console.error(e))
      }
    }
  }, [initialFileId, getItem, t, readFileContent])

  // Track cursor position
  const updateCursorPos = () => {
    if (textareaRef.current) {
      const val = textareaRef.current.value
      const sel = textareaRef.current.selectionStart
      const lines = val.substr(0, sel).split('\n')
      setCursorPos({
        line: lines.length,
        col: lines[lines.length - 1].length + 1
      })
    }
  }

  const handleSave = () => {
    if (currentFileId) {
      updateFileContent(currentFileId, content)
      setStatus(t('notepad.saved'))
      setTimeout(() => setStatus(''), 2000)
    } else {
      setPickerMode('save')
      setPickerOpen(true)
    }
  }

  const handleOpen = () => {
    setPickerMode('open')
    setPickerOpen(true)
  }

  const handleNew = () => {
    setContent('')
    setCurrentFileId(null)
    setStatus(t('notepad.newfile'))
  }

  const handleFilePickerConfirm = async (pathOrId: string, name?: string) => {
    if (pickerMode === 'open') {
      // pathOrId is fileId
      const file = getItem(pathOrId)
      if (file) {
        try {
          const c = await readFileContent(pathOrId)
          setContent(c)
          setCurrentFileId(pathOrId)
          setStatus(t('notepad.opened'))
        } catch (e) { console.error(e) }
      }
    } else {
      // pathOrId is folderPath, name is fileName
      if (name) {
        const newId = await createItem(pathOrId, name, 'file', content)
        setCurrentFileId(newId)
        setStatus(`${t('notepad.savedto')} ${name}`)
      }
    }
    setPickerOpen(false)
  }

  // Shortcuts
  useShortcuts({
    'Ctrl+S': (e) => { e.preventDefault(); handleSave() },
    'Meta+S': (e) => { e.preventDefault(); handleSave() },
    'Ctrl+O': (e) => { e.preventDefault(); handleOpen() },
    'Meta+O': (e) => { e.preventDefault(); handleOpen() },
    'Ctrl+F': (e) => { e.preventDefault(); setShowFind(p => !p) },
    'Meta+F': (e) => { e.preventDefault(); setShowFind(p => !p) },
    'Ctrl+=': (e) => { e.preventDefault(); setZoom(z => Math.min(z + 10, 200)) },
    'Meta+=': (e) => { e.preventDefault(); setZoom(z => Math.min(z + 10, 200)) },
    'Ctrl+-': (e) => { e.preventDefault(); setZoom(z => Math.max(z - 10, 50)) },
    'Meta+-': (e) => { e.preventDefault(); setZoom(z => Math.max(z - 10, 50)) }
  })

  // Find logic (simple highlight/select)
  const handleFind = () => {
    if (!findText || !textareaRef.current) return
    const index = content.indexOf(findText, textareaRef.current.selectionEnd)
    if (index !== -1) {
      textareaRef.current.setSelectionRange(index, index + findText.length)
      textareaRef.current.focus()
    } else {
      // Wrap around
      const indexStart = content.indexOf(findText)
      if (indexStart !== -1) {
        textareaRef.current.setSelectionRange(indexStart, indexStart + findText.length)
        textareaRef.current.focus()
      } else {
        setStatus('Text not found')
      }
    }
  }

  return (
    <div
      className="h-full w-full flex flex-col bg-white/95 dark:bg-[#1e1e1e]/95 text-black dark:text-gray-200 backdrop-blur-sm pt-10"
    >
      {/* Menu Bar */}
      <div className="flex items-center gap-1 p-1 border-b border-gray-300/50 dark:border-white/10 text-xs bg-gray-50/50 dark:bg-white/5">
        <button onClick={handleNew} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1.5 transition-colors">
          <FilePlus size={14} /> <span>{t('notepad.new')}</span>
        </button>
        <button onClick={handleOpen} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1.5 transition-colors">
          <FolderOpen size={14} /> <span>Open</span>
        </button>
        <button onClick={handleSave} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1.5 transition-colors">
          <Save size={14} /> <span>{t('notepad.save')}</span>
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1" />

        <button onClick={() => setShowFind(!showFind)} className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${showFind ? 'bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
          <Search size={14} /> <span>Find</span>
        </button>
        <button onClick={() => setWordWrap(!wordWrap)} className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${wordWrap ? 'bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
          <Type size={14} /> <span>Wrap</span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 px-2 text-gray-500 dark:text-gray-400">
          <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="p-1 hover:text-black dark:hover:text-white"><ZoomOut size={14} /></button>
          <span className="w-8 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 10, 200))} className="p-1 hover:text-black dark:hover:text-white"><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* Find Bar */}
      {showFind && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300/50 dark:border-white/10 animate-in slide-in-from-top-2">
          <Search size={14} className="text-gray-500" />
          <input
            autoFocus
            className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Find text..."
            value={findText}
            onChange={e => setFindText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFind()}
          />
          <button onClick={handleFind} className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">Next</button>
          <button onClick={() => setShowFind(false)} className="px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><X size={14} /></button>
        </div>
      )}

      {/* Text Area */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          className={`
                w-full h-full p-4 resize-none bg-transparent border-none focus:ring-0 outline-none
                ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}
                font-mono leading-relaxed
            `}
          style={{ fontSize: `${14 * (zoom / 100)}px` }}
          value={content}
          onChange={e => {
            setContent(e.target.value)
            updateCursorPos()
          }}
          onClick={updateCursorPos}
          onKeyUp={updateCursorPos}
          spellCheck={false}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-t border-gray-300/50 dark:border-white/10 flex items-center px-2 text-[10px] text-gray-500 dark:text-gray-400 gap-4">
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <div className="flex-1" />
        <span>UTF-8</span>
        <span>{status}</span>
      </div>

      <FilePickerDialog
        isOpen={pickerOpen}
        mode={pickerMode}
        onConfirm={handleFilePickerConfirm}
        onCancel={() => setPickerOpen(false)}
        initialPath="desktop"
      />
    </div>
  )
}

export default Notepad
