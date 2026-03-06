/**
 * 自动修复同步问题
 */

import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { SYSTEM_PATHS } from '@/os/config/paths'

/**
 * 一键修复所有同步问题
 */
export async function autoFix() {
  console.log('\n🔧 自动修复开始...')
  console.log('='.repeat(60))
  
  const { files, getNodeByPath } = useFileSystemStore.getState()
  const { instance } = useWebContainerStore.getState()
  
  if (!instance) {
    console.error('❌ WebContainer 未启动，无法修复')
    return false
  }
  
  const userNode = getNodeByPath(SYSTEM_PATHS.USER)
  if (!userNode) {
    console.error('❌ 用户目录不存在')
    return false
  }
  
  console.log('✅ 环境检查通过')
  console.log('\n🔄 开始递归同步...\n')
  
  let created = { folders: 0, files: 0 }
  let errors = 0
  
  const syncNode = async (nodeId: string, wcPath: string = '', depth: number = 0) => {
    const children = Object.values(files).filter(f => f.parentId === nodeId)
    const indent = '  '.repeat(depth)
    
    for (const child of children) {
      const childWCPath = wcPath ? `${wcPath}/${child.name}` : child.name
      
      try {
        if (child.type === 'folder') {
          // 确保文件夹存在
          try {
            await instance.fs.readdir(childWCPath)
          } catch {
            await instance.fs.mkdir(childWCPath, { recursive: true })
            console.log(`${indent}📁 + ${childWCPath}`)
            created.folders++
          }
          // 递归处理子项
          await syncNode(child.id, childWCPath, depth + 1)
        } else {
          // 确保文件存在
          try {
            await instance.fs.readFile(childWCPath)
          } catch {
            const content = await useFileSystemStore.getState().readFileContent(child.id)
            // 确保父目录存在
            const parentPath = childWCPath.split('/').slice(0, -1).join('/')
            if (parentPath) {
              await instance.fs.mkdir(parentPath, { recursive: true })
            }
            await instance.fs.writeFile(childWCPath, content)
            console.log(`${indent}📄 + ${childWCPath}`)
            created.files++
          }
        }
      } catch (e) {
        console.error(`${indent}❌ ${childWCPath}:`, e)
        errors++
      }
    }
  }
  
  await syncNode(userNode.id)
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 修复结果:')
  console.log(`   创建文件夹: ${created.folders}`)
  console.log(`   创建文件: ${created.files}`)
  console.log(`   错误: ${errors}`)
  
  if (created.folders === 0 && created.files === 0) {
    console.log('\n✅ 所有内容已同步，无需修复')
  } else {
    console.log(`\n✅ 修复完成！创建了 ${created.folders + created.files} 个项目`)
  }
  
  if (errors > 0) {
    console.log(`\n⚠️ 有 ${errors} 个错误，请检查日志`)
  }
  
  console.log('\n💡 现在可以在终端中执行 ls 查看结果')
  console.log('='.repeat(60))
  
  return errors === 0
}

/**
 * 快速验证修复结果
 */
export async function verifyFix() {
  console.log('\n✓ 验证修复结果...')
  
  const { instance } = useWebContainerStore.getState()
  if (!instance) {
    console.error('❌ WebContainer 未启动')
    return
  }
  
  try {
    const entries = await instance.fs.readdir('/', { withFileTypes: true })
    console.log(`\n📂 根目录内容 (${entries.length} 项):`)
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subEntries = await instance.fs.readdir(entry.name, { withFileTypes: true })
        console.log(`  📁 ${entry.name}/ (${subEntries.length} 项)`)
      } else {
        console.log(`  📄 ${entry.name}`)
      }
    }
    
    console.log('\n✅ 验证完成')
  } catch (e) {
    console.error('❌ 验证失败:', e)
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).autoFix = autoFix;
  (window as any).verifyFix = verifyFix;
  
  console.log('🚀 自动修复工具已加载:')
  console.log('  - autoFix() - 一键修复所有同步问题')
  console.log('  - verifyFix() - 验证修复结果')
}
