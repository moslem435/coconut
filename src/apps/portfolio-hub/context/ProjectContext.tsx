'use client'

import React, { createContext, useContext } from 'react'

interface ProjectContextType {
    activeProject: number
    setActiveProject: (index: number) => void
    onProjectClick?: (index: number) => void
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function useProject() {
    return useContext(ProjectContext)
}
