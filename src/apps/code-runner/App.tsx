
import React, { useEffect, useState, useRef } from 'react';
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore';
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore';
import { Runner } from 'react-runner';
import * as Lucide from 'lucide-react';
import * as FramerMotion from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Types ---
type RunMode = 'react' | 'html' | 'node';

interface CodeRunnerProps {
    filePath?: string;
    code?: string;
    language?: string; // Passed from AI Chat run button
    mode?: RunMode;    // Explicit mode override
    isAppBundle?: boolean; // If true, hide toolbar for app-like experience
}

// --- React Scope ---
const scope = {
    React,
    useState,
    useEffect,
    useRef: React.useRef,
    useMemo: React.useMemo,
    useCallback: React.useCallback,
    ...Lucide,
    ...FramerMotion
};

// --- HTML Preview via iframe ---
const HtmlRunner = ({ code }: { code: string }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!iframeRef.current || !code) return;
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        iframeRef.current.src = url;
        return () => URL.revokeObjectURL(url);
    }, [code]);

    return (
        <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title="HTML Preview"
        />
    );
};

// --- WASM / Node Runner ---
const WasmRunner = ({ code, filePath }: { code?: string, filePath?: string }) => {
    const [output, setOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const { instance } = useWebContainerStore();

    useEffect(() => {
        const run = async () => {
            if (!instance) return;
            setIsRunning(true);
            setOutput(['Initializing WebContainer for WASM/Node execution...']);

            try {
                const scriptPath = 'runner-script.js';
                await instance.fs.writeFile(scriptPath, code || '');
                const process = await instance.spawn('node', [scriptPath]);

                process.output.pipeTo(new WritableStream({
                    write(data) { setOutput(prev => [...prev, data]); }
                }));

                const exitCode = await process.exit;
                setOutput(prev => [...prev, `Process exited with code ${exitCode}`]);
            } catch (e: any) {
                setOutput(prev => [...prev, `Error: ${e.message}`]);
            } finally {
                setIsRunning(false);
            }
        };

        if (code && instance) run();
    }, [code, instance]);

    if (!instance) {
        return <div className="p-4 text-amber-400">WebContainer not initialized. Please open Terminal first.</div>;
    }

    return (
        <div className="bg-black text-green-400 font-mono p-4 h-full overflow-auto whitespace-pre-wrap">
            {output.map((line, i) => <div key={i}>{line}</div>)}
            {isRunning && <div className="animate-pulse">_</div>}
        </div>
    );
};

// --- Detect run mode from language or file extension ---
function detectMode(language?: string, filePath?: string, code?: string): RunMode {
    if (language === 'html') return 'html';
    if (language === 'tsx' || language === 'jsx') return 'react';
    if (filePath?.endsWith('.html')) return 'html';
    if (filePath?.endsWith('.wasm')) return 'node';
    if (filePath?.endsWith('.js') && code?.includes('process.stdout')) return 'node';
    return 'react';
}

// --- Main Component ---
export default function CodeRunner({ filePath, code: initialCode, language, mode: initialMode, isAppBundle }: CodeRunnerProps) {
    const [code, setCode] = useState<string | null>(initialCode ?? null);
    const [error, setError] = useState<string | null>(null);
    const { readFileContent } = useFileSystemStore();
    const [mode, setMode] = useState<RunMode>(
        initialMode || detectMode(language, filePath, initialCode)
    );

    useEffect(() => {
        const loadCode = async () => {
            if (filePath) {
                try {
                    const content = await readFileContent(filePath);
                    setCode(content);
                    if (!initialMode) {
                        setMode(detectMode(language, filePath, content));
                    }
                } catch (e: any) {
                    setError(`Failed to read file: ${e.message}`);
                    setCode(''); // Stop loading on error
                }
            }
        };

        if (filePath && initialCode === undefined) loadCode();
    }, [filePath, initialCode, readFileContent, initialMode, language]);

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-red-900/20 text-red-400 p-4">
                <div className="text-center">
                    <Lucide.AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <h3 className="text-lg font-bold">Execution Error</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (code === null && mode !== 'node') {
        return (
            <div className="h-full w-full flex items-center justify-center text-zinc-500">
                <div className="text-center">
                    <Lucide.Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Loading code...</p>
                </div>
            </div>
        );
    }

    // Ensure code is string for runners
    const safeCode = code || '';

    // Define scope for React Runner
    const scope = {
        import: {
            react: React,
            'lucide-react': Lucide,
            'framer-motion': FramerMotion,
        },
    };

    return (
        <div className={cn(
            "h-full w-full bg-white dark:bg-zinc-900 overflow-auto flex flex-col",
            !isAppBundle && "pt-10"
        )}>
            {/* Toolbar */}
            {!isAppBundle && (
            <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-4 bg-zinc-50 dark:bg-zinc-900 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase">Mode:</span>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as RunMode)}
                        className="bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="html">HTML Preview</option>
                        <option value="react">React Preview</option>
                        <option value="node">Node.js / WASM (WebContainer)</option>
                    </select>
                </div>
            </div>
            )}

            {/* Runner Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* HTML Runner */}
                {mode === 'html' && (
                    <HtmlRunner code={safeCode} />
                )}

                {/* React Runner */}
                {mode === 'react' && (
                    <Runner code={safeCode} scope={scope} />
                )}

                {/* Node/Wasm Runner */}
                {mode === 'node' && (
                    <WasmRunner code={safeCode} />
                )}
            </div>
        </div>
    );
}
