/**
 * 批量操作 Hook
 * 处理批量操作的进度管理、错误处理
 */

import { useState, useCallback, useRef } from 'react'

export interface BatchOperation {
  id: string
  name: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

export interface BatchProgressState {
  isOpen: boolean
  title: string
  operations: BatchOperation[]
  cancelRequested: boolean
}

export function useBatchOperation() {
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    isOpen: false,
    title: '',
    operations: [],
    cancelRequested: false
  })

  // 使用 ref 追踪取消状态，避免闭包陷阱
  const cancelRequestedRef = useRef(false)

  /**
   * 执行批量操作
   */
  const executeBatch = useCallback(async <T>(
    title: string,
    items: Array<{ id: string; name: string }>,
    operation: (item: { id: string; name: string }) => Promise<T>
  ): Promise<void> => {
    const operations: BatchOperation[] = items.map(item => ({
      id: item.id,
      name: item.name,
      status: 'pending' as const
    }))

    // 重置取消状态
    cancelRequestedRef.current = false

    setBatchProgress({
      isOpen: true,
      title,
      operations,
      cancelRequested: false
    })

    for (let i = 0; i < operations.length; i++) {
      // 检查是否取消（使用 ref 获取最新值）
      if (cancelRequestedRef.current) break

      const item = items[i]
      if (!item) continue

      // 更新为处理中
      setBatchProgress(prev => ({
        ...prev,
        operations: prev.operations.map((op, idx) =>
          idx === i ? { ...op, status: 'processing' } : op
        )
      }))

      try {
        await operation(item)
        
        // 更新为成功
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'success' } : op
          )
        }))
      } catch (error) {
        // 更新为失败
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'error', error: String(error) } : op
          )
        }))
      }
    }
  }, [])

  /**
   * 取消批量操作
   */
  const cancelBatch = useCallback(() => {
    cancelRequestedRef.current = true
    setBatchProgress(prev => ({ ...prev, cancelRequested: true }))
  }, [])

  /**
   * 关闭进度对话框
   */
  const closeBatch = useCallback(() => {
    cancelRequestedRef.current = false
    setBatchProgress({
      isOpen: false,
      title: '',
      operations: [],
      cancelRequested: false
    })
  }, [])

  return {
    batchProgress,
    executeBatch,
    cancelBatch,
    closeBatch
  }
}
