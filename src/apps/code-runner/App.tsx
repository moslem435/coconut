
import React, { useEffect, useState, useRef } from 'react';
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore';
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore';
import { Runner } from 'react-runner';
import * as Lucide from 'lucide-react';
import * as FramerMotion from 'framer-motion';

// --- Types ---
type RunMode = 'react' | 'wasm' | 'node';

interface CodeRunnerProps {
    filePath?: string;
    code?: string; 
    mode?: RunMode; // Explicit mode override
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

// --- WASM Runner Component ---
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
                // If it's a file path, we might want to execute it directly if it's a binary
                // But here we assume 'code' contains a script or we are running a node script
                
                // 1. Write code to a temp file
                const scriptPath = 'runner-script.js';
                await instance.fs.writeFile(scriptPath, code || '');
                
                // 2. Spawn node process
                const process = await instance.spawn('node', [scriptPath]);
                
                process.output.pipeTo(new WritableStream({
                    write(data) {
                        setOutput(prev => [...prev, data]);
                    }
                }));

                const exitCode = await process.exit;
                setOutput(prev => [...prev, `Process exited with code ${exitCode}`]);
            } catch (e: any) {
                setOutput(prev => [...prev, `Error: ${e.message}`]);
            } finally {
                setIsRunning(false);
            }
        };

        if (code && instance) {
            run();
        }
    }, [code, instance]);

    if (!instance) {
        return <div className="p-4 text-amber-400">WebContainer not initialized. Please open Terminal first.</div>;
    }

    return (
        <div className="bg-black text-green-400 font-mono p-4 h-full overflow-auto whitespace-pre-wrap">
            {output.map((line, i) => (
                <div key={i}>{line}</div>
            ))}
            {isRunning && <div className="animate-pulse">_</div>}
        </div>
    );
};

// --- Main Component ---
export default function CodeRunner({ filePath, code: initialCode, mode: initialMode }: CodeRunnerProps) {
    const [code, setCode] = useState<string>(initialCode || '');
    const [error, setError] = useState<string | null>(null);
    const { readFileContent } = useFileSystemStore();
    const [mode, setMode] = useState<RunMode>(initialMode || 'react');

    useEffect(() => {
        const loadCode = async () => {
            if (filePath) {
                try {
                    const content = await readFileContent(filePath);
                    setCode(content);
                    
                    // Auto-detect mode if not provided
                    if (!initialMode) {
                        if (filePath.endsWith('.wasm')) setMode('wasm');
                        else if (filePath.endsWith('.js') && content.includes('process.stdout')) setMode('node');
                        else setMode('react');
                    }
                } catch (e: any) {
                    setError(`Failed to read file: ${e.message}`);
                }
            }
        };
        
        if (filePath && !initialCode) {
            loadCode();
        }
    }, [filePath, initialCode, readFileContent, initialMode]);

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

    if (!code && mode !== 'wasm') {
        return (
            <div className="h-full w-full flex items-center justify-center text-zinc-500">
                <div className="text-center">
                    <Lucide.Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Loading code...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white dark:bg-zinc-900 overflow-auto flex flex-col">
            {/* Toolbar */}
            <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-4 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase">Mode:</span>
                    <select 
                        value={mode} 
                        onChange={(e) => setMode(e.target.value as RunMode)}
                        className="bg-transparent text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="react">React Preview</option>
                        <option value="node">Node.js / WASM (WebContainer)</option>
                    </select>
                </div>
            </div>

            {/* Runner Area */}
            <div className="flex-1 relative">
                {mode === 'react' ? (
                    <div className="p-4 h-full">
                        <Runner 
                            code={code} 
                            scope={scope} 
                            onRendered={(error) => {
                                if (error) setError(error.toString());
                            }}
                        />
                    </div>
                ) : (
                    <WasmRunner code={code} filePath={filePath} />
                )}
            </div>
        </div>
    );
}
