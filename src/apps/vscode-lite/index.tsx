'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { Folder, FileCode, ChevronRight, ChevronDown, Search, Menu, X, Save, Play } from 'lucide-react'

// --- Syntax Highlighting Helper (Simple Regex Based) ---
const highlightCode = (code: string, lang: string) => {
  if (!code) return ''
  
  // Basic tokenization for JS/TS
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Comments
  html = html.replace(/(\/\/.*)/g, '<span class="text-green-600">$1</span>')
  
  // Keywords
  const keywords = /\b(import|export|const|let|var|function|return|if|else|for|while|switch|case|break|default|try|catch|async|await|interface|type|from)\b/g
  html = html.replace(keywords, '<span class="text-pink-500 font-bold">$1</span>')

  // Functions
  html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, '<span class="text-blue-400">$1</span>')

  // Strings
  html = html.replace(/(['"`])(.*?)\1/g, '<span class="text-orange-400">$1$2$1</span>')

  // Numbers
  html = html.replace(/\b(\d+)\b/g, '<span class="text-purple-400">$1</span>')
  
  // React Components (Capitalized words)
  html = html.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="text-yellow-400">$1</span>')

  return html
}

export default function VSCodeLite() {
  const { files, rootId, getChildren, getItem, updateFileContent } = useFileSystemStore()
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({}) // fileId -> content

  // Sidebar state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [rootId]: true })

  // Load file content when active tab changes
  useEffect(() => {
    if (activeFileId) {
      if (unsavedChanges[activeFileId] !== undefined) {
        setContent(unsavedChanges[activeFileId])
      } else {
        const file = getItem(activeFileId)
        setContent(file?.content || '')
      }
    } else {
      setContent('')
    }
  }, [activeFileId])

  const handleFileClick = (id: string) => {
    if (!openFiles.includes(id)) {
      setOpenFiles([...openFiles, id])
    }
    setActiveFileId(id)
  }

  const handleCloseFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newOpen = openFiles.filter(fid => fid !== id)
    setOpenFiles(newOpen)
    if (activeFileId === id) {
      setActiveFileId(newOpen[newOpen.length - 1] || null)
    }
    // Note: Discarding unsaved changes for simplicity in "Lite" version
    if (unsavedChanges[id]) {
        const newUnsaved = { ...unsavedChanges }
        delete newUnsaved[id]
        setUnsavedChanges(newUnsaved)
    }
  }

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (activeFileId) {
        setUnsavedChanges(prev => ({ ...prev, [activeFileId]: newContent }))
    }
  }

  const handleSave = () => {
    if (activeFileId) {
        updateFileContent(activeFileId, content)
        const newUnsaved = { ...unsavedChanges }
        delete newUnsaved[activeFileId]
        setUnsavedChanges(newUnsaved)
    }
  }

  // File Tree Recursive Component
  const FileTreeItem = ({ id, depth = 0 }: { id: string, depth?: number }) => {
    const item = files[id]
    if (!item) return null

    const isFolder = item.type === 'folder'
    const isExpanded = expandedFolders[id]
    const paddingLeft = `${depth * 12 + 10}px`

    if (isFolder) {
      const children = getChildren(id)
      return (
        <div>
          <div 
            className="flex items-center gap-1 py-0.5 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 text-sm select-none"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(id)}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="font-bold text-xs">{item.name.toUpperCase()}</span>
          </div>
          {isExpanded && children.map(child => (
            <FileTreeItem key={child.id} id={child.id} depth={depth + 1} />
          ))}
        </div>
      )
    } else {
      return (
        <div 
          className={`flex items-center gap-2 py-1 hover:bg-[#2a2d2e] cursor-pointer text-sm ${activeFileId === id ? 'bg-[#37373d] text-white' : 'text-gray-400'}`}
          style={{ paddingLeft }}
          onClick={() => handleFileClick(id)}
        >
          <FileCode size={14} className="text-blue-400" />
          <span>{item.name}</span>
        </div>
      )
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#3c3c3c] text-[#cccccc] font-sans pt-10">
      {/* Top Bar (Menu & Actions) */}
      <div className="h-8 bg-[#3c3c3c] flex items-center px-2 text-xs select-none justify-between">
         <div className="flex gap-4">
             <Menu size={14} />
             <span>File</span>
             <span>Edit</span>
             <span>Selection</span>
             <span>View</span>
             <span>Go</span>
             <span>Run</span>
             <span>Terminal</span>
             <span>Help</span>
         </div>
         <div className="flex gap-2">
            <button onClick={handleSave} className="hover:text-white" title="Save (Ctrl+S)">
                <Save size={14} />
            </button>
            <button className="hover:text-green-400" title="Run Code">
                <Play size={14} />
            </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 bg-[#252526] flex flex-col border-r border-[#1e1e1e]">
            <div className="text-xs font-bold p-2 uppercase tracking-wider text-gray-500">Explorer</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <FileTreeItem id={rootId} />
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
            {/* Tabs */}
            <div className="flex bg-[#252526] overflow-x-auto no-scrollbar">
                {openFiles.map(fid => {
                    const file = files[fid]
                    const isActive = activeFileId === fid
                    const isDirty = unsavedChanges[fid] !== undefined
                    return (
                        <div 
                            key={fid}
                            onClick={() => setActiveFileId(fid)}
                            className={`
                                group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer text-sm select-none
                                ${isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2a2d2e]'}
                            `}
                        >
                            <FileCode size={14} className={isActive ? 'text-yellow-400' : 'text-gray-500'} />
                            <span className="truncate flex-1">{file?.name || 'Deleted'}</span>
                            <div 
                                onClick={(e) => handleCloseFile(e, fid)}
                                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-gray-600 ${isDirty ? 'opacity-100' : ''}`}
                            >
                                {isDirty ? <div className="w-2 h-2 rounded-full bg-white mb-0.5 mx-1" /> : <X size={14} />}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Code Editor */}
            {activeFileId ? (
                <div className="flex-1 relative overflow-hidden text-sm font-mono leading-6">
                    {/* Line Numbers */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#1e1e1e] text-gray-600 text-right pr-3 select-none pt-4">
                        {content.split('\n').map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>

                    {/* Editor Container */}
                    <div className="absolute left-12 right-0 top-0 bottom-0 overflow-auto custom-scrollbar">
                        <div className="relative min-h-full w-full">
                            {/* Syntax Highlighting Layer (Underlay) */}
                            <pre 
                                className="absolute top-0 left-0 m-0 p-4 pointer-events-none w-full h-full whitespace-pre font-inherit text-transparent"
                                aria-hidden="true"
                                dangerouslySetInnerHTML={{ __html: highlightCode(content, 'javascript') }}
                                style={{ color: 'transparent' }} // Text is transparent, only spans have color? No, we need to make base text transparent but spans visible. 
                                // Actually, standard trick is:
                                // Pre: visible colors, pointer-events-none
                                // Textarea: transparent text, visible caret, z-index top
                            />
                            
                            {/* Visual Layer (Pre) */}
                             <pre 
                                className="absolute top-0 left-0 m-0 p-4 pointer-events-none w-full min-h-full whitespace-pre font-inherit z-0"
                                dangerouslySetInnerHTML={{ __html: highlightCode(content, 'javascript') }}
                            />

                            {/* Input Layer (Textarea) */}
                            <textarea
                                className="absolute top-0 left-0 m-0 p-4 w-full h-full min-h-full resize-none bg-transparent text-transparent caret-white outline-none z-10 font-inherit overflow-hidden whitespace-pre"
                                value={content}
                                onChange={(e) => handleContentChange(e.target.value)}
                                spellCheck={false}
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 select-none">
                    <div className="text-6xl mb-4 font-thin">VS Code Lite</div>
                    <div className="text-sm">Select a file to start coding</div>
                    <div className="mt-8 text-xs flex flex-col gap-2">
                        <div className="flex gap-2"><span>Show All Commands</span><span className="bg-[#333] px-1 rounded">Ctrl+Shift+P</span></div>
                        <div className="flex gap-2"><span>Go to File</span><span className="bg-[#333] px-1 rounded">Ctrl+P</span></div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-xs text-white select-none">
          <div className="flex gap-4">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">×</div> 0</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[8px]">!</div> 0</div>
          </div>
          <div className="flex gap-4">
             {activeFileId && <span>Ln {content.substr(0, 0).split('\n').length}, Col 1</span>} 
             <span>UTF-8</span>
             <span>TypeScript React</span>
             <span className="hover:bg-white/20 px-1 cursor-pointer">Prettier</span>
          </div>
      </div>
    </div>
  )
}
