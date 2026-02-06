import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react'

interface Props {
    children: ReactNode
    appId: string
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[OS] Application Error (${this.props.appId}):`, error, errorInfo)
        this.props.onError?.(error, errorInfo)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-white p-6 font-mono border border-red-900/50">
                    <div className="flex flex-col items-center max-w-md text-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                            <AlertTriangle size={48} className="text-red-500 relative z-10" />
                        </div>

                        <h2 className="text-xl font-bold text-red-500 tracking-wider">SYSTEM_FAILURE</h2>

                        <div className="bg-red-950/30 border border-red-900/50 p-4 rounded text-xs text-left w-full overflow-hidden">
                            <p className="text-red-400 font-bold mb-2">ERROR_TRACE:</p>
                            <pre className="text-red-300/70 whitespace-pre-wrap break-words font-mono">
                                {this.state.error?.message || 'Unknown Error'}
                            </pre>
                        </div>

                        <p className="text-sm text-white/50">
                            Application process encountered a critical fault. Protocol terminated to preserve system integrity.
                        </p>

                        <button
                            onClick={this.handleRetry}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/50 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors rounded text-sm group"
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span>RESTART_PROTOCOL</span>
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
