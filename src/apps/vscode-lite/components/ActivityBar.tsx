import React from 'react'
import { Files, Search, GitBranch, Play, Square, Settings, User } from 'lucide-react'
import { VSCODE_COLORS } from '../constants'

interface ActivityBarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions'
  setActiveView: (view: 'explorer' | 'search' | 'git' | 'debug' | 'extensions') => void
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, setActiveView }) => {
  const views = [
    { id: 'explorer', icon: Files, title: 'Explorer' },
    { id: 'search', icon: Search, title: 'Search' },
    { id: 'git', icon: GitBranch, title: 'Source Control' },
    { id: 'debug', icon: Play, title: 'Run and Debug' },
    { id: 'extensions', icon: Square, title: 'Extensions' },
  ] as const

  return (
    <div
      className="w-12 flex flex-col items-center py-2 shrink-0 border-r border-[#2b2b2b]"
      style={{ backgroundColor: VSCODE_COLORS.activityBar, color: '#858585' }}
    >
      <div className="flex flex-col gap-6 flex-1 w-full items-center">
        {views.map((view) => {
          const isActive = activeView === view.id
          return (
            <div
              key={view.id}
              className={`
                w-12 h-12 flex items-center justify-center cursor-pointer relative transition-colors duration-200
                ${isActive ? 'text-white' : 'text-[#858585] hover:text-white'}
              `}
              title={view.title}
              onClick={() => setActiveView(view.id)}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              )}
              <view.icon size={24} strokeWidth={1.5} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-6 w-full items-center pb-2">
        <div
          className="w-12 h-12 flex items-center justify-center cursor-pointer text-[#858585] hover:text-white"
          title="Accounts"
        >
          <User size={24} strokeWidth={1.5} />
        </div>
        <div
          className="w-12 h-12 flex items-center justify-center cursor-pointer text-[#858585] hover:text-white"
          title="Manage"
        >
          <Settings size={24} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
