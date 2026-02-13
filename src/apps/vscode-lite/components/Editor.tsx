import React, { useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { VSCODE_COLORS, LANGUAGE_MAP } from '../constants'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface EditorComponentProps {
  fileId: string
  fileName: string
  content: string
  onChange: (value: string | undefined) => void
  onSave: () => void
}

export const EditorComponent: React.FC<EditorComponentProps> = ({ 
  fileId, 
  fileName, 
  content, 
  onChange,
  onSave
}) => {
  const editorRef = useRef<any>(null)
  const { t } = useLanguage()

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    
    // Add Save Command (Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave()
    })
  }

  // Determine language
  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt'
  const language = LANGUAGE_MAP[ext] || 'plaintext'

  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        path={fileId} // Using fileId as path to keep models distinct
        defaultLanguage={language}
        language={language}
        value={content}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 10, bottom: 10 },
          fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
        loading={
          <div className="h-full w-full flex items-center justify-center text-gray-500">
            {t('browser.loading')}
          </div>
        }
      />
    </div>
  )
}
