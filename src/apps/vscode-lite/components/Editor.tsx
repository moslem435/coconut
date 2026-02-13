import React, { useRef } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import { VSCODE_COLORS, LANGUAGE_MAP } from '../constants'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useMonacoIntellisense } from '../hooks/useMonacoIntellisense'
import { useEditorState } from '../hooks/useEditorState'
import { format } from 'prettier/standalone'
import * as parserTypescript from 'prettier/plugins/typescript'
import * as parserBabel from 'prettier/plugins/babel'
import * as parserEstree from 'prettier/plugins/estree'

// Configure Monaco to use local files instead of CDN
loader.config({ 
  paths: { 
    vs: '/monaco-editor/vs' 
  } 
})

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
  const [monaco, setMonaco] = React.useState<any>(null)
  const { t } = useLanguage()
  const { setCursorPosition } = useEditorState()

  // Enable Intellisense
  useMonacoIntellisense(monaco)

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    setMonaco(monacoInstance)

    // Add Save Command (Ctrl+S)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, async () => {
      // Format Code
      try {
        const currentCode = editor.getValue()
        // Simple heuristic for parser based on file extension
        const parser = fileName.endsWith('.ts') ? 'typescript' :
          fileName.endsWith('.tsx') ? 'typescript' :
            fileName.endsWith('.js') ? 'babel' :
              fileName.endsWith('.jsx') ? 'babel' : undefined

        if (parser) {
          const formatted = await format(currentCode, {
            parser,
            plugins: [parserTypescript, parserBabel, parserEstree],
            singleQuote: true,
            semi: false,
            printWidth: 100
          })

          // Check if content changed to avoid cursor jump issues if possible
          // Monaco editor.setValue moves cursor to top? 
          // Ideally we use applyEdits, but setValue is simpler for now.
          // onChange will be triggered by setValue?
          // Yes.

          // We call onChange with formatted code to update state
          onChange(formatted)

          // But we also need to update the editor content immediately if it's not controlled?
          // The Editor component IS controlled via `value={content}`. 
          // So calling onChange should propagate back to `content` prop and update editor.
        }
      } catch (e) {
        console.warn('Prettier format failed:', e)
      }

      // Then Save
      onSave()
    })

    // Track Cursor Position
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition(e.position.lineNumber, e.position.column)
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
