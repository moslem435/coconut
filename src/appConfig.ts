/**
 * @fileoverview 全局应用配置中心
 * 
 * 设计原则：
 * - 单一数据源：所有应用级常量集中管理
 * - 修改版本/作者信息时，只需更新此文件，无需修改组件代码
 * - 使用as const确保类型安全，防止意外修改
 * 
 * @author yume
 * @created 2026-02-27
 * @lastModified 2026-02-28
 * @module src/appConfig
 */

/**
 * 应用全局配置对象
 * 
 * 为什么使用常量对象而非分散的变量：
 * - 便于集中管理和维护
 * - 支持类型推断和自动补全
 * - 方便在About页面等地方统一展示
 */
export const APP_CONFIG = {
    version: 'v1.0.0',
    codename: 'Coco-Alpha',
    buildDate: '2026.02.05',
    repoUrl: 'https://gitee.com/moslem435/myos',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    inspirationUrl: 'https://github.com/HeyPuter/puter',

    /**
     * 作者信息配置
     * 
     * 为什么集中配置：
     * - About页面名片信息从此处读取，实现单一数据源
     * - 支持中英文双语展示
     * 
     * 头像URL说明：
     * - 使用wsrv.nl图片代理服务
     * - 原因：解决COEP(Cross-Origin-Embedder-Policy)跨域限制
     * - 原Gitee头像直接访问会被COEP阻止，通过代理服务绕过
     */
    author: {
        /** 作者英文名 */
        name: 'yume',
        /** 职位英文 */
        title: 'Full Stack Developer',
        /** 职位中文 */
        titleZh: '全栈开发者',
        /** 简介英文 */
        bio: 'Passionate about building immersive web experiences with modern technologies.',
        /** 简介中文 */
        bioZh: '热衷于用现代 Web 技术打造沉浸式交互体验。',
        /** 头像URL - 通过wsrv.nl代理解决COEP跨域限制 */
        avatarUrl: 'https://wsrv.nl/?url=foruda.gitee.com/avatar/1762504808968754349/5701624_moslem435_1762504808.png!avatar200&w=200&output=webp',
        /** Gitee主页链接 */
        giteeUrl: 'https://gitee.com/moslem435',
    },
} as const
