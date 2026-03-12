/**
 * @fileoverview 文件系统清单生成脚本
 * 
 * 功能：
 * - 扫描public目录下的指定文件夹
 * - 生成文件清单JSON，包含路径、名称、大小、修改时间
 * - 用于虚拟文件系统初始化
 * 
 * 使用方式：
 * - 构建时自动执行(npm run build/dev)
 * - 输出文件：public/fs-manifest.json
 * 
 * @author yume
 * @created 2026-03-04
 * @lastModified 2026-03-04
 * @module scripts/generate-fs-manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module环境下获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 公共资源目录路径 */
const PUBLIC_DIR = path.resolve(__dirname, '../public');
/** 输出文件路径 */
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'fs-manifest.json');

/**
 * 需要扫描的目录列表
 * 
 * 为什么只扫描这些目录：
 * - gallery: 图片库
 * - wallpapers: 壁纸资源
 * - icons: 图标资源
 * - sounds: 音效资源
 * - 这些是虚拟文件系统需要预加载的静态资源
 */
const INCLUDE_DIRS = ['gallery', 'wallpapers', 'icons', 'sounds'];

/**
 * 递归扫描目录，收集文件信息
 * 
 * @param dir - 要扫描的目录绝对路径
 * @param relativePath - 相对于PUBLIC_DIR的相对路径
 * @returns 文件信息数组
 */
function scanDirectory(dir, relativePath = '') {
    let results = [];
    
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        // Windows路径使用反斜杠，需要转换为正斜杠供 Web 使用
        const fileRelativePath = path.join(relativePath, file).split(path.sep).join('/');

        if (stat && stat.isDirectory()) {
             // 递归扫描子目录
             const subDirResults = scanDirectory(filePath, fileRelativePath);
             results = results.concat(subDirResults);
        } else {
            // 只收入文件（跳过目录）
            results.push({
                path: '/' + fileRelativePath, // 从根目录开始的绝对路径，如 /gallery/foo.jpg
                name: file,
                size: stat.size,
                mtime: Math.floor(stat.mtimeMs),
                type: 'file'
            });
        }
    });
    
    return results;
}

console.log('正在生成文件系统清单...');

/** 将所有包含目录的文件合并为一个列表 */
let manifest = [];

// 逐个扫描包含目录，合并结果
INCLUDE_DIRS.forEach(dirName => {
    const dirPath = path.join(PUBLIC_DIR, dirName);
    const files = scanDirectory(dirPath, dirName);
    manifest = manifest.concat(files);
});

// 确保输出目录存在
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 将清单写入JSON文件，小步长缰进为2空格
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

console.log(`清单已生成到 ${OUTPUT_FILE}，共 ${manifest.length} 条记录。`);
