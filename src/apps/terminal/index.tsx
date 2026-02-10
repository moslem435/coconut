import React, { useState, useEffect, useRef } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'

interface TerminalHistory {
  type: 'input' | 'output'
  content: string
  cwd?: string
}

const Terminal: React.FC = () => {
  const { t } = useLanguage()
  const [history, setHistory] = useState<TerminalHistory[]>([
    { type: 'output', content: t('terminal.welcome') },
    { type: 'output', content: t('terminal.help') },
  ])
  const [input, setInput] = useState('')
  const [currentDirId, setCurrentDirId] = useState('root')
  const [cwdPath, setCwdPath] = useState('/')
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const { files, rootId, getChildren, getItem, getPath } = useFileSystemStore()

  // Helper: Get translated display name
  const getDisplayName = (node: FileNode) => {
    // 1. App Shortcut
    if (node.appId) return t(`app.${node.appId}`)
    
    // 2. System Folders / Special IDs
    if (node.id === 'recycle-bin' || node.id === 'trash') return t('app.recycle-bin')
    if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(node.id)) {
      return t(`explorer.${node.id}`)
    }

    // 3. Specific Files/Folders (mapped to translation keys)
    const idToKeyMap: Record<string, string> = {
      'welcome-txt': 'file.welcome',
      'about-md': 'file.about',
      'code-1': 'file.code.hello',
      'code-2': 'file.code.component',
      'music': 'folder.music',
      'code': 'folder.code'
    }
    
    if (idToKeyMap[node.id]) {
      return t(idToKeyMap[node.id])
    }

    return node.name
  }

  // Scroll to bottom on history change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Focus input on click
  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  // Helper: Resolve path string to FileNode ID
  const resolvePath = (path: string): string | null => {
    const parts = path.split('/').filter(p => p.length > 0)
    let currentId = path.startsWith('/') ? rootId : currentDirId
    
    for (const part of parts) {
      if (part === '.') continue
      if (part === '..') {
        const current = getItem(currentId)
        if (current && current.parentId) {
          currentId = current.parentId
        }
        continue
      }
      
      const children = getChildren(currentId)
      const found = children.find(c => c.name === part)
      if (found) {
        currentId = found.id
      } else {
        return null
      }
    }
    return currentId
  }

  // Helper: Get display path from ID
  const getDisplayPath = (id: string): string => {
    if (id === rootId) return '/'
    const pathNodes = getPath(id)
    // Remove root from path display if desired, or keep it. 
    // Usually root is not shown in path if it's named "Root" in UI but represented as /
    // Let's construct it: /Desktop/Documents
    const pathStr = pathNodes
      .slice(1) // Skip Root node
      .map(n => getDisplayName(n))
      .join('/')
    return '/' + pathStr
  }

  const handleCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim()
    if (!trimmed) {
      setHistory(prev => [...prev, { type: 'input', content: '', cwd: cwdPath }])
      return
    }

    const [cmd, ...args] = trimmed.split(' ')
    const argStr = args.join(' ')
    
    // Add input to history
    const newHistory: TerminalHistory[] = [...history, { type: 'input', content: cmdStr, cwd: cwdPath }]

    switch (cmd) {
      case 'help':
        newHistory.push({ type: 'output', content: t('terminal.help.desc') })
        break
      
      case 'clear':
        setHistory([])
        return // Return early to avoid setting history with cleared state + new entry

      case 'echo':
        newHistory.push({ type: 'output', content: argStr })
        break

      case 'whoami':
        newHistory.push({ type: 'output', content: t('terminal.guest') })
        break

      case 'date':
        newHistory.push({ type: 'output', content: new Date().toString() })
        break

      case 'pwd':
        newHistory.push({ type: 'output', content: cwdPath })
        break

      case 'ls': {
        const targetId = args.length > 0 ? resolvePath(args[0]) : currentDirId
        if (!targetId) {
          newHistory.push({ type: 'output', content: `${t('terminal.ls.error')} '${args[0]}': ${t('terminal.cd.error')}` })
        } else {
          const item = getItem(targetId)
          if (item?.type === 'file') {
             newHistory.push({ type: 'output', content: getDisplayName(item) })
          } else {
            const children = getChildren(targetId)
            const list = children.map(c => {
              const name = getDisplayName(c)
              return c.type === 'folder' ? name + '/' : name
            }).join('  ')
            newHistory.push({ type: 'output', content: list })
          }
        }
        break
      }

      case 'cd': {
        if (!argStr) {
          // cd home (root in this case)
          setCurrentDirId(rootId)
          setCwdPath('/')
          break
        }
        const targetId = resolvePath(argStr)
        if (!targetId) {
           newHistory.push({ type: 'output', content: `${t('terminal.cd.error')}: ${argStr}` })
        } else {
          const item = getItem(targetId)
          if (item?.type !== 'folder') {
             newHistory.push({ type: 'output', content: `${t('terminal.cd.notdir')}: ${argStr}` })
          } else {
            setCurrentDirId(targetId)
            setCwdPath(getDisplayPath(targetId))
          }
        }
        break
      }

      case 'cat': {
        if (!argStr) {
           newHistory.push({ type: 'output', content: t('terminal.cat.missing') })
           break
        }
        const targetId = resolvePath(argStr)
        if (!targetId) {
           newHistory.push({ type: 'output', content: `${t('terminal.cat.error')}: ${argStr}` })
        } else {
           const item = getItem(targetId)
           if (item?.type === 'folder') {
             newHistory.push({ type: 'output', content: `${t('terminal.cat.isdir')}: ${argStr}` })
           } else {
             newHistory.push({ type: 'output', content: item?.content || '' })
           }
        }
        break
      }

      default:
        newHistory.push({ type: 'output', content: `${cmd}: ${t('terminal.notfound')}` })
    }

    setHistory(newHistory)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
      setInput('')
    }
  }

  return (
    <div 
      className="h-full w-full bg-[#1e1e1e]/85 text-[#cccccc] font-mono text-sm p-2 pt-12 overflow-auto flex flex-col"
      onClick={handleContainerClick}
    >
      <div className="flex-1">
        {history.map((entry, i) => (
          <div key={i} className="mb-1 whitespace-pre-wrap break-all">
            {entry.type === 'input' ? (
              <div className="flex">
                <span className="text-green-500 mr-2">{t('terminal.guest')}@system:{entry.cwd}$</span>
                <span>{entry.content}</span>
              </div>
            ) : (
              <div>{entry.content}</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex mt-1">
        <span className="text-green-500 mr-2 whitespace-nowrap">guest@system:{cwdPath}$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[#cccccc] p-0"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  )
}

export default Terminal
