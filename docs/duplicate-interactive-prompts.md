# 重复的交互式提示框问题

## 问题描述

代码中存在两个独立的交互式提示框实现，它们监听不同的事件，可能导致混淆和重复显示。

## 两个实现的对比

### 1. ChatArea 中的实现 ✅ (保留)

**位置：** `src/apps/ai-chat/components/ChatArea.tsx`

**监听事件：** `ai-builder:interactive-prompt`

**触发来源：** `systemTools.ts` 中的 `run_command` 工具

**特点：**
- 全局级别的交互式提示处理
- 通过 `webcontainer:input` 事件发送用户输入
- 使用 `InteractivePromptDialog` 组件
- 适用于所有聊天模式

**代码：**
```typescript
// ChatArea.tsx
useEffect(() => {
    const handler = (e: CustomEvent) => {
        const { cmd, prompt, output } = e.detail;
        setInteractivePrompt({
            isOpen: true,
            prompt,
            output,
            cmd
        });
    };
    window.addEventListener('ai-builder:interactive-prompt', handler as EventListener);
    return () => window.removeEventListener('ai-builder:interactive-prompt', handler as EventListener);
}, []);
```

### 2. BuilderTimeline 中的实现 ❌ (已删除)

**位置：** `src/apps/ai-chat/components/chat/BuilderTimeline.tsx`

**监听事件：** `webcontainer:interactive-prompt`

**触发来源：** 未找到触发源（遗留代码）

**问题：**
- 监听的事件从未被触发
- 与 ChatArea 的实现重复
- 可能导致混淆和维护困难

## 修复内容

### 已删除的代码

从 `BuilderTimeline.tsx` 中删除了以下内容：

1. **状态定义：**
```typescript
const [interactivePrompt, setInteractivePrompt] = useState<{
    isOpen: boolean;
    prompt: string;
    output: string;
    process?: any;
}>({ isOpen: false, prompt: '', output: '' });
```

2. **事件监听器：**
```typescript
useEffect(() => {
    const handler = (e: CustomEvent) => {
        const { output, process } = e.detail;
        const lines = output.split('\n');
        const promptLine = lines.find((line: string) => 
            line.includes('?') || line.toLowerCase().includes('(y/n)')
        );
        
        setInteractivePrompt({
            isOpen: true,
            prompt: promptLine || '请选择一个选项',
            output,
            process
        });
    };

    window.addEventListener('webcontainer:interactive-prompt', handler as EventListener);
    return () => window.removeEventListener('webcontainer:interactive-prompt', handler as EventListener);
}, []);
```

3. **处理函数：**
```typescript
const handlePromptResponse = (response: string) => {
    if (interactivePrompt.process?.input) {
        const writer = interactivePrompt.process.input.getWriter();
        writer.write(`${response}\n`);
        writer.releaseLock();
    }
    setInteractivePrompt({ isOpen: false, prompt: '', output: '' });
};

const handlePromptCancel = () => {
    if (interactivePrompt.process) {
        interactivePrompt.process.kill();
    }
    setInteractivePrompt({ isOpen: false, prompt: '', output: '' });
};
```

4. **JSX 组件：**
```typescript
<InteractivePromptDialog
    isOpen={interactivePrompt.isOpen}
    prompt={interactivePrompt.prompt}
    output={interactivePrompt.output}
    onResponse={handlePromptResponse}
    onCancel={handlePromptCancel}
/>
```

5. **Import 语句：**
```typescript
import { InteractivePromptDialog } from './InteractivePromptDialog';
```

## 当前架构

### 统一的交互式提示流程

```
用户执行命令
    ↓
systemTools.ts (run_command)
    ↓
检测交互式提示
    ↓
触发 'ai-builder:interactive-prompt' 事件
    ↓
ChatArea.tsx 监听并显示对话框
    ↓
用户选择/输入
    ↓
触发 'webcontainer:input' 事件
    ↓
useWebContainerStore.ts 接收输入
    ↓
写入 WebContainer stdin
```

### 优势

1. **单一职责：** 只有一个地方处理交互式提示
2. **全局覆盖：** 适用于所有聊天模式（Chat、Control、Builder）
3. **易于维护：** 只需要维护一套代码
4. **避免冲突：** 不会出现多个对话框同时显示的问题
5. **清晰的事件流：** 事件触发和监听关系明确

## BuilderTimeline 保留的功能

BuilderTimeline 仍然保留了以下功能：

1. **内联交互式输入：** 在时间线中显示的简化输入框
   - 监听 `ai-builder:interactive-prompt` 事件
   - 设置 `waitingForInput` 状态
   - 显示箭头键和输入框
   - 用于快速响应，不需要弹出对话框

2. **命令输出流式显示：** 实时显示命令执行输出

这些功能与 ChatArea 的全局对话框是互补的，不是重复的。

## 验证步骤

修复后，测试以下场景：

1. ✅ 在 Chat 模式执行交互式命令 → 显示全局对话框
2. ✅ 在 Control 模式执行交互式命令 → 显示全局对话框
3. ✅ 在 Builder 模式执行交互式命令 → 显示全局对话框
4. ✅ 确保只显示一个对话框
5. ✅ 用户输入能正确发送到 WebContainer
6. ✅ BuilderTimeline 的内联输入仍然工作

## 相关文件

- ✅ `src/apps/ai-chat/components/ChatArea.tsx` - 主要实现（保留）
- ✅ `src/apps/ai-chat/components/chat/BuilderTimeline.tsx` - 删除重复代码
- ✅ `src/apps/ai-chat/utils/systemTools.ts` - 事件触发（已优化）
- ✅ `src/os/kernel/useWebContainerStore.ts` - 输入处理
- ✅ `src/apps/ai-chat/components/chat/InteractivePromptDialog.tsx` - UI 组件（已优化）

## 总结

通过删除 BuilderTimeline 中的重复实现，我们：
- 消除了代码重复
- 避免了潜在的冲突
- 简化了维护工作
- 统一了用户体验
- 保持了清晰的架构
