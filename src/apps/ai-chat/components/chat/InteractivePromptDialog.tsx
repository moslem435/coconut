import { useState, useEffect } from 'react';
import { Terminal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractivePromptDialogProps {
    isOpen: boolean;
    prompt: string;
    output: string;
    onResponse: (response: string) => void;
    onCancel: () => void;
}

export function InteractivePromptDialog({
    isOpen,
    prompt,
    output,
    onResponse,
    onCancel
}: InteractivePromptDialogProps) {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [textInput, setTextInput] = useState<string>('');

    // Parse options from output
    const options = parseOptions(output);
    const isTextInput = options.length === 0;

    useEffect(() => {
        if (options.length > 0 && !selectedOption && options[0]) {
            setSelectedOption(options[0]);
        }
    }, [options, selectedOption]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (isTextInput) {
            onResponse(textInput);
            setTextInput('');
        } else {
            onResponse(selectedOption);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Terminal size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            交互式命令提示
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            命令需要您的输入
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-6 h-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                    >
                        <X size={14} className="text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Command output */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {output.slice(-500)}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {prompt}
                    </div>

                    {/* Options or Text Input */}
                    {isTextInput ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                placeholder="输入内容..."
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {options.map((option) => (
                                <label
                                    key={option}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all",
                                        selectedOption === option
                                            ? "border-amber-500 bg-amber-500/5"
                                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="option"
                                        value={option}
                                        checked={selectedOption === option}
                                        onChange={(e) => setSelectedOption(e.target.value)}
                                        className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {option}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isTextInput ? !textInput.trim() : !selectedOption}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to parse options from command output
function parseOptions(output: string): string[] {
    const lines = output.split('\n');
    const options: string[] = [];

    for (const line of lines) {
        // Match various option formats:
        // - "│ ○ Yes" or "○ Yes" (Vite style with bullets)
        // - "❯ Option" or "› Option" (arrow indicators)
        // - "1. Option" or "1) Option" (numbered)
        // - "[1] Option" (bracketed numbers)
        // - "• Option" (bullet points)
        
        // Visual markers (bullets, arrows, etc.)
        let match = line.match(/[│\s]*[○●•❯›▸◆◇]\s+(.+)/);
        if (match && match[1]) {
            const option = match[1].trim();
            // Skip empty options or lines that are just decorative
            if (option && !option.match(/^[─│┌┐└┘├┤┬┴┼]+$/)) {
                options.push(option);
            }
            continue;
        }
        
        // Numbered options: "1. Option" or "1) Option"
        match = line.match(/^\s*\d+[\.\)]\s+(.+)/);
        if (match && match[1]) {
            const option = match[1].trim();
            if (option) {
                options.push(option);
            }
            continue;
        }
        
        // Bracketed numbers: "[1] Option"
        match = line.match(/^\s*\[\d+\]\s+(.+)/);
        if (match && match[1]) {
            const option = match[1].trim();
            if (option) {
                options.push(option);
            }
            continue;
        }
    }

    // Fallback: look for Yes/No pattern if explicitly asked
    const lowerOutput = output.toLowerCase();
    if (options.length === 0) {
        // Check for various Yes/No formats
        if (lowerOutput.includes('(y/n)') || 
            lowerOutput.includes('[y/n]') || 
            lowerOutput.includes('(yes/no)') ||
            lowerOutput.includes('[yes/no]')) {
            options.push('Yes');
            options.push('No');
        }
    }

    return options;
}
