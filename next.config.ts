/**
 * @fileoverview Next.js 主配置文件
 * 
 * 配置项说明：
 * - devIndicators: 关闭开发指示器(Dev 模式左下角的小图标)
 * - reactStrictMode: 开启React严格模式，帮助发现潜在问题
 * - compiler.removeConsole: 生产环境下移除console调用，减小资源浪费
 * 
 * 安全头部说明：
 * - CSP和安全头部已迁移到middleware.ts
 * - 原因：支持运行时动态配置(CSP域名白名单)
 * 
 * @author yume
 * @created 2026-02-02
 * @lastModified 2026-03-02
 * @module next.config
 */

import type { NextConfig } from "next";

/**
 * Next.js 配置对象
 * 
 * 为什么关闭devIndicators：
 * - 项目模拟操作系统界面，开发指示器与设计冲突
 * - 为什么开启reactStrictMode：提早发现副作用和过时API使用
 */
const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  compiler: {
    // 生产环境移除console调用，降低内容泄露风险并提升性能
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // CSP和安全头部已迁移到middleware.ts
  // 为什么移到middleware：支持基于Cookie动态更新CSP域名白名单
};

export default nextConfig;
