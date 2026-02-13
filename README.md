# Web OS - Interactive Desktop Environment

一个基于 Next.js 的现代化 Web 操作系统模拟器，提供完整的桌面环境、文件系统、进程管理和应用生态。

## ✨ 特性

- 🖥️ **完整的桌面环境** - 窗口管理、任务栏、开始菜单
- 📁 **虚拟文件系统** - 支持 OPFS、本地文件夹挂载
- 💻 **内置应用** - VS Code 编辑器、文件管理器、终端、天气等
- 🎨 **主题系统** - 亮色/暗色主题，透明度控制
- 🌐 **国际化** - 多语言支持
- 🔒 **安全加固** - 路径验证、CSP 策略、文件类型限制
- ⚡ **性能优化** - LRU 缓存、虚拟化窗口层级、按需加载

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

访问 [http://localhost:3000](http://localhost:3000)

## 📚 文档

- [快速开始指南](./QUICK_START.md) - 项目概览和开发指南
- [优化计划](./OPTIMIZATION_PLAN.md) - 性能优化和架构改进
- [更新日志](./CHANGELOG.md) - 版本更新记录
- [安全指南](./SECURITY.md) - 安全最佳实践

## 🏗️ 技术栈

- **框架**: Next.js 16 + React 19
- **状态管理**: Zustand
- **样式**: Tailwind CSS 4
- **编辑器**: Monaco Editor
- **3D**: Three.js + React Three Fiber
- **终端**: xterm.js
- **容器**: WebContainer API

## 📦 项目结构

```
src/
├── app/          # Next.js App Router
├── apps/         # 应用程序
├── os/           # 操作系统核心
│   ├── kernel/   # 内核（状态管理）
│   ├── system/   # 系统组件
│   ├── services/ # 系统服务
│   └── security/ # 安全模块
├── components/   # 共享组件
└── types/        # TypeScript 类型
```

## 🎯 核心功能

### 事件总线
```typescript
import { eventBus } from '@/os/kernel/EventBus'

eventBus.on('fs:file:created', (data) => {
  console.log('File created:', data.path)
})
```

### 文件系统
```typescript
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'

const { createItem, readFileContent } = useFileSystemStore()
await createItem('parent-id', 'test.txt', 'file', 'content')
```

### 窗口管理
```typescript
import { useWindowStore } from '@/os/kernel/useWindowStore'

const { openWindow } = useWindowStore()
openWindow('id', 'Title', Component, Icon, { width: 800 })
```

## 🛠️ 开发工具

### 调试工具（开发环境）
- `window.__eventBus` - 事件总线
- `window.__fileCache` - 文件缓存
- `window.__perfMonitor` - 性能监控

### 快捷键
- `Ctrl+Shift+P` - 性能报告

## 📝 创建新应用

1. 复制应用模板
2. 实现应用逻辑
3. 配置 manifest
4. 注册应用

详见 [快速开始指南](./QUICK_START.md#创建新应用)

## 🔒 安全性

- 路径遍历攻击防护
- 文件类型白名单
- 增强的 CSP 策略
- 文件大小限制

详见 [安全指南](./SECURITY.md)

## ⚡ 性能优化

- LRU 文件内容缓存（50MB）
- 虚拟化窗口层级
- Monaco Editor 按需加载
- 事件总线解耦依赖

详见 [优化计划](./OPTIMIZATION_PLAN.md)

## 🤝 贡献

欢迎贡献！请查看 [快速开始指南](./QUICK_START.md) 了解开发流程。

## 📄 许可证

MIT License

---

**最近更新**: 2026-02-13 - 完成全面优化，新增事件总线、文件缓存、路径验证等功能
