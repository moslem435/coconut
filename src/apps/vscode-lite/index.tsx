/**
 * VSCode Lite 应用
 * 
 * 功能：
 * - 代码编辑器（Monaco Editor）
 * - 文件浏览器（侧边栏）
 * - 集成终端（WebContainer）
 * - 实时预览（Web 应用）
 * - 命令面板（Ctrl+Shift+P）
 * - 文件搜索（Ctrl+P）
 * - 多文件标签页
 * - 代码格式化（Prettier）
 * - 未保存提示
 * 
 * 架构：
 * - TitleBar：顶部菜单栏
 * - Workbench：主工作区（侧边栏 + 编辑器 + 终端 + 预览）
 * - CommandPalette：命令面板
 * - FilePickerDialog：文件选择对话框
 * 
 * 技术栈：
 * - Monaco Editor：代码编辑器
 * - WebContainer：浏览器内的 Node.js 运行时
 * - XTerm.js：终端模拟器
 * 
 * @author System
 * @created 2024
 */

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

/**
 * VSCode Lite 主组件
 */
export default function VSCode() {
  const { getItem } = useFileSystemStore()
  const { openFile: openFileInEditor, getFileContent } = useEditorStateV2()
  const { readFileContent } = useFileSystemStore()
  const { boot: bootWebContainer } = useWebContainerStore()
  
  // 未保存提示
  useUnsavedChanges()
  
  /**
   * 预启动 WebContainer（用于终端）
   * 提前加载可以减少用户打开终端时的等待时间
   */
  useEffect(() => {
    bootWebContainer()
  }, [bootWebContainer])

  // 视图状态
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  /**
   * 打开文件选择对话框
   */
  const handleOpenFile = () => setPickerOpen(true)

  /**
   * 文件选择确认回调
   * 
   * 从文件系统读取文件内容并在编辑器中打开
   */
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

  /**
   * 命令列表
   * 
   * 定义所有可用的命令及其快捷键
   */
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

  /**
   * 全局快捷键
   * 
   * - Ctrl+P / Cmd+P：打开文件
   * - Ctrl+Shift+P / F1：命令面板
   */
  useShortcuts({
    'Ctrl+P': (e) => { e.preventDefault(); handleOpenFile() },
    'Meta+P': (e) => { e.preventDefault(); handleOpenFile() },
    'Ctrl+Shift+P': (e) => { e.preventDefault(); setShowCommandPalette(true) },
    'F1': (e) => { e.preventDefault(); setShowCommandPalette(true) },
  })

  return (
    <div className="h-full w-full flex flex-col font-sans text-[#cccccc] overflow-hidden">

      {/* 顶部菜单栏 */}
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

      {/* 主工作区布局 */}
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

      {/* 文件选择对话框 */}
      <FilePickerDialog
        isOpen={pickerOpen}
        mode="open"
        onConfirm={handleFilePickerConfirm}
        onCancel={() => setPickerOpen(false)}
        initialPath="root"
      />

      {/* 命令面板 */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
    </div>
  )
}
