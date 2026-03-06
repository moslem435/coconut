/**
 * 快速同步工具 - 在终端中可以直接调用
 */

import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { SYSTEM_PATHS } from '@/os/config/paths'

/**
 * 快速同步指定文件夹
 */
export async function quickSyncFolder(folderName: string) {
  console.log(`🔄 快速同步文件夹: ${folderName}`)
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  const folderPath = `${SYSTEM_PATHS.USER}/${folderName}`
  const folderNode = getNodeByPath(folderPath)
  
  if (!folderNode) {
    console.error(`❌ VFS 中找不到文件夹: ${folderPath}`)
    return
  }
  
  // 创建文件夹
  try {
    await instance.fs.mkdir(folderName, { recursive: true })
    console.log(`✅ 创建文件夹: ${folderName}`)
  } catch (e) {
    console.log(`ℹ️ 文件夹已存在: ${folderName}`)
  }
  
  // 同步内容
  const syncContent = async (nodeId: string, wcPath: string) => {
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    
    for (const child of children) {
      const childWCPath = `${wcPath}/${child.name}`
      
      if (child.type === 'folder') {
        try {
          await instance.fs.mkdir(childWCPath, { recursive: true })
          console.log(`  📁 ${childWCPath}`)
        } catch (e) {
          // Folder exists
        }
        await syncContent(child.id, childWCPath)
      } else {
        try {
          const content = await useFileSystemStore.getState().readFileContent(child.id)
          await instance.fs.writeFile(childWCPath, content)
          console.log(`  📄 ${childWCPath}`)
        } catch (e) {
          console.warn(`  ⚠️ 同步失败: ${childWCPath}`, e)
        }
      }
    }
  }
  
  await syncContent(folderNode.id, folderName)
  console.log(`✅ 同步完成: ${folderName}`)
}

/**
 * 列出 VFS 中某个文件夹的内容
 */
export async function listVFSFolder(folderName: string) {
  console.log(`📂 VFS 中的 ${folderName}:`)
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const folderPath = `${SYSTEM_PATHS.USER}/${folderName}`
  const folderNode = getNodeByPath(folderPath)
  
  if (!folderNode) {
    console.error(`❌ 找不到文件夹: ${folderPath}`)
    return
  }
  
  const listContent = (nodeId: string, indent = '') => {
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    for (const child of children) {
      if (child.type === 'folder') {
        console.log(`${indent}📁 ${child.name}/`)
        listContent(child.id, indent + '  ')
      } else {
        console.log(`${indent}📄 ${child.name}`)
      }
    }
  }
  
  listContent(folderNode.id)
}

/**
 * 列出 WebContainer 中某个文件夹的内容
 */
export async function listWCFolder(folderName: string) {
  console.log(`📂 WebContainer 中的 ${folderName}:`)
  
  const { instance } = useWebContainerStore.getState()
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  const listContent = async (path: string, indent = '') => {
    try {
      const entries = await instance.fs.readdir(path, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = `${path}/${entry.name}`
        if (entry.isDirectory()) {
          console.log(`${indent}📁 ${entry.name}/`)
          await listContent(fullPath, indent + '  ')
        } else {
          console.log(`${indent}📄 ${entry.name}`)
        }
      }
    } catch (e) {
      console.error(`❌ 无法读取: ${path}`, e)
    }
  }
  
  await listContent(folderName)
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).quickSyncFolder = quickSyncFolder;
  (window as any).listVFSFolder = listVFSFolder;
  (window as any).listWCFolder = listWCFolder;
  
  console.log('💡 快速同步工具已加载，可用命令：')
  console.log('  - quickSyncFolder("apps") - 快速同步指定文件夹')
  console.log('  - listVFSFolder("apps") - 查看 VFS 中的文件夹内容')
  console.log('  - listWCFolder("apps") - 查看 WebContainer 中的文件夹内容')
}
