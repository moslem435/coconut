/**
 * 诊断和修复同步问题的工具
 */

import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { SYSTEM_PATHS } from '@/os/config/paths'

/**
 * 诊断特定路径的同步问题
 */
export async function diagnoseSync(vfsPath: string) {
  console.log(`\n🔍 诊断路径: ${vfsPath}`)
  console.log('='.repeat(60))
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  // 1. 检查 VFS
  console.log('\n📊 VFS 检查:')
  const vfsNode = getNodeByPath(vfsPath)
  if (!vfsNode) {
    console.error(`❌ VFS 中不存在: ${vfsPath}`)
    return
  }
  
  console.log(`✅ VFS 节点存在`)
  console.log(`   类型: ${vfsNode.type}`)
  console.log(`   ID: ${vfsNode.id}`)
  console.log(`   名称: ${vfsNode.name}`)
  
  if (vfsNode.type === 'folder') {
    const children = Object.values(files).filter(f => f.parentId === vfsNode.id)
    console.log(`   子项数量: ${children.length}`)
    if (children.length > 0) {
      console.log(`   子项列表:`)
      children.forEach(c => {
        console.log(`     - ${c.name} (${c.type})`)
      })
    }
  } else {
    try {
      const content = await useFileSystemStore.getState().readFileContent(vfsNode.id)
      console.log(`   文件大小: ${content.length} bytes`)
    } catch (e) {
      console.error(`   ❌ 无法读取文件内容:`, e)
    }
  }
  
  // 2. 检查 WebContainer
  console.log('\n📊 WebContainer 检查:')
  const wcPath = vfsPath.replace(SYSTEM_PATHS.USER, '') || '/'
  console.log(`   WebContainer 路径: ${wcPath}`)
  
  try {
    if (vfsNode.type === 'folder') {
      const entries = await instance.fs.readdir(wcPath, { withFileTypes: true })
      console.log(`✅ WebContainer 文件夹存在`)
      console.log(`   子项数量: ${entries.length}`)
      if (entries.length > 0) {
        console.log(`   子项列表:`)
        entries.forEach(e => {
          console.log(`     - ${e.name} (${e.isDirectory() ? 'folder' : 'file'})`)
        })
      }
      
      // 对比差异
      const vfsChildren = Object.values(files).filter(f => f.parentId === vfsNode.id)
      const vfsNames = new Set(vfsChildren.map(c => c.name))
      const wcNames = new Set(entries.map(e => e.name))
      
      const missing = vfsChildren.filter(c => !wcNames.has(c.name))
      const extra = entries.filter(e => !vfsNames.has(e.name))
      
      if (missing.length > 0) {
        console.log(`\n⚠️ WebContainer 中缺失 ${missing.length} 项:`)
        missing.forEach(m => console.log(`   - ${m.name} (${m.type})`))
      }
      
      if (extra.length > 0) {
        console.log(`\n📝 WebContainer 中多余 ${extra.length} 项:`)
        extra.forEach(e => console.log(`   - ${e.name}`))
      }
      
      if (missing.length === 0 && extra.length === 0) {
        console.log(`\n✅ VFS 和 WebContainer 完全同步`)
      }
      
    } else {
      const content = await instance.fs.readFile(wcPath, 'utf-8')
      console.log(`✅ WebContainer 文件存在`)
      console.log(`   文件大小: ${content.length} bytes`)
    }
  } catch (e: any) {
    console.error(`❌ WebContainer 中不存在或无法访问`)
    console.error(`   错误: ${e.message}`)
    
    // 提供修复建议
    console.log(`\n💡 修复建议:`)
    if (vfsNode.type === 'folder') {
      console.log(`   执行: await quickSyncFolder('${vfsNode.name}')`)
    } else {
      console.log(`   执行: await syncVFSToWebContainer()`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
}

/**
 * 强制同步特定路径
 */
export async function forceSync(vfsPath: string) {
  console.log(`\n🔄 强制同步: ${vfsPath}`)
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  const vfsNode = getNodeByPath(vfsPath)
  if (!vfsNode) {
    console.error(`❌ VFS 中不存在: ${vfsPath}`)
    return
  }
  
  const wcPath = vfsPath.replace(SYSTEM_PATHS.USER, '') || '/'
  
  const syncNode = async (nodeId: string, wcNodePath: string, indent = '') => {
    const node = files[nodeId]
    if (!node) return
    
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    
    for (const child of children) {
      const childWCPath = wcNodePath === '/' ? `/${child.name}` : `${wcNodePath}/${child.name}`
      
      if (child.type === 'folder') {
        try {
          await instance.fs.mkdir(childWCPath, { recursive: true })
          console.log(`${indent}📁 ${childWCPath}`)
        } catch (e) {
          // Already exists
        }
        await syncNode(child.id, childWCPath, indent + '  ')
      } else {
        try {
          const content = await useFileSystemStore.getState().readFileContent(child.id)
          await instance.fs.writeFile(childWCPath, content)
          console.log(`${indent}📄 ${childWCPath} (${content.length} bytes)`)
        } catch (e) {
          console.error(`${indent}❌ ${childWCPath}:`, e)
        }
      }
    }
  }
  
  if (vfsNode.type === 'folder') {
    await instance.fs.mkdir(wcPath, { recursive: true })
    await syncNode(vfsNode.id, wcPath)
  } else {
    const content = await useFileSystemStore.getState().readFileContent(vfsNode.id)
    await instance.fs.writeFile(wcPath, content)
  }
  
  console.log(`✅ 同步完成`)
}

/**
 * 完整的健康检查
 */
export async function healthCheck() {
  console.log('\n🏥 系统健康检查')
  console.log('='.repeat(60))
  
  const { instance } = useWebContainerStore.getState()
  const { files, getNodeByPath } = useFileSystemStore.getState()
  
  // 1. WebContainer 状态
  console.log('\n1️⃣ WebContainer 状态:')
  if (instance) {
    console.log('   ✅ WebContainer 已启动')
  } else {
    console.log('   ❌ WebContainer 未启动')
    return
  }
  
  // 2. VFS 状态
  console.log('\n2️⃣ VFS 状态:')
  const userNode = getNodeByPath(SYSTEM_PATHS.USER)
  if (userNode) {
    console.log('   ✅ 用户目录存在')
    const allFiles = Object.values(files)
    const folders = allFiles.filter(f => f.type === 'folder')
    const fileNodes = allFiles.filter(f => f.type === 'file')
    console.log(`   📊 统计: ${folders.length} 个文件夹, ${fileNodes.length} 个文件`)
  } else {
    console.log('   ❌ 用户目录不存在')
    return
  }
  
  // 3. 同步状态
  console.log('\n3️⃣ 同步状态检查:')
  const topLevelChildren = Object.values(files).filter(f => f.parentId === userNode.id)
  
  let syncIssues = 0
  for (const child of topLevelChildren) {
    const wcPath = child.name
    try {
      if (child.type === 'folder') {
        await instance.fs.readdir(wcPath)
        console.log(`   ✅ ${child.name}/`)
      } else {
        await instance.fs.readFile(wcPath)
        console.log(`   ✅ ${child.name}`)
      }
    } catch (e) {
      console.log(`   ❌ ${child.name} - 缺失`)
      syncIssues++
    }
  }
  
  // 4. 总结
  console.log('\n📋 总结:')
  if (syncIssues === 0) {
    console.log('   ✅ 所有顶层项目已同步')
  } else {
    console.log(`   ⚠️ 发现 ${syncIssues} 个同步问题`)
    console.log(`   💡 建议执行: await syncVFSToWebContainer()`)
  }
  
  console.log('\n' + '='.repeat(60))
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).diagnoseSync = diagnoseSync;
  (window as any).forceSync = forceSync;
  (window as any).healthCheck = healthCheck;
  
  console.log('🔧 诊断工具已加载:')
  console.log('  - diagnoseSync("/home/user/apps") - 诊断特定路径')
  console.log('  - forceSync("/home/user/apps") - 强制同步特定路径')
  console.log('  - healthCheck() - 完整健康检查')
}
