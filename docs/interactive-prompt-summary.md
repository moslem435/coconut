# 交互式提示框问题修复总结

## 问题概述

AI 助手在执行需要用户交互的命令（如 `npm create vite@latest`）时，交互式提示框没有正确显示，导致命令挂起。

## 发现的问题

### 1. 交互式提示检测不够健壮

**问题：**
- 原有检测逻辑无法识别 Vite 使用的特殊字符（`◆`, `│`, `?:`）
- 输出流分批到达时，检测时机不准确
- 缺少对输出长度的合理判断

**影响：**
- Vite 的 "Use Vite 8 beta?" 提示无法被检测
- 其他使用特殊格式的交互式命令也可能失败

### 2. 重复的交互式提示框实现

**问题：**
- `ChatArea.tsx` 和 `BuilderTimeline.tsx` 中都有交互式提示实现
- 监听不同的事件（`ai-builder:interactive-prompt` vs `webcontainer:interactive-prompt`）
- BuilderTimeline 的实现从未被触发（遗留代码）

**影响：**
- 代码重复，维护困难
- 可能导致混淆和潜在的冲突

### 3. 缺少重复触发保护

**问题：**
- 没有机制防止同一命令多次触发交互式提示

**影响：**
- 可能导致多个对话框同时弹出

## 修复内容

### 1. 增强交互式提示检测 (`systemTools.ts`)

#### 改进的检测逻辑

```typescript
// 添加 Vite 特殊字符识别
const hasPromptPattern = 
    fullOutputTrimmed.endsWith('?') || 
    fullOutputTrimmed.endsWith(':') || 
    fullOutputTrimmed.endsWith('?:') || // Vite 使用 "?:"
    fullOutputTrimmed.endsWith('>') ||
    fullOutputLower.includes('◆'); // Vite 的提示字符

// 增强选项标记检测
const hasOptions = /[○●•❯›│]\s+/g.test(output);

// 添加内容长度检查
const hasReasonableContent = output.length > 50 && output.length < 2000;
```

#### 添加重复触发保护

```typescript
let hasDispatchedPrompt = false;

const dispatchOutput = (data: string) => {
    if (hasDispatchedPrompt) return; // 防止重复触发
    
    if (shouldTriggerPrompt) {
        hasDispatchedPrompt = true;
        // 触发事件
    }
};
```

#### 更智能的触发条件

```typescript
if ((hasPromptPattern && hasOptions) || 
    isTextInputPrompt || 
    (hasPromptPattern && hasReasonableContent)) {
    // 触发交互式提示
}
```

### 2. 改进选项解析 (`InteractivePromptDialog.tsx`)

```typescript
// 支持 Vite 的 "│ ○ Yes" 格式
const match = line.match(/[│\s]*[○●•❯›]\s+(.+)/);

// 过滤装饰性字符
if (option && !option.match(/^[─│┌┐└┘├┤┬┴┼]+$/)) {
    options.push(option);
}
```

### 3. 删除重复实现 (`BuilderTimeline.tsx`)

删除了以下内容：
- 交互式提示状态定义
- `webcontainer:interactive-prompt` 事件监听器
- 处理函数（`handlePromptResponse`, `handlePromptCancel`）
- `InteractivePromptDialog` 组件实例
- 相关 import 语句

保留了：
- 内联交互式输入（时间线中的简化输入框）
- 命令输出流式显示

## 最终架构

### 统一的交互式提示流程

```
用户执行命令
    ↓
systemTools.ts (run_command)
    ↓
检测交互式提示（增强的检测逻辑）
    ↓
触发 'ai-builder:interactive-prompt' 事件（只触发一次）
    ↓
ChatArea.tsx 监听并显示全局对话框
    ↓
用户选择/输入
    ↓
触发 'webcontainer:input' 事件
    ↓
useWebContainerStore.ts 接收输入
    ↓
写入 WebContainer stdin
```

### 架构优势

1. **单一职责：** 只有一个地方处理全局交互式提示
2. **全局覆盖：** 适用于所有聊天模式（Chat、Control、Builder）
3. **易于维护：** 只需要维护一套代码
4. **避免冲突：** 不会出现多个对话框同时显示
5. **清晰的事件流：** 事件触发和监听关系明确
6. **健壮的检测：** 支持各种交互式命令格式

## 修改的文件

1. **src/apps/ai-chat/utils/systemTools.ts**
   - ✅ 增强交互式提示检测逻辑
   - ✅ 添加 Vite 特殊字符识别
   - ✅ 添加重复触发保护
   - ✅ 改进触发条件

2. **src/apps/ai-chat/components/chat/InteractivePromptDialog.tsx**
   - ✅ 改进 `parseOptions` 函数
   - ✅ 支持 Vite 的选项格式
   - ✅ 过滤装饰性字符

3. **src/apps/ai-chat/components/chat/BuilderTimeline.tsx**
   - ✅ 删除重复的交互式提示实现
   - ✅ 保留内联输入功能
   - ✅ 清理不需要的 import

## 测试建议

### 基本功能测试

1. **Vite 项目创建：**
   ```bash
   npm create vite@latest
   ```
   ✅ 应该显示 "Use Vite 8 beta?" 提示框

2. **交互式初始化：**
   ```bash
   npm init
   ```
   ✅ 应该显示项目名称输入框

3. **Yes/No 提示：**
   ```bash
   npm install -g some-package
   ```
   ✅ 如果需要确认，应该显示 Yes/No 选项

### 模式测试

1. ✅ Chat 模式执行交互式命令
2. ✅ Control 模式执行交互式命令
3. ✅ Builder 模式执行交互式命令

### 边界情况测试

1. ✅ 快速连续执行多个交互式命令
2. ✅ 取消交互式提示
3. ✅ 超时处理
4. ✅ 错误处理

## 预期行为

- ✅ 交互式提示立即显示对话框
- ✅ 正确解析选项（Yes/No 或其他选项）
- ✅ 支持文本输入和选项选择两种模式
- ✅ 用户选择后正确发送到 stdin
- ✅ 不会重复触发同一个提示
- ✅ 只显示一个对话框（全局）
- ✅ 支持 Vite、npm、npx 等各种工具的交互式提示

## 注意事项

1. **非交互式优先：** AI 助手应该优先使用非交互式命令
   - 使用 `npm init -y` 而不是 `npm init`
   - 使用 `npm create vite@latest my-app -- --template vue` 而不是交互式选择

2. **超时处理：** 交互式命令仍有 60 秒超时限制

3. **调试日志：** 保留了详细的控制台日志以便调试
   - `[SystemTools] Prompt detection check:` - 检测过程
   - `[SystemTools] ✅ Interactive prompt detected!` - 成功检测
   - `[ChatArea] ✅ Interactive prompt event received:` - 事件接收

## 相关文档

- `docs/interactive-prompt-fix.md` - 交互式提示检测修复详情
- `docs/duplicate-interactive-prompts.md` - 重复实现问题详情

## 总结

通过这次修复，我们：
1. ✅ 解决了 Vite 等工具的交互式提示无法显示的问题
2. ✅ 消除了代码重复，统一了实现
3. ✅ 提高了检测的健壮性和准确性
4. ✅ 改善了用户体验
5. ✅ 简化了代码维护

现在，AI 助手可以正确处理各种交互式命令，用户可以通过友好的对话框进行选择和输入。
