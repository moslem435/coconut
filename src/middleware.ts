/**
 * @fileoverview Next.js 中间件 - 全局请求处理与安全策略
 * 
 * 功能：
 * - 内容安全策略(CSP)动态配置与管理
 * - 安全响应头设置(XSS防护、内容类型嗅探防护等)
 * - 跨域隔离策略配置(COOP/COEP)以支持WebContainer
 * 
 * 设计决策：
 * - 使用Cookie存储允许的域名，实现运行时动态更新CSP
 * - 移除X-Frame-Options以支持WebContainer iframe嵌入
 * - 设置Cross-Origin-Isolation以启用SharedArrayBuffer
 * 
 * @author yume
 * @created 2026-03-02
 * @lastModified 2026-03-12
 * @module src/middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_CSP_CONFIG, CSP_COOKIE_NAME } from './os/config/csp'

/**
 * Next.js 中间件处理函数
 * 
 * 为什么使用中间件而非页面级配置：
 * - 中间件可以在请求到达页面之前处理所有路由
 * - 支持动态读取Cookie并调整CSP策略
 * - 统一处理所有安全头部，避免重复配置
 * 
 * @param request - Next.js 请求对象
 * @returns 带有安全头部的响应对象
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // 深拷贝默认CSP配置，避免修改原始配置
    // 为什么使用JSON序列化：简单可靠的深拷贝方式，配置对象只包含可序列化数据
    const cspConfig = JSON.parse(JSON.stringify(DEFAULT_CSP_CONFIG))
    
    // 从Cookie读取用户允许的域名列表
    // 为什么使用Cookie：允许运行时动态扩展CSP，支持用户添加可信域名
    const allowedDomainsCookie = request.cookies.get(CSP_COOKIE_NAME)
    if (allowedDomainsCookie) {
        try {
            const allowedDomains = decodeURIComponent(allowedDomainsCookie.value).split(',').filter(Boolean)
            
            // 将允许的域名添加到相关CSP指令
            // 为什么只添加这三个指令：frame-src(iframe嵌入)、img-src(图片加载)、connect-src(fetch/XHR)是WebContainer最常用的权限
            if (allowedDomains.length > 0) {
                // frame-src: 控制iframe嵌入来源
                cspConfig['frame-src'].push(...allowedDomains)
                // img-src: 控制图片加载来源
                cspConfig['img-src'].push(...allowedDomains)
                // connect-src: 控制fetch/XHR请求来源
                cspConfig['connect-src'].push(...allowedDomains)
            }
        } catch (e) {
            // 解析失败时记录错误但不中断请求处理
            console.error('Middleware: Failed to parse allowed domains', e)
        }
    }
    
    // 构建CSP策略字符串
    // 格式：directive value1 value2; directive2 value3...
    const cspString = Object.entries(cspConfig)
        .map(([key, values]) => {
            // @ts-ignore - values类型已知为字符串数组
            return `${key} ${values.join(' ')}`
        })
        .join('; ')
        
    // 设置CSP响应头
    response.headers.set('Content-Security-Policy', cspString)
    
    // 基础安全响应头配置
    // X-Content-Type-Options: 防止浏览器MIME类型嗅探，减少XSS风险
    response.headers.set('X-Content-Type-Options', 'nosniff')
    // X-Frame-Options已移除：WebContainer需要在iframe中运行，设置DENY会阻止功能
    // response.headers.set('X-Frame-Options', 'DENY')
    // X-XSS-Protection: 启用浏览器XSS过滤器(现代浏览器已弃用，但作为纵深防御保留)
    response.headers.set('X-XSS-Protection', '1; mode=block')
    // Referrer-Policy: 控制Referrer信息泄露，平衡功能与隐私
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Permissions-Policy: 限制敏感API访问，遵循最小权限原则
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // 跨域隔离配置 - WebContainer必需
    // 为什么需要：WebContainer使用SharedArrayBuffer实现多线程，需要Cross-Origin-Isolation
    // COOP + COEP组合启用crossOriginIsolated状态
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return response
}

/**
 * 中间件配置
 * 
 * matcher规则说明：
 * - 匹配所有请求路径
 * - 排除_next/static(静态文件)、_next/image(图片优化)、favicon.ico
 * - 为什么排除：这些静态资源不需要CSP和安全头部，提高性能
 */
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
