import React from 'react'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export interface BatchOperation {
  id: string
  name: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

interface BatchProgressDialogProps {
  isOpen: boolean
  title: string
  operations: BatchOperation[]
  onCancel: () => void
  onClose: () => void
}

export default function BatchProgressDialog({
  isOpen,
  title,
  operations,
  onCancel,
  onClose
}: BatchProgressDialogProps) {
  if (!isOpen) return null

  const completed = operations.filter(op => op.status === 'success' || op.status === 'error').length
  const total = operations.length
  const hasErrors = operations.some(op => op.status === 'error')
  const isComplete = completed === total

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#2a2a2a] border border-white/10 rounded-lg shadow-2xl w-[500px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-medium">{title}</h3>
          <button
            onClick={isComplete ? onClose : onCancel}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between text-sm text-white/70 mb-2">
            <span>{completed} / {total} items</span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                hasErrors ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Operations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {operations.map(op => (
            <div
              key={op.id}
              className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-md"
            >
              {op.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border-2 border-white/20" />
              )}
              {op.status === 'processing' && (
                <Loader2 size={16} className="text-blue-400 animate-spin" />
              )}
              {op.status === 'success' && (
                <CheckCircle size={16} className="text-green-400" />
              )}
              {op.status === 'error' && (
                <XCircle size={16} className="text-red-400" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{op.name}</div>
                {op.error && (
                  <div className="text-xs text-red-400 truncate">{op.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2">
          {!isComplete ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors text-sm"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
