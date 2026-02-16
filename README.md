# 🐝 MiniSwarm Designer

[English](README.md) | [中文](README.zh-CN.md)

**Automated Agent Swarm Design & Visualization System**

🌐 **Live Demo**: [https://bu-bu-xxx.github.io/mini-swarm/](https://bu-bu-xxx.github.io/mini-swarm/)

A browser-based tool that simplifies multi-agent system design to natural language interaction. Describe a task, and the system automatically decomposes it, designs an execution pipeline, orchestrates agent collaboration, and visualizes the entire workflow in real-time.

## Features

- **Zero-barrier Automation**: Natural language input generates professional multi-agent collaboration plans
- **WYSIWYG Pipeline**: Auto-generated pipeline with real-time visualization via React Flow
- **Complete Local Privacy**: API Key stored in browser only, all computation done locally
- **MCP Tool Integration**: Connect external tool ecosystems via MCP protocol (Streamable HTTP)
- **Parallel Execution**: Automatic identification of parallelizable tasks for optimized execution

## Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Visualization**: React Flow (@xyflow/react)
- **State Management**: Zustand + Immer
- **LLM Access**: OpenRouter API (supports Claude, GPT, Gemini, DeepSeek)
- **Build Tool**: Vite
- **Storage**: LocalStorage (browser-local)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Usage

1. **Setup**: Enter your [OpenRouter API Key](https://openrouter.ai/keys) and optionally add MCP servers
2. **Design**: Describe your task in natural language and click "Design Swarm"
3. **Review**: Inspect the generated pipeline, todo list, and agent configurations
4. **Execute**: Click "Start" to run the pipeline and monitor progress in real-time
5. **Export**: Download results or save the swarm design as JSON for reuse

## Architecture

```
src/
├── types/          # TypeScript interfaces and data models
├── core/
│   ├── llm/        # OpenRouter LLM client (streaming support)
│   ├── mcp/        # MCP Client Manager (Streamable HTTP)
│   ├── designer/   # Swarm Designer (LLM-driven auto generation)
│   └── engine/     # Pipeline execution engine (DAG scheduler)
├── store/          # Zustand state management
├── components/
│   ├── setup/      # Onboarding / API key configuration
│   ├── workspace/  # Main 3-column workspace layout
│   ├── pipeline/   # React Flow graph, agent nodes, agent drawer
│   ├── todo/       # Todo list panel
│   ├── logs/       # Real-time log viewer
│   └── settings/   # Settings drawer
└── utils/          # Utility functions
```

## License

MIT
