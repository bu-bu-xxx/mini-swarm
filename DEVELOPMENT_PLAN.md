# OPFS 工作区 + Agent Tool 系统 — 完整开发计划

## 文档信息

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **创建日期** | 2026-02-15 |
| **基于** | design.md v1.0 + 多轮设计讨论确认 |
| **目标** | 为 AutoSwarm Designer 添加 OPFS 虚拟文件系统、内置 Tool 实现、ReAct Agent 循环和文件管理 UI |

---

## 1. 现状分析

### 1.1 当前已实现的功能

| 模块 | 状态 | 关键文件 |
|------|------|---------|
| 初始化引导（Setup Page） | ✅ 已完成 | `src/components/setup/SetupPage.tsx` |
| OpenRouter LLM 客户端 | ✅ 已完成 | `src/core/llm/openrouter.ts` |
| 自然语言 → Swarm 自动设计 | ✅ 已完成 | `src/core/designer/designer.ts` |
| Pipeline 可视化编辑器（React Flow） | ✅ 已完成 | `src/components/pipeline/PipelineGraph.tsx` |
| Agent 配置抽屉（Skill/Tools/Mappings） | ✅ 已完成 | `src/components/pipeline/AgentDrawer.tsx` |
| Todo List 面板 | ✅ 已完成 | `src/components/todo/TodoList.tsx` |
| 执行控制（开始/暂停/停止） | ✅ 已完成 | `src/components/workspace/ExecutionControls.tsx` |
| Pipeline 引擎（并行批次执行） | ✅ 已完成 | `src/core/engine/pipeline.ts` |
| 实时日志查看器 | ✅ 已完成 | `src/components/logs/LogViewer.tsx` |
| Context 查看器 | ✅ 已完成 | `src/components/workspace/ContextViewer.tsx` |
| 设置抽屉（API Key/模型/MCP Server） | ✅ 已完成 | `src/components/settings/SettingsDrawer.tsx` |
| MCP Client 管理器 | ✅ 已完成 | `src/core/mcp/client.ts` |
| Zustand 状态管理 | ✅ 已完成 | `src/store/index.ts` |
| Swarm JSON 导入/导出 | ✅ 已完成 | `src/utils/index.ts` |

### 1.2 当前缺失的功能（本计划要实现的）

| 缺失功能 | 说明 | 影响 |
|---------|------|------|
| **OPFS 虚拟文件系统** | 项目仅用 localStorage 持久化设置。OPFS 完全未实现 | Agent 无法读写持久化文件 |
| **内置 Tool 实际执行** | `file_read`/`file_write` 仅作为名称存在于 UI 和 designer prompt 中，无实际执行逻辑 | Agent 声称有 tool 但无法真正调用 |
| **LLM Function Calling** | `callLLM()` 不支持 `tools` 参数，无法触发 tool_calls | Agent 只能单轮生成文本 |
| **ReAct 执行循环** | `executeNode()` 是单轮 LLM 调用，无法循环执行 tool → observe → reason | Agent 无法迭代式解决问题 |
| **Agent 参数配置** | `temperature: 0.7`、`maxTokens: 4096` 硬编码在 pipeline.ts 中 | 用户无法按需调整 |
| **文件管理 UI** | 左栏无文件浏览器 | 用户无法查看/管理工作区文件 |

### 1.3 当前存储架构

```
当前存储（实际实现）:
├── localStorage (key: 'autoswarm_settings')
│   └── AppSettings（API Key、模型选择、MCP 配置、setupComplete）
├── Zustand Store（内存）
│   ├── currentDesign: SwarmDesign（Swarm 设计数据）
│   ├── nodeStates: 节点执行状态
│   ├── logs: 执行日志
│   └── context: Agent 输出（ContextEntry）  ← 页面刷新即丢失
└── PipelineEngine.context（内存 Map）
    └── Agent 间数据传递  ← 页面刷新即丢失

计划中但未实现:
├── OPFS（虚拟文件系统）  ← 本计划实现
└── IndexedDB（设计历史）  ← 本计划不涉及
```

---

## 2. 核心设计决策（已确认）

### 2.1 OPFS 双目录分离架构

**关键决策**：OPFS 使用两个隔离的根目录，防止 agent output 污染 agent 工作区。

```
OPFS Root (navigator.storage.getDirectory())
├── /workspace/          ← Agent 工作区（agent 可读写）
│   ├── user-uploaded files（用户手动上传）
│   └── agent-created files（agent 通过 file_write 创建）
│
└── /outputs/            ← Pipeline 自动存档（agent 只读不可见）
    ├── {AgentName}.md   （每个 agent 的完整 LLM 输出）
    └── _meta.json       （执行元数据：时间、模型、agent 列表）
```

**设计理由**：
- `/workspace` 仅由 Agent 的 `file_write`/`file_read`/`file_list`/`file_delete` 控制 + 用户手动上传
- `/outputs` 由 PipelineEngine 完成后自动写入，对 Agent 的 tool 不可见
- 两个目录互不干扰，Agent 使用 `file_list` 时只看到 `/workspace` 的内容
- UI 展示两个独立面板（Workspace 面板 + Agent Outputs 面板）

### 2.2 内置 Tool 集合

| Tool 名称 | 操作目录 | 描述 |
|-----------|---------|------|
| `file_read` | `/workspace` | 读取文件内容 |
| `file_write` | `/workspace` | 写入/创建文件（自动创建中间目录） |
| `file_list` | `/workspace` | 列出目录内容（支持 `path` 和 `recursive` 参数） |
| `file_delete` | `/workspace` | 删除文件 |

所有 tool 限定在 `/workspace` 范围内，禁止 `..` 路径遍历，不可访问 `/outputs`。

### 2.3 Agent 参数分层配置

```
优先级：Agent 级覆盖 > 全局默认 > 硬编码回退值

┌─ Settings Drawer ──────────────────┐
│ Agent Defaults（全局默认）           │
│ ├── Temperature: [0.7]              │
│ ├── Max Tokens: [4096]              │
│ └── Max Iterations: [10]            │
└─────────────────────────────────────┘

┌─ Agent Drawer ─────────────────────┐
│ Parameters（每个 Agent 独立覆盖）    │
│ ├── Temperature: [全局默认] / [0.3] │
│ ├── Max Tokens: [全局默认] / [8192] │
│ └── Max Iterations: [全局默认] / [5]│
└─────────────────────────────────────┘
```

---

## 3. 分阶段开发计划

### 阶段 1：OPFS 服务层

**目标**：封装浏览器 OPFS API，提供双目录文件操作接口。

**新建文件**：`src/core/storage/opfs.ts`

```typescript
// 核心 API 设计
export class OPFSService {
  private root: FileSystemDirectoryHandle | null = null;

  // 初始化
  async init(): Promise<void>;
  isSupported(): boolean;

  // /workspace 文件操作（供 Agent tool 使用）
  async readFile(path: string): Promise<string>;
  async writeFile(path: string, content: string): Promise<void>;
  async deleteFile(path: string): Promise<void>;
  async listDirectory(path?: string, recursive?: boolean): Promise<FileEntry[]>;
  async fileExists(path: string): Promise<boolean>;

  // /outputs 存档操作（供 PipelineEngine 使用）
  async saveAgentOutput(agentName: string, content: string): Promise<void>;
  async saveExecutionMeta(meta: ExecutionMeta): Promise<void>;
  async clearOutputs(): Promise<void>;
  async listOutputs(): Promise<FileEntry[]>;
  async readOutput(filename: string): Promise<string>;

  // 用户上传（写入 /workspace）
  async importFile(file: File, targetPath?: string): Promise<void>;

  // 导出
  async exportWorkspaceZip(): Promise<Blob>;
  async exportOutputsZip(): Promise<Blob>;
  async exportAllZip(): Promise<Blob>;

  // 内部辅助
  private async getWorkspaceDir(): Promise<FileSystemDirectoryHandle>;
  private async getOutputsDir(): Promise<FileSystemDirectoryHandle>;
  private validatePath(path: string): void;  // 禁止 .. 遍历
  private async ensureParentDirs(dirHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle>;
}

export interface FileEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  size?: number;
  lastModified?: number;
}

export interface ExecutionMeta {
  designId: string;
  taskDescription: string;
  modelUsed: string;
  startedAt: number;
  completedAt: number;
  agents: { name: string; role: string; status: string }[];
}

// 单例
export const opfsService = new OPFSService();
```

**浏览器兼容性策略**：
- 检测 `navigator.storage?.getDirectory` 是否存在
- 不支持时降级到内存 Map 模拟（`MemoryFSFallback`）
- 降级时在 UI 显示提示："当前浏览器不支持 OPFS，文件仅保存在内存中，刷新页面将丢失"

**涉及修改**：
- 无现有文件修改，纯新增

**预估工时**：4-6 小时

---

### 阶段 2：内置 Tool 执行器

**目标**：实现 `file_read`、`file_write`、`file_list`、`file_delete` 的实际执行逻辑。

**新建文件**：`src/core/tools/builtin.ts`

```typescript
// Tool Schema（遵循 OpenAI function calling 格式）
export const BUILTIN_TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'file_read',
      description: 'Read the content of a file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root (e.g., "report.md", "src/index.ts")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_write',
      description: 'Write content to a file in the workspace. Creates parent directories automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root',
          },
          content: {
            type: 'string',
            description: 'The text content to write',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_list',
      description: 'List files and directories in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path relative to workspace root. Defaults to root "."',
            default: '.',
          },
          recursive: {
            type: 'boolean',
            description: 'If true, list all files recursively. Default false.',
            default: false,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_delete',
      description: 'Delete a file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root to delete.',
          },
        },
        required: ['path'],
      },
    },
  },
];

// Tool 执行器
export async function executeBuiltinTool(
  name: string,
  args: Record<string, unknown>
): Promise<string>;

// 辅助：根据 Agent 的 tools 列表过滤出实际可用的 tool schemas
export function getToolSchemasForAgent(agentTools: string[]): typeof BUILTIN_TOOL_SCHEMAS;
```

**涉及修改**：
- `src/components/pipeline/AgentDrawer.tsx`：`BUILT_IN_TOOLS` 从 `['file_read', 'file_write']` 更新为 `['file_read', 'file_write', 'file_list', 'file_delete']`
- `src/core/designer/designer.ts`：更新 designer prompt 中对内置 tool 的描述

**预估工时**：2-3 小时

---

### 阶段 3：类型扩展 + 参数分层配置 UI

**目标**：扩展类型系统支持 Agent 参数覆盖；在 Settings Drawer 和 Agent Drawer 中添加参数配置 UI。

#### 3a. 类型扩展

**修改文件**：`src/types/index.ts`

```typescript
// AgentNode 新增可选参数字段
export interface AgentNode {
  // ... 现有字段不变
  temperature?: number;     // 覆盖全局默认
  maxTokens?: number;       // 覆盖全局默认
  maxIterations?: number;   // 覆盖全局默认（ReAct 循环上限）
}

// AppSettings 新增全局默认
export interface AppSettings {
  // ... 现有字段不变
  agentDefaults: AgentDefaults;
}

export interface AgentDefaults {
  temperature: number;    // default 0.7
  maxTokens: number;      // default 4096
  maxIterations: number;  // default 10
}

// LLMMessage 扩展支持 tool role
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;    // role='tool' 时使用
  tool_calls?: LLMToolCall[]; // role='assistant' 时可能包含
}
```

#### 3b. Settings Drawer 扩展

**修改文件**：`src/components/settings/SettingsDrawer.tsx`

新增 "Agent Defaults" section：
```
⚙ Agent Defaults
├── Temperature: [slider 0-2, 默认 0.7]
├── Max Tokens: [数字输入, 默认 4096]
└── Max Iterations: [数字输入, 默认 10]
```

#### 3c. Agent Drawer 扩展

**修改文件**：`src/components/pipeline/AgentDrawer.tsx`

在 Tools section 和 Input Mappings section 之间新增 "Parameters" section：
```
Parameters
├── Temperature: [使用全局默认 ✓] / [自定义: ___]
├── Max Tokens: [使用全局默认 ✓] / [自定义: ___]
└── Max Iterations: [使用全局默认 ✓] / [自定义: ___]
```

每个参数有一个 checkbox（"使用全局默认"），取消勾选后显示输入框。

#### 3d. Store 扩展

**修改文件**：`src/store/index.ts`

- `loadSettings()` 添加 `agentDefaults` 默认值
- `saveSettings()` 保存 `agentDefaults`
- 新增 action：`setAgentDefaults(defaults: Partial<AgentDefaults>)`

**预估工时**：4-5 小时

---

### 阶段 4：LLM Function Calling + ReAct 执行循环

**目标**：让 Agent 从单轮文本生成变为多轮 ReAct 循环，可以实际调用 tool 并观察结果。

#### 4a. LLM 模块扩展

**修改文件**：`src/core/llm/openrouter.ts`

```typescript
export interface LLMRequestOptions {
  // ... 现有字段不变
  tools?: ToolSchema[];  // 新增：function calling schemas
}

export async function callLLM(options: LLMRequestOptions): Promise<LLMResponse> {
  // body 中添加 tools 字段
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }
  // 解析 response 中的 tool_calls
  // ...
}
```

**需处理**：
- 当 `stream: true` 时，tool_calls 在 streaming chunks 中的解析
- `LLMResponse.toolCalls` 字段已定义（`types/index.ts:121`），需正确填充

#### 4b. PipelineEngine ReAct 循环

**修改文件**：`src/core/engine/pipeline.ts`

将 `executeNode()` 从单轮改为多轮：

```typescript
async executeNode(node: AgentNode, design: SwarmDesign): Promise<void> {
  // ... 现有 input 解析逻辑不变

  // 解析参数（分层优先级）
  const settings = /* 从外部获取 */;
  const temperature = node.temperature ?? settings.agentDefaults.temperature ?? 0.7;
  const maxTokens = node.maxTokens ?? settings.agentDefaults.maxTokens ?? 4096;
  const maxIterations = node.maxIterations ?? settings.agentDefaults.maxIterations ?? 10;

  // 构建 tool schemas
  const toolSchemas = getToolSchemasForAgent(node.tools);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // ReAct 循环
  for (let i = 0; i < maxIterations; i++) {
    if (this.aborted) return;
    await this.checkPause();

    const response = await callLLM({
      messages,
      model: this.model,
      apiKey: this.apiKey,
      temperature,
      maxTokens,
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
    });

    // 无 tool call → 最终回答，退出循环
    if (!response.toolCalls || response.toolCalls.length === 0) {
      const result = response.content;
      this.setContext(...); // 存入 context
      break;
    }

    // 有 tool call → 执行 tool → 追加 messages → 继续循环
    messages.push({
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.toolCalls,
    });

    for (const tc of response.toolCalls) {
      this.log(node, 'info', `Calling tool: ${tc.name}(${JSON.stringify(tc.arguments)})`);

      let toolResult: string;
      try {
        toolResult = await this.executeTool(tc.name, tc.arguments);
      } catch (err) {
        toolResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }

      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: tc.id,
      });

      this.log(node, 'info', `Tool ${tc.name} result: ${toolResult.slice(0, 200)}...`);
    }
  }
}

// Tool 路由
async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  // 内置 tool → executeBuiltinTool()
  if (['file_read', 'file_write', 'file_list', 'file_delete'].includes(name)) {
    return executeBuiltinTool(name, args);
  }
  // MCP tool → mcpManager.executeTool()
  const result = await mcpManager.executeTool(name, args);
  return typeof result === 'string' ? result : JSON.stringify(result);
}
```

**需传入全局设置**：
- `PipelineEngine` 构造函数新增 `agentDefaults: AgentDefaults` 参数
- `ExecutionControls.tsx` 在创建 engine 时传入 `settings.agentDefaults`

**预估工时**：6-8 小时

---

### 阶段 5：文件管理 UI

**目标**：在左栏添加双面板文件浏览器（Workspace + Agent Outputs）。

**新建文件**：`src/components/workspace/FileManager.tsx`

```
┌──────────────────────────┐
│ 📁 Workspace              │  ← /workspace 目录
│ ├── 📄 src/app.ts         │
│ ├── 📄 README.md          │
│ └── 📄 data.csv (上传)    │
│                            │
│ [📤 上传] [📦 导出ZIP]     │
├──────────────────────────┤
│ 📋 Agent Outputs           │  ← /outputs 目录（可折叠）
│ ├── 📄 Researcher.md       │
│ ├── 📄 Coder.md            │
│ └── 📄 _meta.json          │
│                            │
│ [📦 导出]                  │
└──────────────────────────┘
```

**功能**：
- 目录树展示（递归）
- 点击文件 → 预览内容（文本/Markdown/JSON 格式化）
- 拖拽上传文件 → 写入 `/workspace`
- 右键菜单：下载、删除、重命名
- 每次 Agent 执行 `file_write` 后自动刷新文件列表
- 导出 ZIP（workspace / outputs / 全部）

**修改文件**：
- `src/components/workspace/Workspace.tsx`：在左栏 TodoList 下方加入 `<FileManager />`

**Zustand Store 扩展**：
```typescript
// store/index.ts 新增
workspaceFiles: FileEntry[];
outputFiles: FileEntry[];
refreshWorkspaceFiles: () => Promise<void>;
refreshOutputFiles: () => Promise<void>;
```

**预估工时**：4-6 小时

---

### 阶段 6：Pipeline 自动持久化

**目标**：Pipeline 执行完毕后，自动将所有 Agent 输出写入 `/outputs` 目录。

**修改文件**：`src/core/engine/pipeline.ts`

在 `execute()` 方法末尾添加：

```typescript
async execute(design: SwarmDesign): Promise<void> {
  // ... 现有批次执行逻辑不变

  // 所有批次执行完毕后，自动持久化到 /outputs
  await this.persistOutputs(design);
}

private async persistOutputs(design: SwarmDesign): Promise<void> {
  // 清空旧的 /outputs
  await opfsService.clearOutputs();

  // 写入每个 agent 的输出
  for (const [key, entry] of this.context.entries()) {
    if (key.startsWith('__')) continue; // 跳过内部 key
    const content = typeof entry.value === 'string'
      ? entry.value
      : JSON.stringify(entry.value, null, 2);
    // 从 key 中提取 agent name（格式: "AgentName(agent-id)"）
    const agentName = key.split('(')[0];
    await opfsService.saveAgentOutput(agentName, content);
  }

  // 写入执行元数据
  await opfsService.saveExecutionMeta({
    designId: design.id,
    taskDescription: design.taskDescription,
    modelUsed: design.modelUsed,
    startedAt: /* 记录开始时间 */,
    completedAt: Date.now(),
    agents: design.topology.nodes.map(n => ({
      name: n.name,
      role: n.role,
      status: /* 从 nodeStates 获取 */,
    })),
  });

  // 触发 UI 文件列表刷新
  this.callbacks.onOutputsPersisted?.();
}
```

**修改 EngineCallbacks**：
```typescript
export interface EngineCallbacks {
  // ... 现有回调不变
  onOutputsPersisted?: () => void;  // 新增
}
```

**修改 ExecutionControls.tsx**：
在 engine callbacks 中响应 `onOutputsPersisted`，调用 `refreshOutputFiles()`。

**行为设计**：
- 每次重新执行 Pipeline 时，先 `clearOutputs()` 清空旧输出
- `/outputs/{AgentName}.md` — 每个 agent 一个文件
- `/outputs/_meta.json` — 执行元数据
- 文件列表自动刷新

**预估工时**：2-3 小时

---

## 4. 完整文件变更清单

### 新建文件

| 文件路径 | 阶段 | 说明 |
|---------|------|------|
| `src/core/storage/opfs.ts` | 阶段 1 | OPFS 服务层（双目录架构） |
| `src/core/tools/builtin.ts` | 阶段 2 | 内置 Tool Schema + 执行器 |
| `src/components/workspace/FileManager.tsx` | 阶段 5 | 文件管理 UI 组件 |

### 修改文件

| 文件路径 | 阶段 | 变更内容 |
|---------|------|---------|
| `src/types/index.ts` | 阶段 3 | 添加 `AgentDefaults`、`AgentNode` 可选参数、扩展 `LLMMessage` |
| `src/store/index.ts` | 阶段 3/5 | 添加 `agentDefaults`、`workspaceFiles`/`outputFiles` 状态和 actions |
| `src/components/settings/SettingsDrawer.tsx` | 阶段 3 | 新增 "Agent Defaults" section |
| `src/components/pipeline/AgentDrawer.tsx` | 阶段 2/3 | 更新 `BUILT_IN_TOOLS`、新增 Parameters section |
| `src/core/llm/openrouter.ts` | 阶段 4 | 添加 `tools` 参数支持、解析 `tool_calls` |
| `src/core/engine/pipeline.ts` | 阶段 4/6 | ReAct 循环、tool 路由、参数分层、自动持久化 |
| `src/core/designer/designer.ts` | 阶段 2 | 更新内置 tool 描述（`file_list`、`file_delete`） |
| `src/components/workspace/Workspace.tsx` | 阶段 5 | 集成 FileManager 组件 |
| `src/components/workspace/ExecutionControls.tsx` | 阶段 4/6 | 传入 `agentDefaults`、处理 `onOutputsPersisted` |

---

## 5. 依赖关系与执行顺序

```
阶段 1: OPFS 服务层
   │
   ├──→ 阶段 2: 内置 Tool 执行器（依赖阶段 1）
   │       │
   │       └──→ 阶段 4: ReAct 循环（依赖阶段 2 + 阶段 3）
   │               │
   │               └──→ 阶段 6: 自动持久化（依赖阶段 1 + 阶段 4）
   │
   └──→ 阶段 5: 文件管理 UI（依赖阶段 1，可与阶段 2-4 并行）

阶段 3: 类型扩展 + 参数 UI（独立，可与阶段 1 并行开始）
```

**推荐开发顺序**：

1. **阶段 1** → OPFS 基础设施（所有后续阶段的前置依赖）
2. **阶段 3** → 类型扩展和参数 UI（独立，可早期完成）
3. **阶段 2** → Tool 执行器（依赖阶段 1）
4. **阶段 4** → ReAct 循环（依赖阶段 2 + 3，核心功能）
5. **阶段 5** → 文件管理 UI（依赖阶段 1，可在阶段 4 之后或并行）
6. **阶段 6** → 自动持久化（依赖阶段 1 + 4，收尾工作）

---

## 6. 风险与缓解策略

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **OPFS 浏览器兼容性** | Safari < 15.2、Firefox Worker-only 限制 | 提供内存 Map fallback + UI 提示 |
| **Function calling 模型兼容性** | 非所有 OpenRouter 模型支持 tool_use | 检测模型能力，不支持时回退到 prompt-based 模拟 |
| **ReAct 无限循环** | Agent 反复调用 tool 不收敛 | `maxIterations` 参数限制，超限强制终止并返回已有内容 |
| **OPFS 存储配额** | 浏览器限制约 10% 磁盘空间 | 显示已用空间，提供清理工具 |
| **路径注入安全** | Agent 构造恶意路径（如 `../../`） | `validatePath()` 严格校验：禁止 `..`，限制在各自目录内 |
| **大文件性能** | Agent 写入大文件导致 UI 卡顿 | 文件大小限制（默认 1MB/文件），OPFS 操作在异步中完成 |

---

## 7. 工时估算汇总

| 阶段 | 内容 | 预估工时 | 累计 |
|------|------|---------|------|
| 阶段 1 | OPFS 服务层 | 4-6h | 4-6h |
| 阶段 2 | 内置 Tool 执行器 | 2-3h | 6-9h |
| 阶段 3 | 类型扩展 + 参数 UI | 4-5h | 10-14h |
| 阶段 4 | ReAct 循环 + Function Calling | 6-8h | 16-22h |
| 阶段 5 | 文件管理 UI | 4-6h | 20-28h |
| 阶段 6 | Pipeline 自动持久化 | 2-3h | 22-31h |
| **总计** | | **22-31 小时** | |

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 用户可以在 UI 中拖拽上传文件到 workspace
- [ ] Agent 可以通过 file_write 在执行过程中创建文件
- [ ] Agent 可以通过 file_read 读取 workspace 中的文件
- [ ] Agent 可以通过 file_list 发现 workspace 中有哪些文件
- [ ] Agent 可以通过 file_delete 删除 workspace 中的文件
- [ ] Agent 的 file_list/file_read 无法访问 /outputs 目录
- [ ] Pipeline 完成后，agent 输出自动保存到 /outputs 目录
- [ ] UI 左栏显示 Workspace 和 Agent Outputs 两个面板
- [ ] 用户可以点击文件预览内容
- [ ] 用户可以将 workspace 或 outputs 导出为 ZIP
- [ ] 用户可以在 Settings 中配置全局默认 temperature/maxTokens/maxIterations
- [ ] 用户可以在 Agent Drawer 中为单个 Agent 覆盖参数
- [ ] PipelineEngine 正确使用分层参数（agent 级 > 全局 > 硬编码）
- [ ] Agent 在 ReAct 循环中可以多轮调用 tool
- [ ] ReAct 循环在达到 maxIterations 时正确终止
- [ ] 页面刷新后 OPFS 中的文件仍然存在

### 8.2 安全验收

- [ ] `file_read("../../etc/passwd")` 等路径遍历被拒绝
- [ ] Agent tool 无法读写 /outputs 目录
- [ ] 大文件写入有大小限制

### 8.3 兼容性验收

- [ ] Chrome 86+ 正常使用 OPFS
- [ ] 不支持 OPFS 的浏览器降级到内存模式并显示提示
- [ ] 不支持 function calling 的模型仍可正常执行（回退单轮模式）
