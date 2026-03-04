/**
 * 批量操作 Hook
 * 处理批量操作的进度管理、错误处理、并发控制
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
  completed: number
  failed: number
}

/**
 * Concurrent queue with limit
 */
async function executeConcurrent<T>(
  items: T[],
  operation: (item: T, index: number) => Promise<void>,
  concurrency: number = 5,
  onProgress?: (index: number) => void,
  shouldCancel?: () => boolean
): Promise<void> {
  const results: Promise<void>[] = []
  let currentIndex = 0

  const executeNext = async (): Promise<void> => {
    while (currentIndex < items.length) {
      // Check if cancelled
      if (shouldCancel && shouldCancel()) {
        break
      }

      const index = currentIndex++
      const item = items[index]
      if (!item) continue

      try {
        await operation(item, index)
        onProgress?.(index)
      } catch (error) {
        // Error already handled in operation
        onProgress?.(index)
      }
    }
  }

  // Start concurrent workers
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    results.push(executeNext())
  }

  await Promise.all(results)
}

export function useBatchOperation() {
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    isOpen: false,
    title: '',
    operations: [],
    cancelRequested: false,
    completed: 0,
    failed: 0
  })

  // 使用 ref 追踪取消状态，避免闭包陷阱
  const cancelRequestedRef = useRef(false)

  /**
   * 执行批量操作（并发版本）
   */
  const executeBatch = useCallback(async <T>(
    title: string,
    items: Array<{ id: string; name: string }>,
    operation: (item: { id: string; name: string }) => Promise<T>,
    concurrency: number = 5 // 默认并发数
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
      cancelRequested: false,
      completed: 0,
      failed: 0
    })

    await executeConcurrent(
      items,
      async (item, index) => {
        // 更新为处理中
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === index ? { ...op, status: 'processing' } : op
          )
        }))

        try {
          await operation(item)
          
          // 更新为成功
          setBatchProgress(prev => ({
            ...prev,
            operations: prev.operations.map((op, idx) =>
              idx === index ? { ...op, status: 'success' } : op
            ),
            completed: prev.completed + 1
          }))
        } catch (error) {
          // 更新为失败
          setBatchProgress(prev => ({
            ...prev,
            operations: prev.operations.map((op, idx) =>
              idx === index ? { ...op, status: 'error', error: String(error) } : op
            ),
            completed: prev.completed + 1,
            failed: prev.failed + 1
          }))
        }
      },
      concurrency,
      undefined,
      () => cancelRequestedRef.current
    )
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
      cancelRequested: false,
      completed: 0,
      failed: 0
    })
  }, [])

  return {
    batchProgress,
    executeBatch,
    cancelBatch,
    closeBatch
  }
}
