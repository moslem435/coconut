/**
 * @fileoverview Monaco 编辑器资源拷贝脚本
 * 
 * 功能：
 * - 将node_modules中的Monaco Editor静态文件拷贝到public目录
 * - 在npm postinstall时自动运行
 * 
 * 为什么需要此脚本：
 * - Monaco Editor需要其静态资源(JS worker文件)可以通过URL访问
 * - 直接从公共URL加载，避免打包过大
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-02-13
 * @module scripts/copy-monaco
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module环境下获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Monaco Editor在node_modules中的源路径 */
const sourceDir = path.join(__dirname, '../node_modules/monaco-editor/min/vs');
/** 浏览器可访问的目标路径 */
const targetDir = path.join(__dirname, '../public/monaco-editor/vs');

/**
 * 递归拷贝目录
 * 
 * 为什么逐归而非直接拷贝：
 * - 需要拷贝完整的目录结构，包括子目录
 * - 同时自动创建不存在的层级目录
 * 
 * @param src - 源路径
 * @param dest - 目标路径
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    // 目标目录不存在则创建
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    // 递归拷贝每个子项
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // 直接拷贝文件
    fs.copyFileSync(src, dest);
  }
}

console.log('正在拷贝Monaco Editor文件到public目录...');
copyRecursiveSync(sourceDir, targetDir);
console.log('Monaco Editor文件拷贝完成!');
