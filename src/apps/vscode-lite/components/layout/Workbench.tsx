'use client'

import React from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from '../Sidebar'
import { EditorGroupV2 } from './EditorGroupV2'
import { BottomPanel } from './BottomPanel'
import { Preview } from '../Preview'
import { ActivityBar } from '../ActivityBar'
import { StatusBar } from '../StatusBar'
import { VSCODE_COLORS, LANGUAGE_MAP } from '../../constants'
import { useEditorStateV2 } from '../../hooks/useEditorStateV2'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { DialogContainer } from '../Dialog'

interface WorkbenchProps {
    // Pass-through props for now, will refactor later
    activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions'
    setActiveView: (view: any) => void
    showTerminal: boolean
    onToggleTerminal: (show: boolean) => void
    showPreview: boolean
    onTogglePreview: (show: boolean) => void
}

export const Workbench: React.FC<WorkbenchProps> = ({
    activeView,
    setActiveView,
    showTerminal,
    onToggleTerminal,
    showPreview,
    onTogglePreview
}) => {
    const { cursorPosition, activeFileId } = useEditorStateV2()
    const { files } = useFileSystemStore()

    const activeFile = activeFileId ? files[activeFileId] : null
    const ext = activeFile?.name.split('.').pop()?.toLowerCase() || 'txt'
    const language = (LANGUAGE_MAP[ext] || 'plaintext').toUpperCase()

    return (
        <div className="flex flex-col h-full w-full bg-[#1e1e1e] text-white overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar (Fixed Width) */}
                <ActivityBar activeView={activeView} setActiveView={setActiveView} />

                {/* Resizable Layout */}
                <PanelGroup orientation="horizontal">

                    {/* Sidebar */}
                    <Panel defaultSize={100} minSize={15} collapsible>
                        <Sidebar activeView={activeView} />
                    </Panel>

                    <PanelResizeHandle className="w-[1px] bg-[#2b2b2b] hover:bg-blue-500 transition-colors" />

                    {/* Editor Area */}

                    {/* Main Work Area (Editor + Bottom Panel) */}
                    <Panel minSize={10}>
                        <PanelGroup orientation="vertical">
                            {/* Editor + Preview Split */}
                            <Panel>
                                <PanelGroup orientation="horizontal">
                                    <Panel>
                                        <EditorGroupV2 />
                                    </Panel>

                                    {showPreview && (
                                        <>
                                            <PanelResizeHandle className="w-[1px] bg-[#2b2b2b] hover:bg-blue-500 transition-colors" />
                                            <Panel defaultSize={30} minSize={20} collapsible>
                                                <Preview onClose={() => onTogglePreview(false)} />
                                            </Panel>
                                        </>
                                    )}
                                </PanelGroup>
                            </Panel>

                            {/* Bottom Panel (Conditional) */}
                            {/* For now we always show it, or control via state. Let's add state later or make it collapsible */}
                            <PanelResizeHandle className="h-[1px] bg-[#2b2b2b] hover:bg-blue-500 transition-colors" />

                            <Panel defaultSize={30} minSize={5} collapsible>
                                <BottomPanel onClose={() => onToggleTerminal(false)} />
                            </Panel>
                        </PanelGroup>
                    </Panel>

                </PanelGroup>
            </div>

            {/* Status Bar (Fixed Height) */}
            <StatusBar
                line={cursorPosition.ln}
                col={cursorPosition.col}
                language={language}
                errorCount={0}
                warningCount={0}
            />


            {/* Global Dialog Container */}
            <DialogContainer />
        </div>
    )
}
