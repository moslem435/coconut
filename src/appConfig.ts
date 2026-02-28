/**
 * 全局应用配置
 * 修改版本信息或作者信息时，只需在此处更新，无需修改组件代码。
 */
export const APP_CONFIG = {
    version: 'v1.0.0',
    codename: 'Coco-Alpha',
    buildDate: '2026.02.05',
    repoUrl: 'https://gitee.com/moslem435/myos',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    inspirationUrl: 'https://github.com/HeyPuter/puter',

    /** 作者信息 —— 修改此处即可更新 About 页面名片 */
    author: {
        name: 'yume',
        title: 'Full Stack Developer',
        titleZh: '全栈开发者',
        bio: 'Passionate about building immersive web experiences with modern technologies.',
        bioZh: '热衷于用现代 Web 技术打造沉浸式交互体验。',
        // 通过 wsrv.nl 代理访问头像，解决 COEP 跨域限制
        avatarUrl: 'https://wsrv.nl/?url=foruda.gitee.com/avatar/1762504808968754349/5701624_moslem435_1762504808.png!avatar200&w=200&output=webp',
        giteeUrl: 'https://gitee.com/moslem435',
    },
} as const
