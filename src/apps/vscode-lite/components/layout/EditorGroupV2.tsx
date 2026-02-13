'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useEditorStateV2 } from '../../hooks/useEditorStateV2'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { EditorComponent } from '../Editor'
import { getFileIcon } from '../../utils/fileIcons'

export const EditorGroupV2: React.FC = () => {
  const { 
    openFiles, 
    activeFileId, 
    setActiveFile, 
    closeFile,
    openFile,
    updateContent,
    saveFile,
    getFileContent,
    isDirty
  } = useEditorStateV2()
  
  const { files, readFileContent, updateFileContent } = useFileSystemStore()



  // 保存文件
  const handleSave = async (fileId: string) => {
    const content = getFileContent(fileId)
    if (content !== undefined) {
      await updateFileContent(fileId, content)
      saveFile(fileId)
    }
  }

  const activeFileNode = activeFileId ? files[activeFileId] : null
  const activeContent = activeFileId ? getFileContent(activeFileId) : undefined

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e]">
      {/* Tab Bar */}
      <div className="flex bg-[#252526] overflow-x-auto custom-scrollbar h-9 shrink-0">
        {openFiles.map(fileId => {
          const file = files[fileId]
          if (!file) return null
          const isActive = fileId === activeFileId
          const isFileDirty = isDirty(fileId)

          return (
            <div
              key={fileId}
              className={`
                group flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] h-full 
                cursor-pointer border-r border-[#252526] select-none text-xs transition-colors relative
                ${isActive ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]'}
              `}
              onClick={() => setActiveFile(fileId)}
              title={file.name}
            >
              {getFileIcon(file.name)}
              <span className="truncate text-xs flex-1">{file.name}</span>
              <button
                className={`opacity-0 group-hover:opacity-100 hover:bg-[#4a4a4a] rounded p-0.5 transition-all ${isFileDirty && isActive ? 'opacity-100' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  closeFile(fileId)
                }}
              >
                {isFileDirty && isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full mx-0.5" />
                ) : (
                  <X size={14} />
                )}
              </button>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#007acc] shadow-[0_0_8px_1px_rgba(0,122,204,0.5)]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Breadcrumbs */}
      {activeFileId && activeFileNode && (
        <div className="h-6 flex items-center px-4 gap-1 bg-[#1e1e1e] text-xs text-[#969696] select-none border-b border-[#2b2b2b] overflow-hidden">
          {(() => {
            const path = []
            let currentId: string | null = activeFileId
            while (currentId && files[currentId]) {
              path.unshift(files[currentId])
              currentId = files[currentId].parentId
            }
            return path.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <span className="opacity-50">›</span>}
                <div className="flex items-center gap-1 hover:text-[#cccccc] cursor-pointer transition-colors">
                  {index === path.length - 1 && getFileIcon(item.name)}
                  <span>{item.name}</span>
                </div>
              </React.Fragment>
            ))
          })()}
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeFileId && activeFileNode && activeContent !== undefined ? (
          <EditorComponent
            fileId={activeFileId}
            fileName={activeFileNode.name}
            content={activeContent}
            onChange={(val) => updateContent(activeFileId, val || '')}
            onSave={() => handleSave(activeFileId)}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 bg-[#1e1e1e]">
            <div className="text-6xl mb-4 opacity-20">VS Code</div>
            <div className="text-sm">Select a file to start editing</div>
            <div className="text-xs mt-2 opacity-50">Ctrl+S to save</div>
          </div>
        )}
      </div>
    </div>
  )
}
