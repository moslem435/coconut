/**
 * @fileoverview v86 x86 模拟器资源下载脚本
 * 
 * 功能：
 * - 从远程下载v86所需的WebAssembly和固件文件
 * - 支持HTTP重定向
 * - 已存在的文件跳过下载
 * 
 * 下载文件列表：
 * - libv86.js: v86 JavaScript主库
 * - v86.wasm: WebAssembly模块
 * - seabios.bin: SeaBIOS固件
 * - vgabios.bin: VGA BIOS固件
 * 
 * @author yume
 * @created 2026-02-15
 * @lastModified 2026-02-15
 * @module scripts/setup-v86
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// ES Module环境下获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** v86资源输出目录 */
const targetDir = path.join(__dirname, '../public/v86');

// 目标目录不存在则创建
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

/**
 * 需要下载的文件列表
 * 
 * 为什么需要这些文件：
 * - libv86.js: v86虎拟器的主要JavaScript入口
 * - v86.wasm: WASM模块，提供高性能 x86 模拟
 * - seabios.bin: 模拟 PC BIOS，必需
 * - vgabios.bin: 模拟 VGA BIOS，必需
 */
const files = [
    { name: 'libv86.js', url: 'https://unpkg.com/v86/build/libv86.js' },
    { name: 'v86.wasm', url: 'https://unpkg.com/v86/build/v86.wasm' },
    { name: 'seabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin' },
    { name: 'vgabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin' },
];

/**
 * 下载单个文件
 * 
 * 为什么使用 https.get 而非 fetch：
 * - Node.js脚本中 fetch API 尚不稳定
 * - https.get 提供流式下载，适合大文件
 * - 支持自动重定向处理
 * 
 * @param file - 文件信息对象
 */
async function downloadFile(file) {
    const filePath = path.join(targetDir, file.name);
    // 已存在则跳过，避免重复下载浪费带宽
    if (fs.existsSync(filePath)) {
        console.log(`${file.name} 已存在，跳过。`);
        return;
    }

    const fileStream = fs.createWriteStream(filePath);

    console.log(`正在下载 ${file.name} 自 ${file.url}...`);

    return new Promise((resolve, reject) => {
        /**
         * 处理HTTP响应，支持重定向
         * 为什么需要处理重定向：unpkg等CDN会返回302重定向到具体节点
         */
        const handleResponse = (response) => {
             if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                let redirectUrl = response.headers.location;
                // 处理相对路径的重定向
                if (!redirectUrl.startsWith('http')) {
                    const originalUrl = new URL(file.url);
                    redirectUrl = new URL(redirectUrl, originalUrl.origin).toString();
                }
                
                console.log(`重定向到 ${redirectUrl}...`);
                https.get(redirectUrl, handleResponse).on('error', (err) => {
                     // 下载失败时删除残留文件
                     fs.unlink(filePath, () => {});
                     reject(err);
                });
            } else if (response.statusCode === 200) {
                // 流式写入文件
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`${file.name} 下载完成。`);
                    resolve();
                });
            } else {
                // 下载失败，删除不完整的文件
                fs.unlink(filePath, () => {});
                reject(new Error(`下载 ${file.name} 失败: HTTP ${response.statusCode}`));
            }
        };

        https.get(file.url, handleResponse).on('error', (err) => {
            // 网络错误时删除残留文件
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

// 主函数 - 顺序下载所有文件
// 为什么逆序而非并行：避免并发连接对CDN造成压力
(async () => {
    try {
        for (const file of files) {
            await downloadFile(file);
        }
        console.log('所有v86文件下载完成。');
    } catch (error) {
        console.error('下载文件时出错:', error);
        process.exit(1);
    }
})();
