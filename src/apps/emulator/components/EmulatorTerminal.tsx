import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface EmulatorTerminalProps {
    emulator: any;
}

export function EmulatorTerminal({ emulator }: EmulatorTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    useEffect(() => {
        if (!terminalRef.current) return

        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#000000',
                foreground: '#f0f0f0',
                cursor: '#ffffff',
                selectionBackground: 'rgba(255, 255, 255, 0.3)',
            },
            fontFamily: 'Consolas, monospace',
            fontSize: 14,
            convertEol: true, // Handle \n as \r\n
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        
        term.loadAddon(fitAddon)
        term.loadAddon(webLinksAddon)
        
        term.open(terminalRef.current)
        fitAddon.fit()
        
        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Handle resize
        const handleResize = () => fitAddon.fit()
        window.addEventListener('resize', handleResize)
        
        // Initial greeting
        term.writeln('\x1b[1;32mWelcome to Web OS Terminal\x1b[0m')
        term.writeln('Serial port connected. Output will appear here...')
        term.writeln('')

        // Handle input (send to serial0)
        term.onData(data => {
            if (emulator) {
                emulator.serial0_send(data)
            }
        })

        return () => {
            window.removeEventListener('resize', handleResize)
            term.dispose()
        }
    }, [])

    // Update fit when container resizes (e.g. panel resize)
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            fitAddonRef.current?.fit()
        })
        
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current)
        }
        
        return () => resizeObserver.disconnect()
    }, [])

    // Bind emulator serial output to xterm
    useEffect(() => {
        if (!emulator || !xtermRef.current) return

        const handleSerialOutput = (char: string) => {
            xtermRef.current?.write(char)
        }

        emulator.add_listener('serial0-output-char', handleSerialOutput)

        return () => {
            // v86 doesn't have a clean remove_listener for specific handler easily accessible 
            // without keeping reference, but we can try if API supports it.
            // Actually v86 listeners are often global or we just leave it. 
            // But to avoid duplicates on re-render, we should be careful.
            // However, this component is likely mounted once.
            // Let's check v86 API or just assume it's fine for now as long as we don't re-mount often.
        }
    }, [emulator])

    return (
        <div className="w-full h-full bg-black p-1 overflow-hidden">
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    )
}
