**AutoSwarm Designer**
**全自动智能体群设计与可视化系统**
**设计文档 v1.0（最终版）**

---

## 文档信息

| 项 | 内容 |
|----|------|
| **文档版本** | v1.0 |
| **最后更新** | 2025年 |
| **目标读者** | 开发者、设计师、产品经理、潜在用户 |
| **项目定位** | 开源Web应用（纯前端），非生产级，核心功能展示与原型验证 |

---

## 1. 产品概述

### 1.1 项目定位

**AutoSwarm Designer** 是一个运行在浏览器中的全自动Agent Swarm设计与可视化工具。它将"多智能体系统设计"这一复杂工程简化为自然语言交互——用户只需描述任务，系统即可自动拆解任务、设计执行 pipeline、编排智能体协作，并实时可视化展示整个工作流程。

**核心理念**：让Agent Swarm的设计像画流程图一样简单，但比手动设计更智能、更高效。

### 1.2 核心价值主张

1. **零门槛自动化**：无需理解复杂的Swarm拓扑理论，自然语言输入即可获得专业的多智能体协作方案
2. **所见即所得**：Pipeline自动生成并可视化展示，支持实时调试与手动微调
3. **完全本地隐私**：API Key仅存浏览器，所有计算本地完成，任务数据永不离开用户设备
4. **无缝工具集成**：通过MCP协议连接外部工具生态，让Agent获得真实世界操作能力

### 1.3 典型使用场景

**场景A：自动化研究报告生成**
- 用户输入："帮我调研2024年AI Agent领域的主流框架，输出一份对比分析报告"
- 系统自动生成：Todo List（搜索资料→整理信息→撰写报告→审核校对）→ Swarm（研究员+写手+审核员并行协作）→ 最终导出Markdown报告到本地

**场景B：代码项目脚手架生成**
- 用户输入："创建一个React+TypeScript的Todo应用，包含CRUD功能"
- 系统自动生成：架构设计Agent → 代码生成Agent → 测试用例Agent（并行）→ 整合Agent → 导出完整代码ZIP

**场景C：复杂数据处理流程**
- 用户输入："清洗我上传的CSV数据，去除重复项，生成统计图表，并输出分析报告"
- 系统自动分配：数据清洗Agent（并行处理多列）→ 可视化Agent → 分析Agent → 结果持久化到虚拟文件系统

---

## 2. 用户分析

### 2.1 目标用户画像

| 用户类型 | 特征 | 核心需求 | 使用频率 |
|---------|------|---------|---------|
| **AI应用开发者** | 熟悉LLM，想快速原型验证多Agent协作方案 | 可视化调试、快速迭代Swarm设计 | 高频 |
| **技术爱好者/极客** | 关注AI前沿，喜欢折腾开源工具 | 体验最新Swarm架构、本地隐私保障 | 中频 |
| **领域专家（非程序员）** | 医生、律师、分析师，想用AI处理专业工作流 | 自然语言交互、无需编程、结果可导出 | 低频但深度使用 |
| **学生/研究者** | 学习Multi-Agent System概念 | 直观理解Agent协作机制、教学演示 | 偶尔使用 |

### 2.2 用户需求与痛点

| 痛点 | 现有解决方案缺陷 | AutoSwarm的解决方式 |
|------|---------------|-------------------|
| **Swarm设计门槛高** | 需要手写复杂的状态机或DAG代码 | 自然语言自动生成，可视化确认 |
| **调试困难** | 黑盒运行，看不到Agent间如何传递信息 | 实时Pipeline可视化，节点状态高亮 |
| **隐私担忧** | 云端Agent平台可能记录任务内容 | 纯浏览器端，数据本地存储（OPFS） |
| **工具接入复杂** | 每个工具都要单独写Adapter | MCP协议标准化接入，即插即用 |
| **协作模式单一** | 多数工具只支持简单链式或星型架构 | 自动识别并行机会，优化执行效率 |

### 2.3 用户旅程地图（User Journey）

```
阶段1：发现与准备（1-2分钟）
├─ 用户访问网页
├─ 输入OpenRouter API Key（保存到LocalStorage）
├─ 添加MCP Server（可选，如文件系统、搜索等）
└─ 进入主界面

阶段2：任务定义（30秒-2分钟）
├─ 在任务输入框描述目标（支持拖拽上传参考文件到OPFS）
├─ 选择基础模型（Claude/GPT/Kimi via OpenRouter）
└─ 点击"设计Swarm"

阶段3：设计与确认（1-3分钟）
├─ 系统显示Loading：LLM正在分析任务...
├─ 左侧生成Todo List（可手动增删改）
├─ 右侧生成Pipeline拓扑图（节点=Agent，边=数据流）
├─ 用户可：
│   ├─ 拖拽调整节点位置
│   ├─ 点击节点编辑Skill.md（查看/修改Agent角色定义）
│   ├─ 调整并行/串行关系
│   └─ 添加/删除Agent节点
└─ 确认设计 → 进入执行

阶段4：执行与监控（时间取决于任务复杂度）
├─ Pipeline自动执行，节点颜色变化：
│   ├─ 灰色：待执行
│   ├─ 蓝色：运行中（显示旋转动画）
│   ├─ 绿色：已完成
│   └─ 红色：错误（可点击查看日志）
├─ 右侧面板显示实时日志流（类似终端输出）
├─ 用户可：
│   ├─ 暂停/继续执行
│   ├─ 单步调试（逐个Agent执行）
│   └─ 查看Agent间传递的具体数据（点击边）
└─ 执行完成

阶段5：成果获取（30秒）
├─ 系统自动将结果整理到OPFS工作区
├─ 用户预览文件（文本/图片/代码高亮）
├─ 一键下载ZIP压缩包（包含所有生成文件+Swarm设计JSON）
└─ 可选择保存当前Swarm模板，供以后复用
```

---

## 3. 功能规格

### 3.1 功能架构图

```
AutoSwarm Designer
├── 工作区管理（Workspace）
│   ├── OPFS虚拟文件系统（根目录/worspace）
│   ├── 文件上传（拖拽/选择）
│   ├── 文件预览（文本/图片/JSON/Markdown）
│   └── 导出ZIP
├── Swarm设计器（Designer）
│   ├── 自然语言输入
│   ├── 自动Todo生成（可编辑）
│   ├── 自动拓扑生成（节点+边）
│   ├── 手动调整（增删改节点/边）
│   ├── Skill.md编辑器（带语法高亮）
│   └── 设计模板保存/加载
├── Pipeline执行器（Executor）
│   ├── 执行控制（开始/暂停/停止/单步）
│   ├── 并行调度引擎
│   ├── 状态监控（节点状态+日志）
│   ├── 断点续跑（基于Context检查点）
│   └── 错误处理（重试/跳过/手动干预）
├── 可视化界面（Visualization）
│   ├── Pipeline拓扑图（React Flow）
│   ├── Todo List面板（可拖拽排序）
│   ├── 实时日志终端
│   ├── Agent详情抽屉（Memory+Tools+IO）
│   └── 执行时间线（Gantt图视角，可选）
└── 系统集成（Integration）
    ├── OpenRouter LLM客户端
    ├── MCP Client管理器（支持多Server）
    ├── API Key本地存储管理
    └── 系统设置（主题/语言/快捷键）
```

### 3.2 核心功能详解

#### 功能1：全自动Swarm生成（核心卖点）

| 属性 | 说明 |
|------|------|
| **输入** | 自然语言任务描述 + 可选参考文件 |
| **处理** | LLM分析任务复杂度→拆解Todo→识别可并行环节→分配Agent角色→生成Skill.md |
| **输出** | 结构化Swarm设计（JSON）+ 可视化拓扑图 |
| **人工干预点** | 生成后可手动调整任何环节，包括重写Skill.md、修改连接关系、增删Agent |

#### 功能2：可视化Pipeline编辑器

| 特性 | 描述 |
|------|------|
| **节点类型** | Agent节点（可配置）、决策节点（条件分支）、工具节点（MCP Tool直接调用） |
| **布局模式** | 自动布局（分层DAG）+ 手动拖拽 |
| **交互操作** | 双击编辑、右键菜单（删除/复制/断开连接）、框选多节点 |
| **状态可视化** | 执行时节点边框流动动画，颜色编码状态，Tool调用显示脉冲效果 |

#### 功能3：MCP工具生态接入

| 特性 | 描述 |
|------|------|
| **连接方式** | Streamable HTTP（无状态模式），支持多个Server同时连接 |
| **Tool发现** | 自动拉取远端Server的Tools列表，显示图标+描述+参数Schema |
| **权限管理** | 每个Agent独立配置可用Tools列表（细粒度控制） |
| **错误隔离** | 单个MCP Server断开不影响其他Agent运行 |

#### 功能4：混合存储工作区

| 存储类型 | 用途 | 用户可见性 |
|---------|------|-----------|
| **内存Context** | Agent间实时数据交换、运行时状态 | 调试模式可见（JSON树查看） |
| **OPFS** | 持久化文件（代码、报告、数据）、执行日志存档 | 文件浏览器直接操作 |
| **IndexedDB** | Swarm设计历史、用户设置、MCP配置 | 设置界面管理 |
| **LocalStorage** | API Key（加密存储）、会话Token | 首次设置后无感知 |

### 3.3 功能边界（明确不做）

为保持项目简洁（非生产级），以下功能明确不做：

1. **用户认证系统**：无登录/注册，完全本地使用
2. **云端同步**：不支持跨设备同步（但支持导出/导入JSON配置）
3. **Python Agent**：仅支持JavaScript/TypeScript Agent（通过JS Tool执行代码）
4. **后端服务**：不部署任何服务器端逻辑，纯静态托管（GitHub Pages/Cloudflare Pages等）
5. **实时协作**：不支持多用户同时编辑同一Swarm
6. **生产级权限**：MCP Server连接无复杂鉴权（仅支持Header传递Token）

---

## 4. Web交互设计

### 4.1 信息架构（IA）

```
首页/仪表盘
├── 快速开始（最近使用的Swarm模板）
├── 新建任务（大输入框，支持语音输入，未来扩展）
└── 帮助引导（首次使用Checklist）

主工作界面（三栏布局）
├── 左栏：任务与文件（20%宽度，可折叠）
│   ├── 任务定义区（输入框+模型选择）
│   ├── Todo List（树形/列表，可勾选）
│   └── 文件浏览器（OPFS目录树，支持右键菜单）
├── 中栏：可视化画布（60%宽度，核心区域）
│   ├── Pipeline图（React Flow画布）
│   ├── 工具栏（缩放/适应/布局切换/执行控制）
│   └── 悬浮节点详情（hover显示简要，click打开抽屉）
└── 右栏：监控与日志（20%宽度，可折叠）
    ├── 执行控制面板（开始/暂停/单步/重置）
    ├── 实时日志流（彩色终端风格，支持搜索过滤）
    └── Context查看器（JSON结构化查看Agent间数据）

设置/配置（抽屉/弹窗）
├── LLM配置（OpenRouter Key+模型选择）
├── MCP Servers（列表管理，添加/删除/测试连接）
├── 导出/导入（工作区ZIP，Swarm JSON）
└── 关于/开源链接
```

### 4.2 关键界面原型描述

#### 界面1：初始化引导（首次访问）

```
┌─────────────────────────────────────────┐
│  AutoSwarm Designer     [Logo动画]      │
│                                         │
│  欢迎使用全自动Agent Swarm设计器         │
│                                         │
│  1. 配置OpenRouter API Key              │
│     [输入框: sk-or-v1-...] [保存按钮]   │
│     [?] 如何获取Key（链接到文档）        │
│                                         │
│  2. 添加MCP Server（可选）              │
│     [Server名称] [URL] [添加按钮]        │
│     示例：文件系统、网页搜索、代码执行    │
│                                         │
│  [进入工作区 →]                          │
└─────────────────────────────────────────┘
```

#### 界面2：主工作区（设计模式）

```
┌─────────────────────────────────────────────────────────────────┐
│ 文件 ▼  编辑 ▼  视图 ▼  [保存设计] [导出工作区]       [设置] [帮助] │
├──────────┬───────────────────────────────────────────┬──────────┤
│ 任务输入  │                                           │  执行控制 │
│ [描述    │    ┌─────────┐      ┌─────────┐         │  [▶开始] │
│  框...]  │    │ Agent A │─────→│ Agent B │         │  [⏸暂停] │
│          │    │ Research│      │ Writer │         │          │
│ [模型:   │    └────┬────┘      └─────────┘         │  实时日志 │
│ Claude]  │         │                               │  ──────── │
│          │    ┌────┴────┐      ┌─────────┐         │  [14:32] │
│ Todo List│    │ Agent C │      │ Agent D │         │  Agent A:│
│ ☑ 调研   │    │ Parallel│      │ Parallel│         │  正在搜索 │
│ ☐ 撰写   │    └─────────┘      └─────────┘         │  相关资料 │
│ ☐ 审核   │                                           │  ...     │
│          │    [双击节点编辑]  [拖拽调整布局]         │          │
│ 文件     │                                           │          │
│ /workspace                              │           │          │
│ ├── data.csv                            │           │          │
│ └── prompt.md                           │           │          │
├──────────┴───────────────────────────────────────────┴──────────┤
│ 状态栏：已连接MCP Servers: 2 | OpenRouter余额: $12.34 | 就绪      │
└─────────────────────────────────────────────────────────────────┘
```

#### 界面3：Agent配置抽屉（点击节点后右侧滑出）

```
┌──────────────────┐
│ Agent: 研究员_X1  │ [×]
├──────────────────┤
│ 角色定义 (Skill) │
│ ┌──────────────┐ │
│ │ 你是一个专...  │ │
│ │ 业的研究员...  │ │
│ │ [编辑]        │ │
│ └──────────────┘ │
├──────────────────┤
│ 可用Tools        │
│ ☑ web_search     │
│ ☑ read_file      │
│ ☐ write_file     │
│ ☑ fetch_url      │
├──────────────────┤
│ 输入映射         │
│ user_input → topic│
│ context.report →  │
├──────────────────┤
│ 输出映射         │
│ result → context.findings │
├──────────────────┤
│ [测试运行] [删除节点] │
└──────────────────┘
```

#### 界面4：执行监控模式

```
画布区域变化：
- 节点背景色实时变化（蓝→绿/红）
- 节点边框流动动画表示正在运行
- 边（连线）显示数据传输动画（粒子流动）

右侧面板变化：
- 显示Gantt图缩略（时间线视图切换）
- 日志自动滚动，高亮当前执行的Agent输出
- 显示每个Agent的Token消耗（通过OpenRouter返回的usage）
```

### 4.3 交互细节与微交互

| 场景 | 交互设计 | 反馈 |
|------|---------|------|
| **生成Swarm中** | 全屏Loading，显示"正在分析任务复杂度...→正在识别并行机会...→正在生成Agent角色..." | 进度条+文字变化，防止焦虑 |
| **MCP连接失败** | 红色toast提示，提供"查看文档"和"重试"按钮 | 不阻断其他功能，仅该Server的Tools变灰不可用 |
| **Agent执行错误** | 节点变红，自动弹出日志定位到错误行，提供"重试本节点"或"跳过继续" | 错误信息可点击展开堆栈（如果有） |
| **文件拖拽上传** | 拖拽到左栏文件浏览器区域，显示蓝色边框高亮，松手后显示上传进度（实则OPFS写入） | 完成提示"已保存到虚拟工作区" |
| **导出ZIP** | 按钮显示打包进度，完成后自动触发浏览器下载 | 下载文件名包含时间戳：`autoswarm_20250213_143052.zip` |
| **长时间任务** | 浏览器标签页标题显示进度"[60%] AutoSwarm - 执行中..." | 用户切出标签页也能感知进度 |

### 4.4 响应式设计考虑

- **桌面端（主要目标）**：三栏布局，1280px以上最佳体验
- **平板端（次要）**：侧栏可折叠为抽屉，画布占据主要空间
- **移动端（不支持）**：显示提示"请使用桌面浏览器访问以获得完整功能"

---

## 5. 技术架构详细设计

### 5.1 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                          表现层 (UI)                          │
│  React 18 + TypeScript + TailwindCSS + React Flow (可视化)   │
│  组件：TaskInput | PipelineGraph | TodoList | FileManager     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                          应用层 (Core)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ Swarm Designer│ │Pipeline Engine│ │   Agent Runtime     │  │
│  │   (LLM驱动)   │ │   (DAG执行器)  │ │   (ReAct + Tools)   │  │
│  └──────────────┘ └──────────────┘ └──────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │  MCP Client  │ │ OpenRouter   │ │   Context Manager   │  │
│  │  Manager     │ │   Provider   │ │   (内存 + OPFS桥接)  │  │
│  └──────────────┘ └──────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                          基础设施层                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │  OPFS API    │ │  IndexedDB   │ │   Fetch API         │  │
│  │  (虚拟文件)   │ │  (结构化数据) │ │   (OpenRouter/MCP)  │  │
│  └──────────────┘ └──────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 关键技术决策与理由

| 决策 | 选择 | 理由 |
|------|------|------|
| **MCP传输** | Streamable HTTP (无状态) | 比WebSocket更适合浏览器环境：复用HTTP/2连接、无需处理长连接重连、符合REST思维 <sup>1</sup> [<sup>1</sup>](https://higress.cn/blog/higress-gvr7dx_awbbpb_vt50nsm76qkpi78w/) |
| **LLM接入** | OpenRouter (唯一) | 天然支持CORS，一个Key访问多模型(Claude/GPT/Kimi)，无需处理跨域 |
| **Agent通信** | 内存Context + OPFS持久化 | 运行时高性能内存共享，结果按需持久化，平衡速度与持久性 |
| **状态管理** | Zustand + Immer | 轻量级，支持不可变更新，适合复杂Swarm状态的局部更新 |
| **代码沙箱** | Web Workers (QuickJS备选) | 执行用户代码/Agent生成代码时隔离主线程，防止UI卡顿 |

### 5.3 数据流架构

```
用户输入任务
    ↓
OpenRouter LLM API (设计阶段)
    ↓
生成 SwarmDesign (JSON)
    ├─→ 保存到 IndexedDB (设计历史)
    └─→ 渲染到 React Flow (可视化)
    ↓
用户点击"执行"
    ↓
Pipeline Engine 初始化
    ├─→ 加载所有已连接 MCP Servers 的 Tools
    └─→ 构建 DAG 执行图
    ↓
执行循环 (EventLoop)
    ├─→ 识别可并行节点 (同层无依赖)
    ├─→ 实例化 Agent Runtime (每个节点一个实例)
    │   └─→ Agent 调用 LLM (OpenRouter, streaming)
    │       └─→ LLM 返回 Tool Calls
    │           └─→ 执行 Tool
    │               ├─→ MCP Tool → HTTP请求到远端
    │               ├─→ 内置 Tool → OPFS/Context操作
    │               └─→ 返回 Observation
    │       └─→ 继续循环直到 Final Answer
    └─→ 更新节点状态 (Zustand Store)
    ↓
所有节点完成
    ├─→ 聚合结果到 OPFS
    └─→ 触发 ZIP 打包 (JSZip)
```

---

## 6. 核心模块详细设计

### 6.1 MCP Client 模块（Streamable HTTP）

```typescript
// 架构要点：单例管理器 + 动态工具注册
class MCPClientManager {
  private sessions: Map<string, StreamableHTTPClientTransport>;
  private toolRegistry: Map<string, RegisteredTool>;

  // Streamable HTTP 配置 <sup>2</sup> [<sup>2</sup>](https://opendeep.wiki/modelcontextprotocol/typescript-sdk/streamable-http-client)
  async connect(config: MCPConfig): Promise<void> {
    const transport = new StreamableHTTPClientTransport({
      url: config.url,
      stateless: true, // 关键：无状态模式简化浏览器实现
      headers: { 'Authorization': `Bearer ${config.token}` }
    });
  
    const client = new Client({ name: 'autoswarm', version: '1.0' });
    await client.connect(transport);
  
    // 工具发现并注册到全局Registry
    const tools = await client.listTools();
    tools.forEach(tool => {
      this.toolRegistry.set(tool.name, {
        serverId: config.id,
        schema: tool,
        executor: async (args) => client.callTool({ name: tool.name, arguments: args })
      });
    });
  }

  // 统一工具调用接口（供Agent Runtime使用）
  async executeTool(name: string, args: any): Promise<ToolResult> {
    const tool = this.toolRegistry.get(name);
    if (!tool) throw new ToolNotFoundError(name);
    return await tool.executor(args);
  }
}
```

### 6.2 Swarm Designer 模块

```typescript
class SwarmDesigner {
  async design(task: string, availableTools: ToolInfo[]): Promise<SwarmDesign> {
    // 1. 生成Todo List（带依赖关系）
    const todos = await this.llm.generateJSON({
      prompt: `分析任务并生成Todo: ${task}`,
      schema: z.array({
        id: z.string(),
        description: z.string(),
        dependencies: z.array(z.string()),
        parallelizable: z.boolean()
      })
    });
  
    // 2. 拓扑设计（识别并行组）
    const topology = await this.llm.generateJSON({
      prompt: `基于Todos设计Swarm: ${JSON.stringify(todos)}`,
      context: `可用Tools: ${JSON.stringify(availableTools)}`,
      schema: TopologySchema // 节点、边、并行组定义
    });
  
    // 3. 生成各Agent的Skill.md
    for (const node of topology.nodes) {
      node.skillMarkdown = await this.generateSkill(node, availableTools);
    }
  
    return { todos, topology };
  }
}
```

### 6.3 Pipeline 执行引擎

```typescript
class PipelineEngine {
  private context: SwarmContext; // 内存Map

  async execute(design: SwarmDesign): Promise<void> {
    const dag = new DAG(design.topology.nodes, design.topology.edges);
    const batches = dag.getExecutionBatches(); // 拓扑分层
  
    for (const batch of batches) {
      // 并行执行同批次
      await Promise.all(batch.map(node => this.executeNode(node)));
    
      // 检查全局终止条件
      if (this.context.get('__TERMINATE__')) break;
    }
  }

  private async executeNode(node: AgentNode): Promise<void> {
    const agent = new AgentRuntime({
      skill: node.skillMarkdown,
      tools: [...node.tools, 'context_read', 'context_write', 'file_read', 'file_write'],
      llm: this.openRouter,
      context: this.context
    });
  
    const input = this.resolveInputMappings(node.inputMappings);
    const output = await agent.run(input);
  
    // 写入共享内存（实现A）
    this.context.set(node.id, output);
  
    // 触发UI更新
    this.emit('nodeComplete', { nodeId: node.id, output });
  }
}
```

### 6.4 数据模型定义

```typescript
// 核心数据结构
interface SwarmDesign {
  id: string;
  createdAt: number;
  taskDescription: string;
  modelUsed: string; // "anthropic/claude-3.5-sonnet"
  todos: TodoItem[];
  topology: {
    nodes: AgentNode[];
    edges: PipelineEdge[];
    parallelGroups: string[][];
  };
}

interface AgentNode {
  id: string;
  name: string;
  role: string; // "researcher" | "coder" | "reviewer" | "coordinator"
  skillMarkdown: string; // 完整的system prompt
  tools: string[]; // 引用的Tool名称列表
  parallelGroup?: string;
  inputMappings: Mapping[]; // 从Context或其他节点输入
  outputMappings: Mapping[]; // 输出到Context或文件
}

interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedNodeIds: string[]; // 灵活映射：多个Agent协作完成一个Todo
  dependencies: string[];
}

// Context存储结构（内存）
interface ContextEntry {
  value: any;
  producedBy: string; // Agent Node ID
  timestamp: number;
  type: 'intermediate' | 'final' | 'file_reference';
}
```

---


## 9. 附录

### A. 术语表
- **Swarm**: 多智能体协作系统，多个Agent按特定拓扑协作完成任务
- **MCP**: Model Context Protocol，Anthropic提出的AI工具标准化协议
- **OPFS**: Origin Private File System，浏览器提供的私有文件系统API
- **Streamable HTTP**: MCP 2025年推出的新传输协议，基于HTTP/2 Server Push/Event Stream
- **ReAct**: Reasoning + Acting，LLM Agent的推理-行动循环模式
