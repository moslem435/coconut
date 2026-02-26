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
        col: (lines[lines.length - 1] || '').length + 1
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
      className="h-full w-full flex flex-col bg-[var(--os-bg-window)]/95 text-[var(--os-text-primary)] backdrop-blur-sm pt-10"
    >
      {/* Menu Bar */}
      <div className="flex items-center gap-1 p-1 border-b border-[var(--os-border)] text-xs bg-[var(--os-bg-panel)]/50">
        <button onClick={handleNew} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded flex items-center gap-1.5 transition-colors">
          <FilePlus size={14} /> <span>{t('notepad.new')}</span>
        </button>
        <button onClick={handleOpen} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded flex items-center gap-1.5 transition-colors">
          <FolderOpen size={14} /> <span>Open</span>
        </button>
        <button onClick={handleSave} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded flex items-center gap-1.5 transition-colors">
          <Save size={14} /> <span>{t('notepad.save')}</span>
        </button>

        <div className="w-px h-4 bg-[var(--os-border)] mx-1" />

        <button onClick={() => setShowFind(!showFind)} className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${showFind ? 'bg-[var(--os-bg-selection)] text-[var(--os-accent)]' : 'hover:bg-[var(--os-hover-bg)]'}`}>
          <Search size={14} /> <span>Find</span>
        </button>
        <button onClick={() => setWordWrap(!wordWrap)} className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${wordWrap ? 'bg-[var(--os-bg-selection)] text-[var(--os-accent)]' : 'hover:bg-[var(--os-hover-bg)]'}`}>
          <Type size={14} /> <span>Wrap</span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 px-2 text-[var(--os-text-muted)]">
          <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="p-1 hover:text-[var(--os-text-primary)]"><ZoomOut size={14} /></button>
          <span className="w-8 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 10, 200))} className="p-1 hover:text-[var(--os-text-primary)]"><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* Find Bar */}
      {showFind && (
        <div className="flex items-center gap-2 p-2 bg-[var(--os-bg-panel)] border-b border-[var(--os-border)] animate-in slide-in-from-top-2">
          <Search size={14} className="text-[var(--os-text-muted)]" />
          <input
            autoFocus
            className="flex-1 bg-[var(--os-bg-input)] border border-[var(--os-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--os-accent)] text-[var(--os-text-primary)]"
            placeholder="Find text..."
            value={findText}
            onChange={e => setFindText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFind()}
          />
          <button onClick={handleFind} className="px-3 py-1 bg-[var(--os-accent)] text-white rounded text-xs hover:bg-[var(--os-accent-dim)]">Next</button>
          <button onClick={() => setShowFind(false)} className="px-2 py-1 hover:bg-[var(--os-hover-bg)] rounded"><X size={14} /></button>
        </div>
      )}

      {/* Text Area */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          className={`
                w-full h-full p-4 resize-none bg-transparent border-none focus:ring-0 outline-none
                ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}
                font-mono leading-relaxed text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)]
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
      <div className="h-6 bg-[var(--os-bg-panel)] border-t border-[var(--os-border)] flex items-center px-2 text-[10px] text-[var(--os-text-muted)] gap-4">
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
