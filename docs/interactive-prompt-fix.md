# 交互式命令提示框问题修复

## 问题描述

当 AI 助手执行需要用户交互的命令（如 `npm create vite@latest`）时，交互式提示框没有显示，导致命令挂起等待用户输入。

### 症状
- 执行 `npm create vite@latest` 时显示 "Use Vite 8 beta (Experimental)?" 提示
- 但交互式对话框没有弹出
- 命令超时或一直等待

## 根本原因

### 1. 交互式提示检测逻辑不够健壮

原有的检测条件：
```typescript
if ((hasPromptPattern && hasOptions) || isTextInputPrompt || (hasPromptPattern && output.length < 500))
```

问题：
- 输出流是分批到达的，可能在检测时还不完整
- Vite 使用特殊字符（如 `◆`, `│`）作为提示标记，原有逻辑未覆盖
- 检测时机可能过早或过晚

### 2. 输出流的时序问题

Vite 的输出格式：
```
◆ Use Vite 8 beta (Experimental)?:
│ ○ Yes
│ ● No
```

这些内容分多次到达 `dispatchOutput` 回调：
- 第一次可能只收到 "◆ Use Vite 8 beta"
- 第二次才收到选项标记
- 导致检测失败或重复触发

### 3. 缺少重复触发保护

没有机制防止同一个命令多次触发交互式提示事件。

## 解决方案

### 1. 改进检测逻辑

**增强的提示模式检测：**
```typescript
const hasPromptPattern = 
    fullOutputTrimmed.endsWith('?') || 
    fullOutputTrimmed.endsWith(':') || 
    fullOutputTrimmed.endsWith('?:') || // Vite 使用 "?:"
    fullOutputTrimmed.endsWith('>') ||
    fullOutputLower.includes('(y/n)') ||
    fullOutputLower.includes('[y/n]') ||
    fullOutputLower.includes('◆'); // Vite 的提示字符
```

**增强的选项标记检测：**
```typescript
const hasOptions = /[○●•❯›│]\s+/g.test(output);
```

**新增内容长度检查：**
```typescript
const hasReasonableContent = output.length > 50 && output.length < 2000;
```

### 2. 添加重复触发保护

```typescript
let hasDispatchedPrompt = false;

const dispatchOutput = (data: string) => {
    // ... 处理输出
    
    if (hasDispatchedPrompt) return; // 防止重复触发
    
    if (shouldTriggerPrompt) {
        hasDispatchedPrompt = true;
        // 触发事件
    }
};
```

### 3. 改进选项解析

更新 `parseOptions` 函数以识别 Vite 的格式：
```typescript
// 匹配 "│ ○ Yes" 或 "○ Yes" 格式
const match = line.match(/[│\s]*[○●•❯›]\s+(.+)/);
```

### 4. 更智能的触发条件

```typescript
if ((hasPromptPattern && hasOptions) || 
    isTextInputPrompt || 
    (hasPromptPattern && hasReasonableContent)) {
    // 触发交互式提示
}
```

## 修改的文件

1. **src/apps/ai-chat/utils/systemTools.ts**
   - 改进交互式提示检测逻辑
   - 添加重复触发保护
   - 增强模式匹配规则

2. **src/apps/ai-chat/components/chat/InteractivePromptDialog.tsx**
   - 改进 `parseOptions` 函数
   - 支持 Vite 的选项格式

## 测试建议

测试以下命令以验证修复：

1. **Vite 项目创建：**
   ```bash
   npm create vite@latest
   ```
   应该显示 "Use Vite 8 beta?" 提示框

2. **交互式初始化：**
   ```bash
   npm init
   ```
   应该显示项目名称输入框

3. **Yes/No 提示：**
   ```bash
   npm install -g some-package
   ```
   如果需要确认，应该显示 Yes/No 选项

## 预期行为

- ✅ 交互式提示立即显示对话框
- ✅ 正确解析选项（Yes/No 或其他选项）
- ✅ 用户选择后正确发送到 stdin
- ✅ 不会重复触发同一个提示
- ✅ 支持文本输入和选项选择两种模式

## 注意事项

1. **非交互式优先：** AI 助手应该优先使用非交互式命令（如 `npm init -y`）
2. **超时处理：** 交互式命令仍有 60 秒超时限制
3. **调试日志：** 保留了详细的控制台日志以便调试

## 相关问题

- WebContainer stdin 输入处理
- 命令输出流式处理
- ANSI 转义序列清理
