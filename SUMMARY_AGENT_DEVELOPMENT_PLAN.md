# Summary Agent — 完整开发计划

## 文档信息

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **创建日期** | 2026-02-20 |
| **基于** | 用户需求讨论 + 现有代码库分析 |
| **目标** | 为 MiniSwarm Designer 添加实时 Summary Agent，在 pipeline 执行过程中用简洁文字概括每个 agent 的生成内容，并在右侧 sidebar 中实时展示 |

---

## 1. 需求概述

### 1.1 核心功能

| 功能 | 说明 |
|------|------|
| **Summary Agent 实时概括** | pipeline 执行过程中，每个 agent 完成后用 LLM 生成简洁摘要 |
| **超链接展示** | `file_write` 和 `webpage_build_preview_tool` 调用时生成可点击超链接 |
| **右侧 Summary 窗口** | 在 ContextViewer 和 GeneratedPagesSidebar 之间新增 Summary 展示区 |
| **Prompt Sticker** | Summary 窗口标题栏提供可编辑的系统提示词入口 |
| **输出持久化** | Summary 完成后保存到 `/outputs` (saved outputs) |

### 1.2 已确认的设计决策

| 决策项 | 确认方案 |
|--------|---------|
| **触发时机** | 每个 agent 完成后调用一次 summary LLM |
| **输入设计** | summary prompt 包含：1) 已完成的总结内容; 2) 当前 agent 输出 → 保证连贯性 |
| **执行模式** | 严格单线程队列，A agent 未总结完时 B agent 的总结任务 pending |
| **使用模型** | 与 pipeline agents 相同模型，无需单独设置 |
| **file_write 超链接** | 点击后弹出文件内容预览窗口，复用 FileManager 的 `previewFile` 模式 |
| **窗口位置** | ContextViewer 和 GeneratedPagesSidebar 之间，LogViewer 调小，Summary 调大 |
| **输出保存** | pipeline 完成后像其他 agent 一样保存到 `/outputs` 目录 |
| **Prompt Sticker** | 在 Summary 窗口标题栏旁边，类似 GeneratedPagesSidebar 的 Clear 按钮位置 |

---

## 2. 现状分析

### 2.1 将复用的现有模块

| 模块 | 文件 | 复用方式 |
|------|------|---------|
| LLM 调用 | `src/core/llm/openrouter.ts` | 直接调用 `callLLM()` 生成摘要 |
| 文件预览弹窗 | `src/store/index.ts` → `previewFile` + `FileManager.tsx` 渲染 | Summary 中 file_write 超链接点击后设置 `previewFile` 触发同一弹窗 |
| PromptEditorModal | `src/components/workspace/TaskInput.tsx` 内定义 | 提取为独立组件后复用于 Summary Prompt 编辑 |
| Context 持久化 | `src/core/engine/pipeline.ts` → `persistOutputs()` | Summary 输出写入 `context` 后随 pipeline 完成时自动保存 |
| Generated Pages | `src/store/index.ts` → `generatedPages` | Summary 中 webpage 超链接直接引用已有 `page.url` |

### 2.2 需要新建的模块

| 新建文件 | 说明 |
|---------|------|
| `src/core/summary/summary.ts` | Summary Agent 核心逻辑（LLM 调用 + 队列管理 + 超链接提取） |
| `src/components/workspace/SummarySidebar.tsx` | Summary 展示 UI 组件 |
| `src/components/common/PromptEditorModal.tsx` | 从 TaskInput.tsx 提取的通用 Prompt 编辑弹窗 |

### 2.3 当前右侧 sidebar 布局

```
当前布局（Workspace.tsx 右侧面板）:
┌─────────────────────────┐
│ ExecutionControls        │  ← 固定高度
├─────────────────────────┤
│ LogViewer               │  ← flex-1（占据所有剩余空间）
├─────────────────────────┤
│ ContextViewer           │  ← max-h-48（最大 192px）
├─────────────────────────┤
│ GeneratedPagesSidebar   │  ← 自然高度
└─────────────────────────┘

目标布局:
┌─────────────────────────┐
│ ExecutionControls        │  ← 固定高度
├─────────────────────────┤
│ LogViewer               │  ← max-h-32（调小，限制最大高度）
├─────────────────────────┤
│ ContextViewer           │  ← max-h-48（不变）
├─────────────────────────┤
│ ★ SummarySidebar        │  ← flex-1（占据剩余空间，调大）
├─────────────────────────┤
│ GeneratedPagesSidebar   │  ← 自然高度
└─────────────────────────┘
```

---

## 3. 核心设计

### 3.1 Summary Agent 执行架构

```
Pipeline 执行流程:
                                              ┌──────────────────────┐
Agent A 完成 ──→ 触发 onSummaryRequest ──────→│                      │
                                              │  SummaryAgent 队列    │
Agent B 完成 ──→ 触发 onSummaryRequest ──┐    │  (严格 FIFO 单线程)   │
                                         │    │                      │
Agent C 完成 ──→ 触发 onSummaryRequest ──┤    │  处理顺序:            │
                                         │    │  1. 总结 Agent A      │
                                         └───→│  2. 总结 Agent B      │
                                              │  3. 总结 Agent C      │
                                              └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │  每次调用 LLM 输入:    │
                                              │  1. 已有摘要（历史）    │
                                              │  2. 当前 agent 输出    │
                                              │  3. 当前 agent tool 信息│
                                              └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │  输出: SummaryEntry    │
                                              │  - agentName           │
                                              │  - summary text        │
                                              │  - links[] (超链接)    │
                                              │  - timestamp           │
                                              └──────────────────────┘
```

### 3.2 单线程队列实现

```typescript
// 核心设计 — 严格单线程队列
class SummaryAgent {
  private queue: SummaryTask[] = [];
  private processing = false;
  private entries: SummaryEntry[] = [];  // 已完成的摘要（作为下次 LLM 调用的历史输入）

  // 外部调用：将任务入队
  enqueue(task: SummaryTask): void {
    this.queue.push(task);
    this.processNext();  // 尝试启动处理
  }

  // 内部：严格顺序处理
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const task = this.queue.shift()!;
    try {
      const entry = await this.generateSummary(task);
      this.entries.push(entry);
      task.onComplete(entry);  // 通知 UI 更新
    } catch {
      // 静默降级，不影响 pipeline
    }

    this.processing = false;
    this.processNext();  // 处理队列中下一个
  }
}
```

**关键保证**：
- `processing` 标志确保同一时间只有一个 LLM 调用在进行
- 队列 FIFO 顺序与 agent 完成顺序一致
- 即使 agent 并行执行完成，summary 仍然严格串行

### 3.3 LLM Prompt 设计

```
Summary Agent System Prompt:

你是一个执行摘要助手。你的任务是用简洁的文字概括 AI Agent 的工作内容和产出。

规则：
1. 每个摘要限制在 1-3 句话以内，保持极度简洁
2. 如果 agent 使用了 file_write 工具创建了文件，用 [FILE:文件路径] 标记
3. 如果 agent 使用了 webpage_build_preview_tool 生成了网页，用 [PAGE:页面标题] 标记
4. 基于已有的总结历史保持连贯性，避免重复内容
5. 用中文回答

---

User Prompt（每次调用）:

## 已有总结:
{之前所有 agent 的摘要，按时间顺序拼接}

## 当前 Agent 信息:
- 名称: {agentName}
- 角色: {agentRole}
- 使用的工具调用: {toolCalls 列表}

## Agent 输出内容:
{agent 的完整输出文本}

请概括该 agent 的工作内容。
```

### 3.4 超链接提取与渲染

```
超链接处理流程:

1. Agent 执行时收集所有 tool_calls 信息
2. Summary LLM 输出中包含标记: [FILE:path] 和 [PAGE:title]
3. 前端解析标记，替换为可点击超链接:

   [FILE:report.md]
      │
      └──→ 点击触发:
            1. opfsService.readFile("report.md")
            2. setPreviewFile({ name, content, source: 'workspace' })
            3. FileManager 中已有的预览弹窗自动打开

   [PAGE:Dashboard]
      │
      └──→ 点击触发:
            1. 从 generatedPages 中查找匹配的 page
            2. window.open(page.url, '_blank')
            3. 在新标签页中打开预览
```

### 3.5 数据类型设计

```typescript
// 新增类型 — src/types/index.ts

/** Summary Agent 的单条摘要 */
export interface SummaryEntry {
  id: string;                    // uuid
  agentId: string;               // 被概括的 agent ID
  agentName: string;             // 被概括的 agent 名称
  summary: string;               // 摘要文本（含 [FILE:] [PAGE:] 标记）
  links: SummaryLink[];          // 解析后的超链接列表
  timestamp: number;             // 生成时间
}

/** Summary 中的超链接 */
export interface SummaryLink {
  type: 'file' | 'page';        // 链接类型
  path: string;                  // 文件路径 或 页面标题
  url?: string;                  // 页面 URL（仅 type='page' 时有值）
  label: string;                 // 显示文本
}

/** Summary Agent 队列任务 */
export interface SummaryTask {
  agentId: string;
  agentName: string;
  agentRole: string;
  agentOutput: string;           // agent 的完整输出
  toolCalls: ToolCallInfo[];     // agent 执行期间的所有 tool 调用
  onComplete: (entry: SummaryEntry) => void;
}

/** Tool 调用信息（用于 summary 输入） */
export interface ToolCallInfo {
  name: string;                  // tool 名称
  arguments: Record<string, unknown>;  // tool 参数
  result?: string;               // tool 返回结果（截断）
}
```

---

## 4. 分阶段开发计划

### 阶段 1：类型定义与 PromptEditorModal 提取

**目标**：定义新类型，将 `PromptEditorModal` 从 TaskInput.tsx 提取为通用组件。

**修改文件**：`src/types/index.ts`

```typescript
// 新增以下类型（追加到文件末尾）
export interface SummaryEntry {
  id: string;
  agentId: string;
  agentName: string;
  summary: string;
  links: SummaryLink[];
  timestamp: number;
}

export interface SummaryLink {
  type: 'file' | 'page';
  path: string;
  url?: string;
  label: string;
}

export interface ToolCallInfo {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}
```

**新建文件**：`src/components/common/PromptEditorModal.tsx`

```typescript
// 从 TaskInput.tsx 中提取 PromptEditorModal 函数组件
// 保持完全相同的 props 接口和 UI 样式
// TaskInput.tsx 中原有的引用改为 import 此文件
export default function PromptEditorModal({
  title, value, defaultValue, onSave, onClose,
}: { ... }) {
  // 与现有实现完全一致
}
```

**修改文件**：`src/components/workspace/TaskInput.tsx`

```typescript
// 移除内部 PromptEditorModal 定义
// 替换为:
import PromptEditorModal from '../common/PromptEditorModal';
```

**预估工时**：1 小时

---

### 阶段 2：Summary Agent 核心逻辑

**目标**：实现 Summary Agent 的 LLM 调用、队列管理和超链接解析。

**新建文件**：`src/core/summary/summary.ts`

```typescript
import { callLLM } from '../llm/openrouter';
import { v4 as uuidv4 } from 'uuid';
import type { SummaryEntry, SummaryLink, ToolCallInfo } from '../../types';

// 默认系统提示词
export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `你是一个执行摘要助手...`;

interface SummaryTask {
  agentId: string;
  agentName: string;
  agentRole: string;
  agentOutput: string;
  toolCalls: ToolCallInfo[];
  onComplete: (entry: SummaryEntry) => void;
  onError?: (error: Error) => void;
}

export class SummaryAgent {
  private queue: SummaryTask[] = [];
  private processing = false;
  private entries: SummaryEntry[] = [];    // 历史摘要
  private apiKey: string;
  private model: string;
  private systemPrompt: string;
  private aborted = false;

  constructor(apiKey: string, model: string, systemPrompt?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.systemPrompt = systemPrompt || DEFAULT_SUMMARY_SYSTEM_PROMPT;
  }

  /** 将 summary 任务入队 */
  enqueue(task: SummaryTask): void {
    if (this.aborted) return;
    this.queue.push(task);
    this.processNext();
  }

  /** 终止所有待处理任务 */
  abort(): void {
    this.aborted = true;
    this.queue = [];
  }

  /** 重置状态 */
  reset(): void {
    this.aborted = false;
    this.queue = [];
    this.entries = [];
    this.processing = false;
  }

  /** 获取已完成的所有摘要（用于持久化） */
  getEntries(): SummaryEntry[] {
    return [...this.entries];
  }

  /** 获取合并后的完整摘要文本（用于持久化到 outputs） */
  getFullSummaryText(): string {
    return this.entries
      .map((e) => `### ${e.agentName}\n${e.summary}`)
      .join('\n\n');
  }

  /** 严格单线程处理 */
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.aborted) return;
    this.processing = true;

    const task = this.queue.shift()!;
    try {
      const entry = await this.generateSummary(task);
      this.entries.push(entry);
      task.onComplete(entry);
    } catch (err) {
      task.onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    this.processing = false;
    if (!this.aborted) {
      this.processNext();  // 处理下一个
    }
  }

  /** 调用 LLM 生成摘要 */
  private async generateSummary(task: SummaryTask): Promise<SummaryEntry> {
    // 构建历史摘要
    const previousSummaries = this.entries.length > 0
      ? this.entries.map((e) => `- **${e.agentName}**: ${e.summary}`).join('\n')
      : '(暂无)';

    // 构建 tool 调用信息
    const toolCallsText = task.toolCalls.length > 0
      ? task.toolCalls.map((tc) =>
          `- ${tc.name}(${JSON.stringify(tc.arguments)})`
        ).join('\n')
      : '(无工具调用)';

    const userPrompt = `## 已有总结:\n${previousSummaries}\n\n## 当前 Agent 信息:\n- 名称: ${task.agentName}\n- 角色: ${task.agentRole}\n- 使用的工具调用:\n${toolCallsText}\n\n## Agent 输出内容:\n${task.agentOutput.slice(0, 3000)}\n\n请概括该 agent 的工作内容。`;

    const response = await callLLM({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: this.model,
      apiKey: this.apiKey,
      temperature: 0.3,     // 低温度保证摘要稳定
      maxTokens: 256,        // 摘要不需要太长
    });

    const summary = response.content;

    // 解析超链接标记
    const links = this.parseLinks(summary, task.toolCalls);

    return {
      id: uuidv4(),
      agentId: task.agentId,
      agentName: task.agentName,
      summary,
      links,
      timestamp: Date.now(),
    };
  }

  /** 从摘要文本和 tool 调用中提取超链接 */
  private parseLinks(summary: string, toolCalls: ToolCallInfo[]): SummaryLink[] {
    const links: SummaryLink[] = [];

    // 从 [FILE:path] 标记提取
    const fileMatches = summary.matchAll(/\[FILE:([^\]]+)\]/g);
    for (const match of fileMatches) {
      links.push({
        type: 'file',
        path: match[1].trim(),
        label: match[1].trim(),
      });
    }

    // 从 [PAGE:title] 标记提取
    const pageMatches = summary.matchAll(/\[PAGE:([^\]]+)\]/g);
    for (const match of pageMatches) {
      links.push({
        type: 'page',
        path: match[1].trim(),
        label: match[1].trim(),
      });
    }

    // 兜底：如果 LLM 没有按格式输出标记，从 tool 调用中补充
    if (links.length === 0) {
      for (const tc of toolCalls) {
        if (tc.name === 'file_write' && tc.arguments.path) {
          const path = String(tc.arguments.path);
          if (!links.some((l) => l.type === 'file' && l.path === path)) {
            links.push({ type: 'file', path, label: path });
          }
        }
        if (tc.name === 'webpage_build_preview_tool') {
          const title = String(tc.arguments.title || tc.arguments.entryPath || 'Preview');
          if (!links.some((l) => l.type === 'page' && l.label === title)) {
            links.push({ type: 'page', path: title, label: title });
          }
        }
      }
    }

    return links;
  }
}
```

**预估工时**：3-4 小时

---

### 阶段 3：Zustand Store 扩展

**目标**：在 store 中添加 Summary 相关的状态和 actions。

**修改文件**：`src/store/index.ts`

```typescript
// 新增状态字段（在 previewFile 附近）
summaryEntries: SummaryEntry[];
addSummaryEntry: (entry: SummaryEntry) => void;
clearSummaryEntries: () => void;

// 新增系统提示词字段（在 refineSystemPrompt 附近）
summarySystemPrompt: string;
setSummarySystemPrompt: (prompt: string) => void;

// 实现
summaryEntries: [],
addSummaryEntry: (entry) => set((s) => {
  s.summaryEntries = [...s.summaryEntries, entry];
}),
clearSummaryEntries: () => set((s) => {
  s.summaryEntries = [];
}),
summarySystemPrompt: '',
setSummarySystemPrompt: (prompt) => set((s) => {
  s.summarySystemPrompt = prompt;
}),
```

**预估工时**：0.5 小时

---

### 阶段 4：Pipeline Engine 集成

**目标**：在 PipelineEngine 中集成 Summary Agent，每个 agent 完成后触发 summary 任务。

**修改文件**：`src/core/engine/pipeline.ts`

```typescript
// 1. 新增 EngineCallbacks 字段
export interface EngineCallbacks {
  // ... 现有回调不变
  onSummaryGenerated?: (entry: SummaryEntry) => void;  // 新增
}

// 2. PipelineEngine 新增 summaryAgent 字段
export class PipelineEngine {
  // ... 现有字段
  private summaryAgent: SummaryAgent | null = null;
  private collectedToolCalls = new Map<string, ToolCallInfo[]>();  // 按 nodeId 收集

  // 3. 在 execute() 中初始化 SummaryAgent
  async execute(design: SwarmDesign): Promise<void> {
    // ... 现有初始化代码

    // 初始化 Summary Agent
    this.summaryAgent = new SummaryAgent(
      this.apiKey,
      this.model,
      this.summarySystemPrompt  // 从构造参数传入
    );
    this.collectedToolCalls.clear();

    // ... 现有批次执行循环

    // Pipeline 完成后，等待 Summary Agent 处理完所有队列
    await this.waitForSummaryComplete();

    // 将 Summary 写入 context（用于 persistOutputs 保存）
    if (this.summaryAgent && this.summaryAgent.getEntries().length > 0) {
      this.setContext('SummaryAgent(__summary__)', {
        value: this.summaryAgent.getFullSummaryText(),
        producedBy: '__summary__',
        timestamp: Date.now(),
        type: 'final',
      });
    }

    // 自动持久化
    if (!this.aborted) {
      await this.persistOutputs(design);
    }
  }

  // 4. 在 executeNode() 中收集 tool 调用信息
  async executeNode(node: AgentNode, design: SwarmDesign): Promise<void> {
    // 初始化此 node 的 tool 调用收集器
    this.collectedToolCalls.set(node.id, []);

    // ... 现有 ReAct 循环中，每次 tool 调用后追加:
    // (在 for (const tc of response.toolCalls) 循环内)
    this.collectedToolCalls.get(node.id)?.push({
      name: tc.name,
      arguments: tc.arguments,
      result: toolResult.slice(0, 200),  // 截断防止过长
    });

    // ... agent 完成后，触发 summary 任务
    // (在 this.callbacks.onNodeStatusChange(node.id, 'completed') 之后)
    this.enqueueSummary(node, result);
  }

  // 5. 将 summary 任务入队
  private enqueueSummary(node: AgentNode, agentOutput: string): void {
    if (!this.summaryAgent) return;

    this.summaryAgent.enqueue({
      agentId: node.id,
      agentName: node.name,
      agentRole: node.role,
      agentOutput,
      toolCalls: this.collectedToolCalls.get(node.id) || [],
      onComplete: (entry) => {
        this.callbacks.onSummaryGenerated?.(entry);
      },
    });
  }

  // 6. 等待 summary 队列全部完成
  private waitForSummaryComplete(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.summaryAgent || this.summaryAgent.isIdle()) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}
```

**修改文件**：`src/components/workspace/ExecutionControls.tsx`

```typescript
// 在 engine callbacks 中新增:
onSummaryGenerated: (entry) => {
  addSummaryEntry(entry);
},

// 在 handleStart 开始时新增清理:
clearSummaryEntries();
```

**预估工时**：3-4 小时

---

### 阶段 5：SummarySidebar UI 组件

**目标**：创建 Summary 展示组件，支持实时更新、超链接点击和 Prompt 编辑。

**新建文件**：`src/components/workspace/SummarySidebar.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { opfsService } from '../../core/storage/opfs';
import { DEFAULT_SUMMARY_SYSTEM_PROMPT } from '../../core/summary/summary';
import PromptEditorModal from '../common/PromptEditorModal';

export default function SummarySidebar() {
  const summaryEntries = useAppStore((s) => s.summaryEntries);
  const generatedPages = useAppStore((s) => s.generatedPages);
  const summarySystemPrompt = useAppStore((s) => s.summarySystemPrompt);
  const setSummarySystemPrompt = useAppStore((s) => s.setSummarySystemPrompt);
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新内容到来时自动滚到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summaryEntries]);

  // 处理 file 超链接点击
  const handleFileClick = async (path: string) => {
    try {
      const content = await opfsService.readFile(path);
      const name = path.split('/').pop() || path;
      setPreviewFile({ name, content, source: 'workspace' });
    } catch {
      // 文件读取失败
    }
  };

  // 处理 page 超链接点击
  const handlePageClick = (label: string) => {
    const page = generatedPages.find(
      (p) => p.title === label || p.entryPath === label
    );
    if (page) {
      window.open(page.url, '_blank');
    }
  };

  // 渲染摘要文本（替换 [FILE:] 和 [PAGE:] 为可点击链接）
  const renderSummaryText = (entry: SummaryEntry) => {
    // ... 解析 [FILE:path] 和 [PAGE:title] 标记
    // 替换为 <a> 或 <button> 元素
    // file → onClick: handleFileClick(path)
    // page → onClick: handlePageClick(title)
  };

  return (
    <div className="border-t border-slate-700 flex flex-col flex-1 overflow-hidden">
      {/* 标题栏：标题 + Prompt Sticker + Clear */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">
          📋 Summary ({summaryEntries.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromptEditor(true)}
            className="text-xs text-slate-400 hover:text-white ..."
            title="View/edit summary system prompt"
          >
            📝 Prompt
          </button>
        </div>
      </div>

      {/* 摘要内容区 — 可滚动 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-2">
        {summaryEntries.length === 0 ? (
          <p className="text-xs text-slate-600">Pipeline 运行后将显示实时摘要</p>
        ) : (
          <div className="space-y-2">
            {summaryEntries.map((entry) => (
              <div key={entry.id} className="text-xs">
                <span className="text-purple-400 font-medium">
                  {entry.agentName}:
                </span>
                <span className="text-slate-300 ml-1">
                  {renderSummaryText(entry)}
                </span>
                {/* 超链接列表 */}
                {entry.links.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.links.map((link, i) => (
                      <button
                        key={i}
                        onClick={() => link.type === 'file'
                          ? handleFileClick(link.path)
                          : handlePageClick(link.label)
                        }
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                      >
                        {link.type === 'file' ? '📄' : '🌐'} {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt 编辑弹窗 */}
      {showPromptEditor && (
        <PromptEditorModal
          title="Summary System Prompt"
          value={summarySystemPrompt}
          defaultValue={DEFAULT_SUMMARY_SYSTEM_PROMPT}
          onSave={setSummarySystemPrompt}
          onClose={() => setShowPromptEditor(false)}
        />
      )}
    </div>
  );
}
```

**预估工时**：2-3 小时

---

### 阶段 6：Workspace 布局调整与集成

**目标**：修改右侧 sidebar 布局，集成 SummarySidebar 组件。

**修改文件**：`src/components/workspace/Workspace.tsx`

```typescript
// 1. 新增 import
import SummarySidebar from './SummarySidebar';

// 2. 修改右侧面板布局
{!rightPanelCollapsed && (
  <div className="flex-1 flex flex-col overflow-hidden">
    <ExecutionControls />
    {/* LogViewer — 调小 */}
    <div className="border-t border-slate-700 max-h-32 overflow-hidden">
      <LogViewer />
    </div>
    {/* ContextViewer — 不变 */}
    <div className="border-t border-slate-700 max-h-48 overflow-y-auto">
      <ContextViewer />
    </div>
    {/* ★ SummarySidebar — 新增，flex-1 占据剩余空间 */}
    <SummarySidebar />
    {/* GeneratedPagesSidebar — 不变 */}
    <GeneratedPagesSidebar />
  </div>
)}
```

**关键布局变化**：
- `LogViewer`: `flex-1 overflow-hidden` → `max-h-32 overflow-hidden`（限制最大高度 128px）
- `SummarySidebar`: `flex-1 overflow-hidden`（占据所有剩余空间）
- 其余组件保持不变

**预估工时**：0.5 小时

---

### 阶段 7：Summary 输出持久化

**目标**：Pipeline 完成时将 Summary 内容保存到 `/outputs` 目录。

**修改文件**：`src/core/engine/pipeline.ts`

已在阶段 4 中覆盖。核心逻辑：
1. 在 `execute()` 中，pipeline 执行完毕 + summary 队列清空后
2. 将 `summaryAgent.getFullSummaryText()` 写入 `context` 
3. `persistOutputs()` 会自动将其保存为 `/outputs/SummaryAgent.md`

**行为验证**：
- 执行 pipeline 后，`/outputs` 目录中应出现 `SummaryAgent.md`
- 文件内容为所有 agent 摘要的拼接文本
- 在 FileManager 的 "Saved Outputs" 面板中可以看到并点击预览

**预估工时**：包含在阶段 4 中

---

## 5. 完整文件变更清单

### 新建文件

| 文件路径 | 阶段 | 说明 |
|---------|------|------|
| `src/core/summary/summary.ts` | 阶段 2 | Summary Agent 核心逻辑（LLM 调用、队列、解析） |
| `src/components/workspace/SummarySidebar.tsx` | 阶段 5 | Summary 展示 UI 组件 |
| `src/components/common/PromptEditorModal.tsx` | 阶段 1 | 通用 Prompt 编辑弹窗（从 TaskInput 提取） |

### 修改文件

| 文件路径 | 阶段 | 变更内容 |
|---------|------|---------|
| `src/types/index.ts` | 阶段 1 | 添加 `SummaryEntry`、`SummaryLink`、`ToolCallInfo` 类型 |
| `src/store/index.ts` | 阶段 3 | 添加 `summaryEntries`、`summarySystemPrompt` 状态和 actions |
| `src/core/engine/pipeline.ts` | 阶段 4 | 集成 SummaryAgent、收集 tool 调用、summary 入队、等待完成 |
| `src/components/workspace/ExecutionControls.tsx` | 阶段 4 | 传入 `onSummaryGenerated` 回调、清理 summaryEntries |
| `src/components/workspace/TaskInput.tsx` | 阶段 1 | 移除内部 PromptEditorModal，改为 import 通用组件 |
| `src/components/workspace/Workspace.tsx` | 阶段 6 | 集成 SummarySidebar、调整 LogViewer/Summary 高度 |

---

## 6. 依赖关系与执行顺序

```
阶段 1: 类型定义 + PromptEditorModal 提取
   │
   ├──→ 阶段 2: Summary Agent 核心逻辑（依赖阶段 1 的类型）
   │       │
   │       └──→ 阶段 4: Pipeline Engine 集成（依赖阶段 2 + 3）
   │               │
   │               └──→ 阶段 7: 输出持久化（已包含在阶段 4）
   │
   ├──→ 阶段 3: Store 扩展（依赖阶段 1 的类型）
   │
   └──→ 阶段 5: SummarySidebar UI（依赖阶段 1 + 2 + 3）
           │
           └──→ 阶段 6: Workspace 布局集成（依赖阶段 5）
```

**推荐开发顺序**：

1. **阶段 1** → 类型定义 + PromptEditorModal 提取（前置基础）
2. **阶段 3** → Store 扩展（独立，可早期完成）
3. **阶段 2** → Summary Agent 核心逻辑（依赖类型）
4. **阶段 4** → Pipeline Engine 集成（核心功能）
5. **阶段 5** → SummarySidebar UI（展示层）
6. **阶段 6** → Workspace 布局集成（收尾）

---

## 7. 风险与缓解策略

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **Summary LLM 调用失败** | 某个 agent 的摘要缺失 | `try/catch` 静默降级，pipeline 继续执行不受影响 |
| **Summary 队列堆积** | 并行 agent 大量完成，队列延迟 | 队列严格 FIFO，用户可见"正在总结..."状态；摘要 maxTokens 限制为 256 减少延迟 |
| **LLM 未按格式输出 [FILE:] 标记** | 超链接无法解析 | 兜底策略：从 `toolCalls` 中直接提取 file_write/webpage 路径作为补充链接 |
| **超链接指向已删除文件** | 点击后无法打开 | `handleFileClick` 中 `try/catch` 处理 OPFS 读取失败 |
| **Pipeline 中止时 Summary 仍在处理** | 资源浪费 | `engine.abort()` 时同步调用 `summaryAgent.abort()` 清空队列 |
| **Summary 增加 token 消耗** | 成本增加约 N×256 tokens（N=agent 数量） | 使用低温度(0.3) + 低 maxTokens(256)，每次摘要仅传入截断的 agent 输出(3000字) |

---

## 8. 工时估算汇总

| 阶段 | 内容 | 预估工时 | 累计 |
|------|------|---------|------|
| 阶段 1 | 类型定义 + PromptEditorModal 提取 | 1h | 1h |
| 阶段 2 | Summary Agent 核心逻辑 | 3-4h | 4-5h |
| 阶段 3 | Store 扩展 | 0.5h | 4.5-5.5h |
| 阶段 4 | Pipeline Engine 集成 | 3-4h | 7.5-9.5h |
| 阶段 5 | SummarySidebar UI | 2-3h | 9.5-12.5h |
| 阶段 6 | Workspace 布局调整 | 0.5h | 10-13h |
| **总计** | | **10-13 小时** | |

---

## 9. 验收标准

### 9.1 功能验收

- [ ] Pipeline 执行时，每个 agent 完成后在 Summary 窗口出现对应摘要
- [ ] 摘要内容简洁（1-3 句话）
- [ ] 当有多个 agent 并行完成时，摘要仍然按顺序逐个显示（单线程队列）
- [ ] 摘要内容包含连贯的上下文（后续摘要参考了之前的摘要）
- [ ] `file_write` 调用在摘要中显示为可点击超链接
- [ ] 点击 file 超链接后弹出文件内容预览窗口（与 FileManager 一致）
- [ ] `webpage_build_preview_tool` 调用在摘要中显示为可点击超链接
- [ ] 点击 page 超链接后在新标签页打开预览页面
- [ ] Summary 窗口新内容到来时自动滚到底部
- [ ] 📝 Prompt 按钮可以打开 Summary 系统提示词编辑弹窗
- [ ] 编辑保存后的提示词在下次 pipeline 执行时生效
- [ ] Reset 按钮恢复为默认提示词
- [ ] Pipeline 完成后 `/outputs/SummaryAgent.md` 包含完整摘要
- [ ] FileManager "Saved Outputs" 面板中可以看到并预览 SummaryAgent.md

### 9.2 布局验收

- [ ] Summary 窗口位于 ContextViewer 和 GeneratedPagesSidebar 之间
- [ ] LogViewer 高度被限制（`max-h-32`），Summary 窗口占据更多空间（`flex-1`）
- [ ] 右侧面板整体可滚动，各区域不互相挤压
- [ ] 面板折叠/展开后布局正常

### 9.3 异常场景验收

- [ ] Summary LLM 调用失败时 pipeline 继续正常执行
- [ ] Pipeline 中止时 summary 队列立即清空
- [ ] 超链接指向不存在的文件时点击不报错
- [ ] 重新执行 pipeline 时旧摘要被清空
