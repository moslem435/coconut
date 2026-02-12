import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import '@xterm/xterm/css/xterm.css'

interface XTermProps {
  className?: string
  style?: React.CSSProperties
}

const XTerm: React.FC<XTermProps> = ({ className, style }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processRef = useRef<any>(null)
  
  const { instance, boot, isBooting, error } = useWebContainerStore()
  const [isReady, setIsReady] = useState(false)

  // 1. Boot WebContainer
  useEffect(() => {
    boot()
  }, [boot])

  // 2. Initialize XTerm
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      allowTransparency: true,
      theme: {
        background: 'rgba(30, 30, 30, 0.85)', // Semi-transparent dark
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
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

  // 3. Connect WebContainer to XTerm
  useEffect(() => {
    if (!instance || !xtermRef.current || isReady) return

    const startShell = async () => {
      const term = xtermRef.current!
      
      term.clear()
      term.writeln('\x1b[32m✔ System Online\x1b[0m')
      term.writeln('')

      // Spawn jsh (JavaScript Shell)
      const shellProcess = await instance.spawn('jsh', {
        terminal: {
          cols: term.cols,
          rows: term.rows,
        },
        env: {
            // Attempt to customize prompt - WebContainer jsh might ignore this but worth a try
            // or we might need to set it in .bashrc equivalent if it exists
            TERM: 'xterm-256color',
        }
      })
      
      processRef.current = shellProcess

      // Pipe process output to XTerm with prompt cleanup
      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            let cleanData = data
            
            // 1. Replace the internal WebContainer ID path
            // Matches ~/ followed by 10+ alphanumeric chars
            cleanData = cleanData.replace(/~\/[a-z0-9-]{10,}/g, 'guest@portfoliio:~/project')
            
            // 2. Merge path and prompt onto the same line
            // jsh typically outputs: [Path] [Newline] [PromptChar]
            // We want: [Path] [Space] [PromptChar]
            // Matches: \r\n followed by optional ANSI codes, then the prompt character (❯)
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

      return () => {
        input.dispose()
        inputWriter.releaseLock()
        shellProcess.kill()
        processRef.current = null
      }
    }

    startShell()
  }, [instance, isReady])


  // 4. Handle resize with ResizeObserver
  useEffect(() => {
    if (!terminalRef.current || !fitAddonRef.current) return

    const observer = new ResizeObserver(() => {
        requestAnimationFrame(() => {
            if (!fitAddonRef.current || !xtermRef.current) return
            
            try {
                fitAddonRef.current.fit()
                
                // Resize the pty if connected
                if (processRef.current) {
                    processRef.current.resize({
                        cols: xtermRef.current.cols,
                        rows: xtermRef.current.rows,
                    })
                }
            } catch (e) {
                // Ignore resize errors during dispose
            }
        })
    })

    observer.observe(terminalRef.current)

    return () => observer.disconnect()
  }, [])

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error booting WebContainer: {error}
        <br />
        Make sure your browser supports SharedArrayBuffer (COOP/COEP headers required).
      </div>
    )
  }

  return <div ref={terminalRef} className={`h-full w-full ${className}`} style={style} />
}

export default XTerm
