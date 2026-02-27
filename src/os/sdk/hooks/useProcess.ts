import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useCallback } from 'react'

export function useProcess() {
  const store = useProcessStore()

  const kill = useCallback((pid: number) => {
    store.killProcess(pid)
  }, [])

  const create = useCallback((appId: string, name: string, windowId?: string) => {
    return store.createProcess(appId, name, windowId)
  }, [])

  const getProcessByWindowId = useCallback((windowId: string) => {
    return store.getProcessByWindowId(windowId)
  }, [store.processes])

  return {
    processes: store.getProcessList(),
    create,
    kill,
    getProcessByWindowId
  }
}
