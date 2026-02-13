/**
 * 统一日志工具
 * 开发环境显示所有日志，生产环境只显示错误和警告
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(...args)
  },
  
  error: (...args: any[]) => {
    console.error(...args)
  }
}
