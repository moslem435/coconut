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
import { SYSTEM_PATHS, SYSTEM_CONFIG } from '@/os/config/paths'
import { logger } from '@/os/utils/logger'
import { checkWebContainerSupport, logWebContainerState } from '@/os/utils/terminalDebug'
import '@xterm/xterm/css/xterm.css'

// 导入同步和诊断工具（会自动暴露到 window 对象）
import '@/os/utils/syncVFSToWebContainer'
import '@/os/utils/quickSync'
import '@/os/utils/diagnosticSync'
import '@/os/utils/autoFix'

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
    logWebContainerState({
      hasInstance: !!instance,
      isBooting,
      error,
      isReady
    })
  }, [instance, isBooting, error, isReady])

  /**
   * 初始化时检查浏览器环境
   */
  useEffect(() => {
    checkWebContainerSupport()
  }, [])

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
    
    // 设置超时检测
    const bootTimeout = setTimeout(() => {
      if (!instance && !error) {
        logger.error('[XTerm] WebContainer boot timeout (30s)')
        console.error('⏱️ WebContainer 启动超时，可能的原因：')
        console.error('1. 网络问题导致 WASM 文件加载失败')
        console.error('2. 浏览器不支持必要的 API')
        console.error('3. 文件系统初始化卡住')
        console.error('4. 请检查浏览器控制台是否有其他错误')
      }
    }, 30000)
    
    boot().then(() => {
      clearTimeout(bootTimeout)
      logger.debug('[XTerm] WebContainer boot completed')
    }).catch((err) => {
      clearTimeout(bootTimeout)
      logger.error('[XTerm] WebContainer boot failed:', err)
    })
    
    return () => clearTimeout(bootTimeout)
  }, [boot, instance, error])

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
        console.log('🚀 正在启动 Shell 进程...')

        // Spawn jsh (JavaScript Shell)
        // Fix: Map VFS path (/home/user/project) to WC internal path (/project)
        // Since we mount /home/user content to WC root, the project folder is at /project
        let wcCwd = SYSTEM_PATHS.PROJECT.replace(SYSTEM_PATHS.USER, '') || '/'
        
        // Fallback: 如果 project 目录不存在，使用根目录
        try {
          await instance.fs.readdir(wcCwd)
          console.log('📂 工作目录存在:', wcCwd)
        } catch (e) {
          console.warn('⚠️ 工作目录不存在，使用根目录:', wcCwd)
          wcCwd = '/'
        }
        
        console.log('📂 最终工作目录:', wcCwd)
        console.log('🔧 环境变量:', {
          TERM: 'xterm-256color',
          HOME: '/',
        })
        
        // 添加超时保护
        const spawnTimeout = setTimeout(() => {
          console.error('⏱️ Shell 启动超时 (10s)')
          term.writeln('\x1b[33m⚠ Shell startup timeout\x1b[0m')
          term.writeln('This may indicate a problem with the working directory.')
          term.writeln('Try refreshing the page.')
        }, 10000)
        
        const shellProcess = await instance.spawn('jsh', {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
          env: {
            TERM: 'xterm-256color',
            HOME: '/', // WC root is mapped to /home/user
          },
          cwd: wcCwd
        })

        clearTimeout(spawnTimeout)
        console.log('✅ Shell 进程启动成功')
        processRef.current = shellProcess

        // Pipe process output to XTerm with prompt cleanup
        // We do NOT await this promise because it resolves when the process exits
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              // Ensure data is string to prevent crashes
              let cleanData = typeof data === 'string' ? data : String(data)
              
              // 1. Remove WebContainer internal hash path prefix (e.g. /home/xyz123...)
              // This fixes 'pwd' output to show clean paths like /home/user/project
              cleanData = cleanData.replace(/\/home\/[a-z0-9-]{10,}/g, '/home/user')
              
              // 2. Prepend user@host to paths starting with ~ or /home/user in the prompt
              // This makes "~/project" look like "user@portfoliio:~/project"
              // We match the start of line or newline, followed by optional ANSI colors, then ~ or /home/user
              cleanData = cleanData.replace(/(^|\r\n)(\x1b\[[0-9;]*m)*(~|\/home\/user)/g, `$1$2${SYSTEM_CONFIG.USER_NAME}@${SYSTEM_CONFIG.HOST_NAME}:$3`)

              // 3. Custom prompt styling (replace jsh arrow '❯' with standard '$')
              cleanData = cleanData.replace(/❯/g, '$')
              
              term.write(cleanData)
            },
          })
        ).catch((err: any) => {
            logger.error('[XTerm] Shell output pipe error:', err)
        })

        // Pipe XTerm input to process
        const inputWriter = shellProcess.input.getWriter()
        const input = term.onData((data) => {
          inputWriter.write(data)
        })

        setIsReady(true)
        logger.debug('[XTerm] Terminal ready')
        console.log('🎉 终端已就绪')

        // Return cleanup function to be used by the outer scope if needed, 
        // but since we are in a useEffect we handle cleanup via a pattern that TS accepts.
      } catch (error) {
        logger.error('[XTerm] Failed to start shell:', error)
        console.error('❌ Shell 启动失败:', error)
        
        term.clear()
        term.writeln('\x1b[31m✖ Failed to start terminal\x1b[0m')
        term.writeln('')
        
        if (error instanceof Error) {
          term.writeln(`Error: ${error.message}`)
          
          // 提供更具体的错误提示
          if (error.message.includes('ENOENT')) {
            term.writeln('')
            term.writeln('可能原因：工作目录不存在')
            term.writeln('尝试：检查文件系统是否正确初始化')
          } else if (error.message.includes('spawn')) {
            term.writeln('')
            term.writeln('可能原因：Shell 进程启动失败')
            term.writeln('尝试：刷新页面重试')
          }
        } else {
          term.writeln(`Error: ${String(error)}`)
        }
        
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
        Error booting WebContainer: {typeof error === 'object' ? JSON.stringify(error) : error}
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
