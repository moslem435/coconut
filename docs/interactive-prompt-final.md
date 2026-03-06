# 交互式提示框最终方案

## 用户需求

保留 BuilderTimeline 中的内联交互式输入框（如图所示），删除 ChatArea 中的全屏遮罩对话框。

## 最终实现

### 保留：BuilderTimeline 内联交互框 ✅

**位置：** `src/apps/ai-chat/components/chat/BuilderTimeline.tsx`

**特点：**
- 内联在时间线中，不遮挡其他内容
- 显示在命令输出下方
- 提供箭头键导航按钮（Up/Down/Enter）
- 支持文本输入
- 轻量级，不打断用户流程

**UI 组件：**
```
┌─────────────────────────────────────────┐
│ INTERACTIVE PROMPT          [↑][↓][↵]  │
├─────────────────────────────────────────┤
│ [Type answer or use arrow keys...]      │
│                              [Send]      │
├─────────────────────────────────────────┤
│ Tip: Use Up/Down arrows to navigate    │
│ Tip: Avoid interactive commands...      │
└─────────────────────────────────────────┘
```

**工作流程：**
```
命令执行 (run_command)
    ↓
systemTools.ts 检测交互式提示
    ↓
触发 'ai-builder:interactive-prompt' 事件
    ↓
BuilderTimeline 监听事件
    ↓
设置 waitingForInput = true
    ↓
显示内联输入框
    ↓
用户输入/使用箭头键
    ↓
触发 'webcontainer:input' 事件
    ↓
WebContainer 接收输入
```

**代码实现：**
```typescript
// 监听交互式提示事件
const promptHandler = (e: CustomEvent) => {
    if (e.detail?.cmd === args.cmd) {
        setWaitingForInput(true);
        setIsExpanded(true); // 展开输出区域
    }
};

window.addEventListener('ai-builder:interactive-prompt', promptHandler as EventListener);

// 发送输入
const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    window.dispatchEvent(new CustomEvent('webcontainer:input', {
        detail: { cmd: args.cmd, input: promptInput + '\n' }
    }));

    setPromptInput('');
    setWaitingForInput(false);
};

// 发送箭头键
const sendRawInput = (input: string) => {
    window.dispatchEvent(new CustomEvent('webcontainer:input', {
        detail: { cmd: args.cmd, input: input }
    }));
};
```

### 删除：ChatArea 全屏对话框 ❌

**位置：** `src/apps/ai-chat/components/ChatArea.tsx`

**已删除内容：**
1. 交互式提示状态定义
2. `ai-builder:interactive-prompt` 事件监听器
3. 处理函数（`handleInteractiveResponse`, `handleInteractiveCancel`）
4. `InteractivePromptDialog` 组件实例
5. 相关 import 语句

**删除原因：**
- 全屏遮罩会打断用户流程
- 与内联输入框功能重复
- 用户更喜欢轻量级的内联交互

## 架构对比

### 之前（两个实现）

```
ChatArea (全屏对话框)
    ↓
监听 ai-builder:interactive-prompt
    ↓
显示全屏遮罩对话框
    ↓
用户选择 → 发送到 WebContainer

BuilderTimeline (内联输入)
    ↓
监听 ai-builder:interactive-prompt
    ↓
显示内联输入框
    ↓
用户输入 → 发送到 WebContainer
```

**问题：** 两个实现同时存在，可能显示两个输入框

### 现在（单一实现）

```
BuilderTimeline (内联输入)
    ↓
监听 ai-builder:interactive-prompt
    ↓
显示内联输入框
    ↓
用户输入/箭头键 → 发送到 WebContainer
```

**优势：**
- 只有一个输入框
- 不遮挡其他内容
- 更好的用户体验
- 代码更简洁

## 交互式提示检测

**位置：** `src/apps/ai-chat/utils/systemTools.ts`

**检测逻辑：**（已优化）
```typescript
// 检测 Vite 等工具的交互式提示
const hasPromptPattern = 
    fullOutputTrimmed.endsWith('?') || 
    fullOutputTrimmed.endsWith(':') || 
    fullOutputTrimmed.endsWith('?:') || // Vite
    fullOutputLower.includes('◆'); // Vite 提示字符

const hasOptions = /[○●•❯›│]\s+/g.test(output);
const hasReasonableContent = output.length > 50 && output.length < 2000;

// 触发事件（只触发一次）
if ((hasPromptPattern && hasOptions) || 
    isTextInputPrompt || 
    (hasPromptPattern && hasReasonableContent)) {
    
    hasDispatchedPrompt = true;
    window.dispatchEvent(new CustomEvent('ai-builder:interactive-prompt', { 
        detail: { cmd: args.cmd, prompt: promptLine, output: output } 
    }));
}
```

## 用户体验

### 内联交互框的优势

1. **不打断流程：** 用户可以继续查看聊天历史
2. **上下文清晰：** 输入框就在命令输出下方
3. **轻量级：** 不需要关闭对话框
4. **快速响应：** 箭头键快速导航菜单
5. **视觉连贯：** 与时间线风格一致

### 使用示例

**场景：** 执行 `npm create vite@latest . -- --template vue`

```
┌─ Build Process ─────────────────────────┐
│ ✓ create_directory /home/user/myapp    │
│ ⟳ run_command npm create vite@latest   │
│                                          │
│   > npx                                  │
│   > create-vite . --template vue        │
│   ◆ Use Vite 8 beta (Experimental)?:   │
│   │ ○ Yes                               │
│   │ ● No                                │
│                                          │
│   ┌─ INTERACTIVE PROMPT ──────[↑][↓][↵]│
│   │ [Type answer or use arrow keys...] │
│   │                          [Send]     │
│   └─────────────────────────────────────│
└──────────────────────────────────────────┘
```

用户可以：
1. 点击箭头键按钮导航选项
2. 直接输入文本
3. 按 Enter 确认
4. 继续查看上方的聊天内容

## 修改的文件

1. **src/apps/ai-chat/components/ChatArea.tsx** ❌
   - 删除交互式提示状态
   - 删除事件监听器
   - 删除处理函数
   - 删除 InteractivePromptDialog 组件
   - 删除相关 import

2. **src/apps/ai-chat/components/chat/BuilderTimeline.tsx** ✅
   - 保留内联交互式输入实现
   - 监听 `ai-builder:interactive-prompt` 事件
   - 显示内联输入框
   - 支持箭头键和文本输入

3. **src/apps/ai-chat/utils/systemTools.ts** ✅
   - 保留增强的检测逻辑
   - 触发 `ai-builder:interactive-prompt` 事件
   - 防止重复触发

4. **src/apps/ai-chat/components/chat/InteractivePromptDialog.tsx** 
   - 不再使用（可以删除或保留备用）

## 测试验证

### 功能测试

1. ✅ 执行 `npm create vite@latest` 显示内联输入框
2. ✅ 箭头键按钮正常工作
3. ✅ 文本输入正常工作
4. ✅ Enter 键确认正常
5. ✅ 输入发送到 WebContainer
6. ✅ 命令继续执行

### 视觉测试

1. ✅ 输入框显示在命令输出下方
2. ✅ 不遮挡聊天内容
3. ✅ 与时间线风格一致
4. ✅ 响应式布局正常

### 边界测试

1. ✅ 快速连续的交互式提示
2. ✅ 长输出内容
3. ✅ 多个命令同时执行
4. ✅ 取消命令（Ctrl+C）

## 注意事项

1. **只在 Builder 模式显示：** 内联输入框只在 BuilderTimeline 中显示，即只在 Builder 模式的时间线中可见

2. **非交互式优先：** AI 助手仍应优先使用非交互式命令
   - `npm init -y` 而不是 `npm init`
   - `npm create vite@latest my-app -- --template vue` 而不是交互式选择

3. **超时处理：** 交互式命令仍有 60 秒超时限制

4. **调试日志：** 保留控制台日志以便调试
   - `[SystemTools] ✅ Interactive prompt detected!`
   - `[BuilderTimeline] Waiting for input`

## 总结

通过删除全屏对话框，保留内联输入框，我们实现了：

✅ 更好的用户体验（不打断流程）
✅ 更清晰的视觉层次（输入框在输出下方）
✅ 更简洁的代码（单一实现）
✅ 更快的响应（箭头键导航）
✅ 更好的上下文（与命令输出关联）

这是一个更优雅、更实用的解决方案。
