# 🐝 AutoSwarm Designer

[English](README.md) | [中文](README.zh-CN.md)

**自动化智能体集群设计与可视化系统**

🌐 **在线演示**: [https://bu-bu-xxx.github.io/mini-swarm/](https://bu-bu-xxx.github.io/mini-swarm/)

一个基于浏览器的工具，将多智能体系统设计简化为自然语言交互。描述一个任务，系统会自动分解任务、设计执行流程、编排智能体协作，并实时可视化整个工作流程。

## 功能特性

- **零门槛自动化**：自然语言输入即可生成专业的多智能体协作方案
- **所见即所得的流程图**：自动生成的流程通过 React Flow 实时可视化
- **完全本地隐私**：API Key 仅存储在浏览器中，所有计算均在本地完成
- **MCP 工具集成**：通过 MCP 协议（Streamable HTTP）连接外部工具生态系统
- **并行执行**：自动识别可并行化的任务以优化执行效率

## 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS
- **可视化**: React Flow (@xyflow/react)
- **状态管理**: Zustand + Immer
- **LLM 访问**: OpenRouter API（支持 Claude、GPT、Gemini、DeepSeek）
- **构建工具**: Vite
- **存储**: LocalStorage（浏览器本地）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint
```

## 使用说明

1. **设置**：输入您的 [OpenRouter API Key](https://openrouter.ai/keys)，并可选择添加 MCP 服务器
2. **设计**：用自然语言描述您的任务，点击"Design Swarm"
3. **审查**：检查生成的流程图、待办列表和智能体配置
4. **执行**：点击"Start"运行流程并实时监控进度
5. **导出**：下载结果或将集群设计保存为 JSON 以便重用

## 架构

```
src/
├── types/          # TypeScript 接口和数据模型
├── core/
│   ├── llm/        # OpenRouter LLM 客户端（流式支持）
│   ├── mcp/        # MCP 客户端管理器（Streamable HTTP）
│   ├── designer/   # 集群设计器（LLM 驱动的自动生成）
│   └── engine/     # 流程执行引擎（DAG 调度器）
├── store/          # Zustand 状态管理
├── components/
│   ├── setup/      # 引导流程 / API key 配置
│   ├── workspace/  # 主工作区三栏布局
│   ├── pipeline/   # React Flow 图表、智能体节点、智能体抽屉
│   ├── todo/       # 待办列表面板
│   ├── logs/       # 实时日志查看器
│   └── settings/   # 设置抽屉
└── utils/          # 工具函数
```

## 许可证

MIT
