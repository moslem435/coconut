/**
 * XTerm 终端组件
 * 
 * 功能：
 * - 集成 xterm.js 提供完整的终端模拟器功能
 * - 连接 WebContainer 实现浏览器内的 Shell 环境
 * - 支持主题切换、透明度、自适应调整大小
 * - 提供右键菜单（复制、粘贴、清屏、重置）
 * 
 * 技术栈：
 * - xterm.js：终端渲染引擎
 * - WebContainer：浏览器内的 Node.js 运行时
 * - FitAddon：自适应终端尺寸
 * - WebLinksAddon：URL 链接识别与点击
 * 
 * @author System
 * @created 2024
 */

import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { logger } from '@/os/utils/logger'
import '@xterm/xterm/css/xterm.css'

/**
 * XTerm 组件属性
 */
interface XTermProps {
  /** 自定义 CSS 类名 */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

/**
 * XTerm 终端组件
 * 
 * 生命周期：
 * 1. 启动 WebContainer
 * 2. 初始化 xterm.js 实例
 * 3. 连接 Shell 进程（jsh）
 * 4. 监听窗口大小变化并自适应
 * 
 * @param props - 组件属性
 */
const XTerm: React.FC<XTermProps> = ({ className, style }) => {
  // DOM 引用
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processRef = useRef<any>(null) // Shell 进程引用

  // 系统设置
  const { theme, useTransparency } = useSystemSettings()

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)

  // WebContainer 状态
  const { instance, boot, isBooting, error } = useWebContainerStore()
  const [isReady, setIsReady] = useState(false)

  /**
   * 调试日志：记录 WebContainer 状态变化
   */
  useEffect(() => {
    logger.debug('[XTerm] WebContainer state:', {
      hasInstance: !!instance,
      isBooting,
      error,
      isReady
    })
  }, [instance, isBooting, error, isReady])

  /**
   * 主题更新：动态切换终端配色方案
   * 支持深色/浅色主题，以及透明背景
   */
  useEffect(() => {
    if (!xtermRef.current) return

    const isDark = theme === 'dark'
    xtermRef.current.options.theme = {
      background: useTransparency ? 'transparent' : (isDark ? '#1e1e1e' : '#ffffff'),
      foreground: isDark ? '#cccccc' : '#333333',
      cursor: isDark ? '#ffffff' : '#000000',
      selectionBackground: isDark ? '#264f78' : '#add6ff',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: isDark ? '#2472c8' : '#0451a5',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5',
    }
  }, [theme, useTransparency])

  /**
   * 步骤 1：启动 WebContainer
   * WebContainer 是浏览器内的 Node.js 运行时，需要先启动才能运行 Shell
   */
  useEffect(() => {
    logger.debug('[XTerm] Calling WebContainer boot...')
    boot().then(() => {
      logger.debug('[XTerm] WebContainer boot completed')
    }).catch((err) => {
      logger.error('[XTerm] WebContainer boot failed:', err)
    })
  }, [boot])

  /**
   * 步骤 2：初始化 xterm.js 实例
   * 配置终端外观、字体、颜色主题等
   */
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const isDark = theme === 'dark'
    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      allowTransparency: true,
      theme: {
        background: useTransparency ? 'transparent' : (isDark ? '#1e1e1e' : '#ffffff'),
        foreground: isDark ? '#cccccc' : '#333333',
        cursor: isDark ? '#ffffff' : '#000000',
        selectionBackground: isDark ? '#264f78' : '#add6ff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: isDark ? '#2472c8' : '#0451a5',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      cursorStyle: 'bar',
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Hide the initial prompt until we are ready
    term.writeln('\x1b[34m● \x1b[37mInitializing System Environment...\x1b[0m')

    return () => {
      term.dispose()
      xtermRef.current = null
    }
  }, [])

  /**
   * 步骤 3：连接 WebContainer 到 XTerm
   * 启动 jsh（JavaScript Shell）并建立输入输出管道
   */
  useEffect(() => {
    if (!instance || !xtermRef.current || isReady) return

    /**
     * 启动 Shell 进程
     * 
     * 流程：
     * 1. 清空终端并显示启动信息
     * 2. 使用 WebContainer 的 spawn API 启动 jsh
     * 3. 建立双向数据流：Shell 输出 → XTerm，XTerm 输入 → Shell
     * 4. 清理提示符格式（替换随机路径为友好名称）
     */
    const startShell = async () => {
      const term = xtermRef.current!

      try {
        term.clear()
        term.writeln('\x1b[32m✔ System Online\x1b[0m')
        term.writeln('')

        logger.debug('[XTerm] Spawning jsh shell...')

        // Spawn jsh (JavaScript Shell)
        const shellProcess = await instance.spawn('jsh', {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
          env: {
            TERM: 'xterm-256color',
          },
          cwd: '/home/guest/project'
        })

        processRef.current = shellProcess

        // Pipe process output to XTerm with prompt cleanup
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              let cleanData = data
              cleanData = cleanData.replace(/~\/[a-z0-9-]{10,}/g, 'guest@portfoliio:~/project')
              cleanData = cleanData.replace(/\r\n(\x1b\[[0-9;]*m)*❯/g, '$1 $')
              term.write(cleanData)
            },
          })
        )

        // Pipe XTerm input to process
        const inputWriter = shellProcess.input.getWriter()
        const input = term.onData((data) => {
          inputWriter.write(data)
        })

        setIsReady(true)
        logger.debug('[XTerm] Terminal ready')

        // Return cleanup function to be used by the outer scope if needed, 
        // but since we are in a useEffect we handle cleanup via a pattern that TS accepts.
      } catch (error) {
        logger.error('[XTerm] Failed to start shell:', error)
        term.clear()
        term.writeln('\x1b[31m✖ Failed to start terminal\x1b[0m')
        term.writeln('')
        term.writeln(`Error: ${error instanceof Error ? error.message : String(error)}`)
        term.writeln('')
        term.writeln('Please check browser console for details')
      }
    }

    startShell()
  }, [instance, isReady])


  /**
   * 步骤 4：处理终端尺寸自适应
   * 使用 ResizeObserver 监听容器大小变化，自动调整终端行列数
   */
  useEffect(() => {
    if (!terminalRef.current || !fitAddonRef.current) return

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!fitAddonRef.current || !xtermRef.current) return

        try {
          // 调整终端尺寸以适应容器
          fitAddonRef.current.fit()

          // 同步调整 Shell 进程的 PTY 尺寸
          if (processRef.current) {
            processRef.current.resize({
              cols: xtermRef.current.cols,
              rows: xtermRef.current.rows,
            })
          }
        } catch (e) {
          // 忽略销毁时的调整错误
        }
      })
    })

    observer.observe(terminalRef.current)

    return () => observer.disconnect()
  }, [])

  /**
   * 步骤 5：右键菜单处理
   * 显示上下文菜单（复制、粘贴、清屏、重置）
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  /**
   * 点击其他区域时关闭右键菜单
   */
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  /**
   * 处理右键菜单操作
   * 
   * @param action - 操作类型
   *   - copy: 复制选中文本到剪贴板
   *   - paste: 从剪贴板粘贴文本
   *   - clear: 清空终端缓冲区
   *   - reset: 硬重置终端状态
   */
  const handleAction = (action: 'copy' | 'paste' | 'clear' | 'reset') => {
    if (!xtermRef.current) return

    switch (action) {
      case 'copy':
        const selection = xtermRef.current.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection)
        }
        break
      case 'paste':
        navigator.clipboard.readText().then(text => {
          if (xtermRef.current) {
            xtermRef.current.paste(text)
          }
        })
        break
      case 'clear':
        xtermRef.current.clear()
        break
      case 'reset':
        // Hard reset logic if needed, for now just clear
        xtermRef.current.reset()
        break
    }
    setContextMenu(null)
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error booting WebContainer: {error}
        <br />
        Make sure your browser supports SharedArrayBuffer (COOP/COEP headers required).
      </div>
    )
  }

  return (
    <div
      ref={terminalRef}
      className={`h-full w-full ${className}`}
      style={style}
      onContextMenu={handleContextMenu}
    >
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--os-bg-panel)] border border-[var(--os-border)] rounded shadow-lg py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-1 text-sm text-[var(--os-text-primary)] hover:bg-[var(--os-bg-selection)] hover:text-[var(--os-text-primary)]"
            onClick={() => handleAction('copy')}
          >
            Copy
          </button>
          <button
            className="w-full text-left px-4 py-1 text-sm text-[var(--os-text-primary)] hover:bg-[var(--os-bg-selection)] hover:text-[var(--os-text-primary)]"
            onClick={() => handleAction('paste')}
          >
            Paste
          </button>
          <div className="h-px bg-[var(--os-border)] my-1" />
          <button
            className="w-full text-left px-4 py-1 text-sm text-[var(--os-text-primary)] hover:bg-[var(--os-bg-selection)] hover:text-[var(--os-text-primary)]"
            onClick={() => handleAction('clear')}
          >
            Clear Buffer
          </button>
          <button
            className="w-full text-left px-4 py-1 text-sm text-[var(--os-text-primary)] hover:bg-[var(--os-bg-selection)] hover:text-[var(--os-text-primary)]"
            onClick={() => handleAction('reset')}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

export default XTerm
