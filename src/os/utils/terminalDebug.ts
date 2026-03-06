/**
 * 终端调试工具
 * 用于诊断 WebContainer 和终端初始化问题
 */

export const checkWebContainerSupport = () => {
  const checks = {
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
    webAssembly: typeof WebAssembly !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
  }

  console.group('🔍 WebContainer 环境检查')
  console.table(checks)
  
  if (!checks.sharedArrayBuffer) {
    console.error('❌ SharedArrayBuffer 不可用')
    console.info('💡 需要设置 COOP/COEP 头：')
    console.info('   Cross-Origin-Embedder-Policy: require-corp')
    console.info('   Cross-Origin-Opener-Policy: same-origin')
  }
  
  if (!checks.crossOriginIsolated) {
    console.error('❌ 跨域隔离未启用')
    console.info('💡 检查响应头是否正确设置')
  }
  
  if (!checks.webAssembly) {
    console.error('❌ WebAssembly 不支持')
  }
  
  console.groupEnd()
  
  return checks
}

export const logWebContainerState = (state: {
  hasInstance: boolean
  isBooting: boolean
  error: any
  isReady: boolean
}) => {
  console.group('📊 WebContainer 状态')
  console.log('实例存在:', state.hasInstance ? '✅' : '❌')
  console.log('正在启动:', state.isBooting ? '⏳' : '✅')
  console.log('终端就绪:', state.isReady ? '✅' : '❌')
  if (state.error) {
    console.error('错误:', state.error)
  }
  console.groupEnd()
}
