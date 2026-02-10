import React, { useState, useEffect, useRef } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'

interface TerminalHistory {
  type: 'input' | 'output'
  content: string
  cwd?: string
}

// Themes
const THEMES = {
  default: { bg: '#1e1e1e', fg: '#cccccc', prompt: '#22c55e' },
  solarized: { bg: '#002b36', fg: '#839496', prompt: '#b58900' },
  monokai: { bg: '#272822', fg: '#f8f8f2', prompt: '#a6e22e' },
  hacker: { bg: '#000000', fg: '#00ff00', prompt: '#00ff00' }
}

interface TerminalCoreProps {
    className?: string
    style?: React.CSSProperties
    initialCwd?: string
    initialWelcome?: boolean
}

export const TerminalCore: React.FC<TerminalCoreProps> = ({ 
    className, 
    style, 
    initialCwd = 'root', 
    initialWelcome = true 
}) => {
  const { t } = useLanguage()
  const [history, setHistory] = useState<TerminalHistory[]>(
    initialWelcome 
    ? [
        { type: 'output', content: t('terminal.welcome') },
        { type: 'output', content: t('terminal.help') },
      ]
    : []
  )
  const [input, setInput] = useState('')
  const [currentDirId, setCurrentDirId] = useState(initialCwd)
  const [cwdPath, setCwdPath] = useState('/')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [theme, setTheme] = useState<keyof typeof THEMES>('default')
  
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const { files, rootId, getChildren, getItem, getPath, createItem } = useFileSystemStore()

  // Initialize cwdPath
  useEffect(() => {
    if (initialCwd === rootId) {
        setCwdPath('/')
    } else {
        // Resolve path string from ID
        const pathNodes = getPath(initialCwd)
        const pathStr = pathNodes.slice(1).map(n => n.name).join('/')
        setCwdPath('/' + pathStr)
    }
  }, [initialCwd, rootId, getPath])

  // Helper: Get translated display name
  const getDisplayName = (node: FileNode) => {
    if (node.appId) return t(`app.${node.appId}`)
    if (node.id === 'recycle-bin' || node.id === 'trash') return t('app.recycle-bin')
    if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(node.id)) {
      return t(`explorer.${node.id}`)
    }
    const idToKeyMap: Record<string, string> = {
      'welcome-txt': 'file.welcome',
      'about-md': 'file.about',
      'code-1': 'file.code.hello',
      'code-2': 'file.code.component',
      'music': 'folder.music',
      'code': 'folder.code'
    }
    if (idToKeyMap[node.id]) return t(idToKeyMap[node.id])
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

    setCommandHistory(prev => [trimmed, ...prev])
    setHistoryIndex(-1)

    // Handle Redirect >
    if (trimmed.includes('>')) {
        const [left, right] = trimmed.split('>').map(s => s.trim())
        if (left && right) {
            if (left.startsWith('echo ')) {
                const content = left.substring(5).replace(/^['"]|['"]$/g, '')
                createItem(currentDirId, right, 'file', content)
                setHistory(prev => [
                    ...prev, 
                    { type: 'input', content: trimmed, cwd: cwdPath },
                    { type: 'output', content: '' }
                ])
                return
            }
        }
    }

    const [cmd, ...args] = trimmed.split(' ')
    const argStr = args.join(' ')
    
    const newHistory: TerminalHistory[] = [...history, { type: 'input', content: cmdStr, cwd: cwdPath }]

    switch (cmd) {
      case 'help':
        newHistory.push({ type: 'output', content: t('terminal.help.desc') + '\n\nAvailable commands: help, clear, echo, whoami, date, pwd, ls, cd, cat, pkg, git, theme' })
        break
      case 'clear':
        setHistory([])
        return 
      case 'echo':
        newHistory.push({ type: 'output', content: argStr.replace(/^['"]|['"]$/g, '') })
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
      case 'pkg':
        if (args[0] === 'install') {
            newHistory.push({ type: 'output', content: `Installing ${args[1] || 'packages'}...\n[####################] 100%\nDone.` })
        } else {
            newHistory.push({ type: 'output', content: 'usage: pkg install <package_name>' })
        }
        break
      case 'git':
        if (args[0] === 'status') {
             newHistory.push({ type: 'output', content: 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nNothing to commit, working tree clean' })
        } else if (args[0] === 'clone') {
             newHistory.push({ type: 'output', content: `Cloning into '${args[1] || 'repo'}'...\nremote: Enumerating objects: 100, done.\nremote: Total 100 (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (100/100), done.` })
        } else {
            newHistory.push({ type: 'output', content: 'git: ' + (args[0] ? `'${args[0]}' is not a git command.` : 'usage: git <command>') })
        }
        break
      case 'theme':
        if (THEMES[args[0] as keyof typeof THEMES]) {
            setTheme(args[0] as keyof typeof THEMES)
            newHistory.push({ type: 'output', content: `Theme changed to ${args[0]}` })
        } else {
             newHistory.push({ type: 'output', content: `Available themes: ${Object.keys(THEMES).join(', ')}` })
        }
        break
      default:
        newHistory.push({ type: 'output', content: `${cmd}: ${t('terminal.notfound')}` })
    }
    setHistory(newHistory)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
            setHistoryIndex(newIndex)
            setInput(commandHistory[newIndex])
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            setInput(commandHistory[newIndex])
        } else if (historyIndex === 0) {
            setHistoryIndex(-1)
            setInput('')
        }
    } else if (e.key === 'Tab') {
        e.preventDefault()
        const parts = input.split(' ')
        const lastPart = parts[parts.length - 1]
        if (lastPart) {
            const children = getChildren(currentDirId)
            const match = children.find(c => c.name.startsWith(lastPart))
            if (match) {
                parts[parts.length - 1] = match.name
                setInput(parts.join(' '))
            }
        }
    }
  }

  const currentTheme = THEMES[theme]

  return (
    <div 
      className={`font-mono text-sm p-2 overflow-auto flex flex-col transition-colors duration-300 ${className}`}
      style={{ 
          backgroundColor: `${currentTheme.bg}D9`, 
          color: currentTheme.fg,
          ...style
      }}
      onClick={handleContainerClick}
    >
      <div className="flex-1">
        {history.map((entry, i) => (
          <div key={i} className="mb-1 whitespace-pre-wrap break-all">
            {entry.type === 'input' ? (
              <div className="flex">
                <span className="mr-2" style={{ color: currentTheme.prompt }}>{t('terminal.guest')}@system:{entry.cwd}$</span>
                <span>{entry.content}</span>
              </div>
            ) : (
              <div>{entry.content}</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex mt-1">
        <span className="mr-2 whitespace-nowrap" style={{ color: currentTheme.prompt }}>guest@system:{cwdPath}$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none p-0"
          style={{ color: currentTheme.fg }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
