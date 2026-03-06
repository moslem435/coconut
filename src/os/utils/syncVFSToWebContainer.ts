/**
 * 手动同步 VFS 到 WebContainer 的工具函数
 */

import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { SYSTEM_PATHS } from '@/os/config/paths'

/**
 * 递归同步 VFS 文件夹结构到 WebContainer
 */
export async function syncVFSToWebContainer() {
  console.log('🔄 开始同步 VFS 到 WebContainer...')
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance, syncMkdir, syncFile } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  const userNode = getNodeByPath(SYSTEM_PATHS.USER)
  if (!userNode) {
    console.error('❌ 找不到用户目录')
    return
  }
  
  let folderCount = 0
  let fileCount = 0
  
  // 递归同步函数
  const syncNode = async (nodeId: string, vfsPath: string) => {
    const node = files[nodeId]
    if (!node) return
    
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    
    for (const child of children) {
      const childPath = `${vfsPath}/${child.name}`
      
      if (child.type === 'folder') {
        console.log('📁 同步文件夹:', childPath)
        await syncMkdir(childPath)
        folderCount++
        // 递归同步子文件夹
        await syncNode(child.id, childPath)
      } else {
        console.log('📄 同步文件:', childPath)
        try {
          const content = await useFileSystemStore.getState().readFileContent(child.id)
          await syncFile(childPath, content)
          fileCount++
        } catch (e) {
          console.warn('⚠️ 同步文件失败:', childPath, e)
        }
      }
    }
  }
  
  await syncNode(userNode.id, SYSTEM_PATHS.USER)
  console.log(`✅ 同步完成: ${folderCount} 个文件夹, ${fileCount} 个文件`)
}

/**
 * 验证 WebContainer 中的文件结构
 */
export async function verifyWebContainerStructure() {
  console.log('🔍 验证 WebContainer 文件结构...')
  
  const { instance } = useWebContainerStore.getState()
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  let folderCount = 0
  let fileCount = 0
  
  const listDir = async (path: string, indent = '') => {
    try {
      const entries = await instance.fs.readdir(path, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`
        if (entry.isDirectory()) {
          console.log(`${indent}📁 ${entry.name}/`)
          folderCount++
          await listDir(fullPath, indent + '  ')
        } else {
          console.log(`${indent}📄 ${entry.name}`)
          fileCount++
        }
      }
    } catch (e) {
      console.warn(`⚠️ 无法读取目录: ${path}`, e)
    }
  }
  
  await listDir('/')
  console.log(`✅ 验证完成: ${folderCount} 个文件夹, ${fileCount} 个文件`)
}

/**
 * 对比 VFS 和 WebContainer 的差异
 */
export async function compareVFSAndWebContainer() {
  console.log('🔍 对比 VFS 和 WebContainer...')
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  const userNode = getNodeByPath(SYSTEM_PATHS.USER)
  if (!userNode) {
    console.error('❌ 找不到用户目录')
    return
  }
  
  const missing: string[] = []
  const extra: string[] = []
  
  // 收集 VFS 中的所有路径
  const vfsPaths = new Set<string>()
  const collectVFSPaths = (nodeId: string, parentPath: string = '') => {
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    for (const child of children) {
      const path = parentPath ? `${parentPath}/${child.name}` : child.name
      vfsPaths.add(path)
      if (child.type === 'folder') {
        collectVFSPaths(child.id, path)
      }
    }
  }
  collectVFSPaths(userNode.id)
  
  // 收集 WebContainer 中的所有路径
  const wcPaths = new Set<string>()
  const collectWCPaths = async (path: string = '/') => {
    try {
      const entries = await instance.fs.readdir(path, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path === '/' ? entry.name : `${path}/${entry.name}`
        const relativePath = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath
        wcPaths.add(relativePath)
        if (entry.isDirectory()) {
          await collectWCPaths(fullPath)
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }
  await collectWCPaths()
  
  // 找出差异
  for (const path of vfsPaths) {
    if (!wcPaths.has(path)) {
      missing.push(path)
    }
  }
  
  for (const path of wcPaths) {
    if (!vfsPaths.has(path)) {
      extra.push(path)
    }
  }
  
  console.log('\n📊 对比结果:')
  console.log(`VFS 中的项目: ${vfsPaths.size}`)
  console.log(`WebContainer 中的项目: ${wcPaths.size}`)
  
  if (missing.length > 0) {
    console.log(`\n⚠️ VFS 中存在但 WebContainer 中缺失 (${missing.length} 项):`)
    missing.slice(0, 20).forEach(path => console.log(`  - ${path}`))
    if (missing.length > 20) {
      console.log(`  ... 还有 ${missing.length - 20} 项`)
    }
  } else {
    console.log('\n✅ WebContainer 包含所有 VFS 项目')
  }
  
  if (extra.length > 0) {
    console.log(`\n📝 WebContainer 中存在但 VFS 中没有 (${extra.length} 项):`)
    extra.slice(0, 20).forEach(path => console.log(`  - ${path}`))
    if (extra.length > 20) {
      console.log(`  ... 还有 ${extra.length - 20} 项`)
    }
  }
  
  return { missing, extra, vfsCount: vfsPaths.size, wcCount: wcPaths.size }
}

// 在浏览器控制台中暴露这些函数
if (typeof window !== 'undefined') {
  (window as any).syncVFSToWebContainer = syncVFSToWebContainer;
  (window as any).verifyWebContainerStructure = verifyWebContainerStructure;
  (window as any).compareVFSAndWebContainer = compareVFSAndWebContainer;
  console.log('💡 提示：可以在控制台使用以下命令：')
  console.log('  - syncVFSToWebContainer() - 手动同步 VFS 到 WebContainer')
  console.log('  - verifyWebContainerStructure() - 查看 WebContainer 文件结构')
  console.log('  - compareVFSAndWebContainer() - 对比 VFS 和 WebContainer 差异')
}
