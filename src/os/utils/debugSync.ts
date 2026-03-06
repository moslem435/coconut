/**
 * 调试同步工具
 * 用于诊断 VFS 和 WebContainer 之间的同步问题
 */

import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { SYSTEM_PATHS } from '@/os/config/paths'

/**
 * 检查 apps 文件夹的同步状态
 */
export async function debugAppsFolder() {
  console.log('🔍 Debugging apps folder sync...\n')
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer not initialized')
    return
  }
  
  // 1. 检查 VFS 中的 apps 文件夹
  console.log('📂 VFS: /home/user/apps')
  const appsNode = getNodeByPath('/home/user/apps')
  
  if (!appsNode) {
    console.error('❌ apps folder not found in VFS')
    return
  }
  
  console.log(`✅ Found in VFS: ${appsNode.name} (${appsNode.id})`)
  
  // 获取 apps 文件夹的所有子文件
  const appsChildren = Object.values(files).filter(f => f.parentId === appsNode.id)
  console.log(`📄 VFS children (${appsChildren.length}):`)
  
  for (const child of appsChildren) {
    if (child.type === 'folder') {
      console.log(`  📁 ${child.name}/`)
      // 递归显示子文件
      const subChildren = Object.values(files).filter(f => f.parentId === child.id)
      for (const sub of subChildren) {
        const icon = sub.type === 'folder' ? '📁' : '📄'
        console.log(`    ${icon} ${sub.name}`)
      }
    } else {
      // 读取文件内容
      try {
        const content = await useFileSystemStore.getState().readFileContent(child.id)
        console.log(`  📄 ${child.name} (${content.length} bytes)`)
      } catch (e) {
        console.log(`  📄 ${child.name} (failed to read)`)
      }
    }
  }
  
  // 2. 检查 WebContainer 中的 apps 文件夹
  console.log('\n📂 WebContainer: /apps')
  
  try {
    const wcEntries = await instance.fs.readdir('/apps', { withFileTypes: true })
    console.log(`✅ Found in WebContainer (${wcEntries.length} items):`)
    
    for (const entry of wcEntries) {
      if (entry.isDirectory()) {
        console.log(`  📁 ${entry.name}/`)
        // 递归显示子文件
        try {
          const subEntries = await instance.fs.readdir(`/apps/${entry.name}`, { withFileTypes: true })
          for (const sub of subEntries) {
            const icon = sub.isDirectory() ? '📁' : '📄'
            console.log(`    ${icon} ${sub.name}`)
          }
        } catch (e) {
          console.log(`    ⚠️ Failed to read subdirectory`)
        }
      } else {
        // 读取文件内容
        try {
          const content = await instance.fs.readFile(`/apps/${entry.name}`, 'utf-8')
          console.log(`  📄 ${entry.name} (${content.length} bytes)`)
        } catch (e) {
          console.log(`  📄 ${entry.name} (failed to read)`)
        }
      }
    }
  } catch (e: any) {
    console.error(`❌ apps folder not found in WebContainer: ${e.message}`)
  }
  
  // 3. 对比差异
  console.log('\n🔄 Sync Status:')
  const vfsFileNames = appsChildren.map(c => c.name)
  
  try {
    const wcEntries = await instance.fs.readdir('/apps', { withFileTypes: true })
    const wcFileNames = wcEntries.map(e => e.name)
    
    const missingInWC = vfsFileNames.filter(name => !wcFileNames.includes(name))
    const extraInWC = wcFileNames.filter(name => !vfsFileNames.includes(name))
    
    if (missingInWC.length > 0) {
      console.log(`⚠️ Missing in WebContainer (${missingInWC.length}):`)
      missingInWC.forEach(name => console.log(`  - ${name}`))
    }
    
    if (extraInWC.length > 0) {
      console.log(`⚠️ Extra in WebContainer (${extraInWC.length}):`)
      extraInWC.forEach(name => console.log(`  - ${name}`))
    }
    
    if (missingInWC.length === 0 && extraInWC.length === 0) {
      console.log('✅ All files synced!')
    }
  } catch (e) {
    console.error('❌ Failed to compare')
  }
}

/**
 * 手动同步 apps 文件夹
 */
export async function manualSyncApps() {
  console.log('🔄 Manually syncing apps folder...\n')
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer not initialized')
    return
  }
  
  const appsNode = getNodeByPath('/home/user/apps')
  if (!appsNode) {
    console.error('❌ apps folder not found in VFS')
    return
  }
  
  // 确保 apps 文件夹存在
  try {
    await instance.fs.mkdir('/apps', { recursive: true })
    console.log('✅ apps folder created/verified')
  } catch (e) {
    console.log('ℹ️ apps folder already exists')
  }
  
  // 递归同步所有内容
  const syncNode = async (nodeId: string, wcPath: string, depth: number = 0) => {
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    const indent = '  '.repeat(depth)
    
    for (const child of children) {
      const childWCPath = `${wcPath}/${child.name}`
      
      if (child.type === 'folder') {
        try {
          await instance.fs.mkdir(childWCPath, { recursive: true })
          console.log(`${indent}📁 ${childWCPath}`)
        } catch (e) {
          console.log(`${indent}ℹ️ ${childWCPath} (already exists)`)
        }
        await syncNode(child.id, childWCPath, depth + 1)
      } else {
        try {
          const content = await useFileSystemStore.getState().readFileContent(child.id)
          await instance.fs.writeFile(childWCPath, content)
          console.log(`${indent}📄 ${childWCPath} (${content.length} bytes)`)
        } catch (e) {
          console.error(`${indent}❌ Failed to sync ${childWCPath}:`, e)
        }
      }
    }
  }
  
  await syncNode(appsNode.id, '/apps')
  console.log('\n✅ Manual sync complete!')
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).debugAppsFolder = debugAppsFolder;
  (window as any).manualSyncApps = manualSyncApps;
  
  console.log('💡 调试工具已加载：')
  console.log('  - debugAppsFolder() - 检查 apps 文件夹同步状态')
  console.log('  - manualSyncApps() - 手动同步 apps 文件夹')
}
