'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Simple System Bridge SDK injected into the guest
const SystemSDK = `
class SystemBridge {
    constructor(appId) {
        this.appId = appId;
        this.msgId = 0;
        this.pending = new Map();
        
        window.addEventListener('message', (e) => {
            if (e.data.type === 'SYSCALL_RESULT') {
                const { id, result, error } = e.data;
                if (this.pending.has(id)) {
                    const { resolve, reject, timeout } = this.pending.get(id);
                    clearTimeout(timeout);
                    if (error) reject(new Error(error));
                    else resolve(result);
                    this.pending.delete(id);
                }
            }
        });
    }

    call(method, ...args) {
        return new Promise((resolve, reject) => {
            const id = this.msgId++;
            const timeout = setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error('SysCall Timeout: ' + method));
                }
            }, 5000);

            this.pending.set(id, { resolve, reject, timeout });
            window.parent.postMessage({
                id,
                type: 'SYSCALL',
                appId: this.appId,
                method,
                args
            }, window.location.origin);
        });
    }
}
window.os = new SystemBridge(new URLSearchParams(window.location.search).get('appId'));
`

function SandboxContent() {
    const searchParams = useSearchParams()
    const appId = searchParams.get('appId')
    const [log, setLog] = useState<string[]>([])

    const addToLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

    useEffect(() => {
        // Inject SDK
        if (!document.getElementById('os-sdk')) {
            const script = document.createElement('script')
            script.id = 'os-sdk'
            script.textContent = SystemSDK
            document.head.appendChild(script)
        }

        // Simulate App Logic based on ID
        if (appId === 'sandbox-test') {
            runTestApp()
        }
    }, [appId])

    const runTestApp = async () => {
        await new Promise(r => setTimeout(r, 500))
        addToLog('App started inside Sandbox (iframe).')
        addToLog('User: ' + navigator.userAgent)
        
        // 1. Try authorized call
        addToLog('1. Testing authorized call (alert)...')
        try {
            // @ts-ignore
            await window.os.call('alert', 'Hello from Sandbox!')
            addToLog('✅ Success: Alert shown (Permission Granted)')
        } catch (e: any) {
            addToLog(`❌ Failed: ${e.message}`)
        }

        // 2. Try unauthorized call
        addToLog('2. Testing unauthorized call (fs.readFile)...')
        try {
            // @ts-ignore
            await window.os.call('fs.readFile', '/system/secret.txt')
            addToLog('❌ Security Breach! Read file success (Should fail)')
        } catch (e: any) {
            addToLog(`✅ Blocked: ${e.message}`)
        }
    }

    return (
        <div className="h-full w-full bg-slate-900 text-slate-200 p-4 font-mono text-sm overflow-auto">
            <h1 className="text-xl font-bold mb-4 text-emerald-400">🛡️ Sandboxed Environment</h1>
            <div className="mb-2">App ID: <span className="text-yellow-400">{appId}</span></div>
            <div className="mb-4">Status: <span className="text-green-400">Running in Isolation</span></div>
            
            <div className="border border-slate-700 rounded p-4 bg-slate-950">
                <div className="text-slate-500 mb-2">--- System Logs ---</div>
                {log.map((l, i) => (
                    <div key={i} className="border-b border-slate-800/50 py-1 last:border-0">
                        {l}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function SandboxPage() {
    return (
        <Suspense fallback={<div>Loading Sandbox...</div>}>
            <SandboxContent />
        </Suspense>
    )
}
