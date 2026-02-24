export type Language = 'en' | 'zh';

export const translations = {
  en: {
    // Header
    'header.title': 'MiniSwarm Designer',
    'header.import': 'Import',
    'header.export': 'Export',
    'header.settings': 'Settings',
    'header.noModel': 'No model',

    // Footer
    'footer.mcpServers': 'MCP Servers',
    'footer.model': 'Model',
    'footer.agents': 'Agents',
    'footer.ready': 'Ready',
    'footer.none': 'None',

    // Panel collapse
    'panel.collapse': 'Collapse panel',
    'panel.expand': 'Expand panel',

    // Task Input
    'task.title': 'Task',
    'task.placeholder': "Describe your task... e.g., 'Research AI frameworks and write a comparison report'",
    'task.designButton': '🐝 Design Swarm',
    'task.designing': '🔄 Designing...',
    'task.prompt': 'Prompt',
    'task.refineTitle': 'Refine Pipeline',
    'task.refinePlaceholder': "Describe changes... e.g., 'Add a testing agent' or 'Remove the reviewer'",
    'task.refineButton': '✨ Refine Pipeline',
    'task.disabledNoTask': 'Enter a task description first',
    'task.disabledNoKey': 'Set API key in Settings first',

    // Execution
    'execution.title': 'Execution',
    'execution.start': 'Start',
    'execution.pause': 'Pause',
    'execution.resume': 'Resume',
    'execution.stop': 'Stop',
    'execution.disabledNoDesign': 'Design a swarm first',
    'execution.disabledNoKey': 'Set API key in Settings first',

    // Logs
    'logs.title': 'Logs',
    'logs.empty': 'No logs yet',

    // Summary
    'summary.title': 'Summary',
    'summary.prompt': 'Prompt',
    'summary.empty': 'Summaries will appear here once the pipeline runs',

    // File Manager
    'files.workspace': 'Workspace',
    'files.upload': 'Upload',
    'files.dropHint': 'Drop files here or click Upload',
    'files.savedOutputs': 'Saved Outputs',
    'files.outputsEmpty': 'Run pipeline to see outputs',
    'files.clearAll': 'Clear all files',
    'files.clearOutputs': 'Clear all outputs',
    'files.downloadZip': 'Download as ZIP',
    'files.deleteDir': 'Delete directory',
    'files.delete': 'Delete',
    'files.opfsWarning': 'OPFS not supported. Files stored in memory only — lost on refresh.',
    'files.confirmClearWorkspace': 'Clear all workspace files? This cannot be undone.',
    'files.confirmClearOutputs': 'Clear all saved outputs? This cannot be undone.',

    // Todo
    'todo.title': 'Todo List',
    'todo.empty': 'No tasks yet. Design a swarm first.',
    'todo.agents': 'Agents',

    // Pipeline Graph
    'graph.empty.line1': 'Describe a task to generate your Agent Swarm',
    'graph.empty.line2': 'The pipeline will appear here',
    'graph.addAgent': '➕ Add Agent',
    'graph.newAgent': 'New Agent',
    'graph.agentName': 'Agent name...',
    'graph.add': 'Add',
    'graph.cancel': 'Cancel',
    'graph.deleteTip': 'Tip: Select a node and press Delete to remove it',

    // Agent Drawer
    'agent.title': 'Agent',
    'agent.confirmDelete': 'Delete this agent? This cannot be undone.',
    'agent.status': 'Status',
    'agent.skill': 'Skill (System Prompt)',
    'agent.edit': 'Edit',
    'agent.save': 'Save',
    'agent.tools': 'Available Tools',
    'agent.addTool': 'Add',
    'agent.customTool': 'Custom tool name...',
    'agent.removeTool': 'Remove tool',
    'agent.parameters': 'Parameters',
    'agent.temperature': 'Temperature',
    'agent.maxTokens': 'Max Tokens',
    'agent.maxIterations': 'Max Iterations',
    'agent.paramHint': 'Leave empty to use global defaults. Set -1 to omit from API request.',
    'agent.inputMappings': 'Input Mappings',
    'agent.noInputs': 'No inputs (root node)',
    'agent.outputMappings': 'Output Mappings',
    'agent.output': 'Output',

    // Edge Drawer
    'edge.title': 'Connection',
    'edge.details': 'Connection Details',
    'edge.from': 'From',
    'edge.to': 'To',
    'edge.label': 'Label',
    'edge.actions': 'Actions',
    'edge.delete': '🗑️ Delete Connection',
    'edge.confirmDelete': 'Delete this connection? This cannot be undone.',
    'edge.tip': 'Tip: You can also select a connection and press Delete or Backspace to remove it.',

    // Generated Pages
    'pages.title': 'Generated Pages',
    'pages.clear': 'Clear',
    'pages.empty': 'No generated pages yet',
    'pages.open': 'Open',
    'pages.confirmClear': 'Clear all generated page links?',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.llmConfig': 'LLM Configuration',
    'settings.provider': 'Provider',
    'settings.apiKey': 'OpenRouter API Key',
    'settings.testConnection': 'Test Connection',
    'settings.testing': 'Testing connection…',
    'settings.connected': 'Connected to OpenRouter',
    'settings.connectionFailed': 'Connection failed',
    'settings.testHint': 'Enter key and test connection',
    'settings.model': 'Model (OpenRouter)',
    'settings.addCustomModel': 'Add custom model (vendor/model)',
    'settings.customModels': 'Custom models',
    'settings.remove': 'Remove',
    'settings.agentDefaults': 'Agent Defaults',
    'settings.tempLabel': 'Temperature (0-2, or -1 to omit)',
    'settings.maxTokensLabel': 'Max Tokens (-1 to omit)',
    'settings.maxIterLabel': 'Max Iterations (ReAct loop limit)',
    'settings.paramHint': 'Set -1 to omit the parameter from the API request (use provider defaults).',
    'settings.mcpServers': 'MCP Servers',
    'settings.serverName': 'Server name',
    'settings.serverUrl': 'Server URL (e.g. https://mcp.example.com)',
    'settings.authToken': 'Auth token (optional)',
    'settings.addServer': 'Add Server',
    'settings.connecting': 'Connecting...',

    // Setup Page
    'setup.title': '🐝 MiniSwarm Designer',
    'setup.subtitle': 'Automated Agent Swarm Design & Visualization',
    'setup.chooseProvider': '1. Choose Provider',
    'setup.selectModel': '2. Select OpenRouter Model',
    'setup.addMCP': '3. Add MCP Servers (Optional)',
    'setup.enterWorkspace': 'Enter Workspace →',
    'setup.getApiKey': 'How to get an API key →',
    'setup.test': 'Test',

    // Prompt Editor
    'prompt.reset': 'Reset',
    'prompt.save': 'Save',

    // Roles
    'role.researcher': 'Researcher',
    'role.coder': 'Coder',
    'role.reviewer': 'Reviewer',
    'role.coordinator': 'Coordinator',
    'role.writer': 'Writer',
    'role.analyst': 'Analyst',

    // Status
    'status.idle': 'Idle',
    'status.running': 'Running',
    'status.paused': 'Paused',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',

    // Export tooltip
    'export.disabled': 'Design a swarm first',
  },
  zh: {
    // Header
    'header.title': 'MiniSwarm 设计器',
    'header.import': '导入',
    'header.export': '导出',
    'header.settings': '设置',
    'header.noModel': '未选择模型',

    // Footer
    'footer.mcpServers': 'MCP 服务',
    'footer.model': '模型',
    'footer.agents': '代理',
    'footer.ready': '就绪',
    'footer.none': '无',

    // Panel collapse
    'panel.collapse': '收起面板',
    'panel.expand': '展开面板',

    // Task Input
    'task.title': '任务',
    'task.placeholder': '描述你的任务... 例如: "研究 AI 框架并撰写对比报告"',
    'task.designButton': '🐝 设计 Swarm',
    'task.designing': '🔄 设计中...',
    'task.prompt': '提示词',
    'task.refineTitle': '优化流水线',
    'task.refinePlaceholder': '描述修改... 例如: "添加一个测试代理" 或 "移除审核员"',
    'task.refineButton': '✨ 优化流水线',
    'task.disabledNoTask': '请先输入任务描述',
    'task.disabledNoKey': '请先在设置中配置 API Key',

    // Execution
    'execution.title': '执行',
    'execution.start': '开始',
    'execution.pause': '暂停',
    'execution.resume': '继续',
    'execution.stop': '停止',
    'execution.disabledNoDesign': '请先设计一个 Swarm',
    'execution.disabledNoKey': '请先在设置中配置 API Key',

    // Logs
    'logs.title': '日志',
    'logs.empty': '暂无日志',

    // Summary
    'summary.title': '摘要',
    'summary.prompt': '提示词',
    'summary.empty': '流水线运行后将在此显示实时摘要',

    // File Manager
    'files.workspace': '工作区',
    'files.upload': '上传',
    'files.dropHint': '拖放文件到此处或点击上传',
    'files.savedOutputs': '已保存输出',
    'files.outputsEmpty': '运行流水线后查看输出',
    'files.clearAll': '清除所有文件',
    'files.clearOutputs': '清除所有输出',
    'files.downloadZip': '下载为 ZIP',
    'files.deleteDir': '删除目录',
    'files.delete': '删除',
    'files.opfsWarning': 'OPFS 不支持。文件仅存储在内存中 — 刷新后丢失。',
    'files.confirmClearWorkspace': '清除所有工作区文件？此操作不可撤销。',
    'files.confirmClearOutputs': '清除所有已保存输出？此操作不可撤销。',

    // Todo
    'todo.title': '任务列表',
    'todo.empty': '暂无任务。请先设计一个 Swarm。',
    'todo.agents': '代理',

    // Pipeline Graph
    'graph.empty.line1': '描述一个任务来生成你的 Agent Swarm',
    'graph.empty.line2': '流水线将在此显示',
    'graph.addAgent': '➕ 添加代理',
    'graph.newAgent': '新代理',
    'graph.agentName': '代理名称...',
    'graph.add': '添加',
    'graph.cancel': '取消',
    'graph.deleteTip': '提示: 选中节点后按 Delete 键可删除',

    // Agent Drawer
    'agent.title': '代理',
    'agent.confirmDelete': '删除此代理？此操作不可撤销。',
    'agent.status': '状态',
    'agent.skill': '技能 (系统提示词)',
    'agent.edit': '编辑',
    'agent.save': '保存',
    'agent.tools': '可用工具',
    'agent.addTool': '添加',
    'agent.customTool': '自定义工具名称...',
    'agent.removeTool': '移除工具',
    'agent.parameters': '参数',
    'agent.temperature': '温度',
    'agent.maxTokens': '最大 Token 数',
    'agent.maxIterations': '最大迭代数',
    'agent.paramHint': '留空使用全局默认值。设为 -1 从 API 请求中省略。',
    'agent.inputMappings': '输入映射',
    'agent.noInputs': '无输入 (根节点)',
    'agent.outputMappings': '输出映射',
    'agent.output': '输出',

    // Edge Drawer
    'edge.title': '连接',
    'edge.details': '连接详情',
    'edge.from': '从',
    'edge.to': '到',
    'edge.label': '标签',
    'edge.actions': '操作',
    'edge.delete': '🗑️ 删除连接',
    'edge.confirmDelete': '删除此连接？此操作不可撤销。',
    'edge.tip': '提示: 也可以选中连接后按 Delete 或 Backspace 键删除。',

    // Generated Pages
    'pages.title': '生成的页面',
    'pages.clear': '清除',
    'pages.empty': '暂无生成的页面',
    'pages.open': '打开',
    'pages.confirmClear': '清除所有生成的页面链接？',

    // Settings
    'settings.title': '设置',
    'settings.language': '语言',
    'settings.llmConfig': 'LLM 配置',
    'settings.provider': '提供商',
    'settings.apiKey': 'OpenRouter API 密钥',
    'settings.testConnection': '测试连接',
    'settings.testing': '测试中…',
    'settings.connected': '已连接到 OpenRouter',
    'settings.connectionFailed': '连接失败',
    'settings.testHint': '输入密钥并测试连接',
    'settings.model': '模型 (OpenRouter)',
    'settings.addCustomModel': '添加自定义模型 (vendor/model)',
    'settings.customModels': '自定义模型',
    'settings.remove': '删除',
    'settings.agentDefaults': '代理默认参数',
    'settings.tempLabel': '温度 (0-2，或 -1 省略)',
    'settings.maxTokensLabel': '最大 Token 数 (-1 省略)',
    'settings.maxIterLabel': '最大迭代数 (ReAct 循环限制)',
    'settings.paramHint': '设为 -1 可从 API 请求中省略该参数（使用提供商默认值）。',
    'settings.mcpServers': 'MCP 服务',
    'settings.serverName': '服务名称',
    'settings.serverUrl': '服务 URL (例如 https://mcp.example.com)',
    'settings.authToken': '认证令牌 (可选)',
    'settings.addServer': '添加服务',
    'settings.connecting': '连接中...',

    // Setup Page
    'setup.title': '🐝 MiniSwarm 设计器',
    'setup.subtitle': '自动化 Agent Swarm 设计与可视化',
    'setup.chooseProvider': '1. 选择提供商',
    'setup.selectModel': '2. 选择 OpenRouter 模型',
    'setup.addMCP': '3. 添加 MCP 服务 (可选)',
    'setup.enterWorkspace': '进入工作区 →',
    'setup.getApiKey': '如何获取 API 密钥 →',
    'setup.test': '测试',

    // Prompt Editor
    'prompt.reset': '重置',
    'prompt.save': '保存',

    // Roles
    'role.researcher': '研究员',
    'role.coder': '程序员',
    'role.reviewer': '审核员',
    'role.coordinator': '协调员',
    'role.writer': '作者',
    'role.analyst': '分析师',

    // Status
    'status.idle': '空闲',
    'status.running': '运行中',
    'status.paused': '已暂停',
    'status.completed': '已完成',
    'status.failed': '失败',
    'status.connected': '已连接',
    'status.disconnected': '未连接',

    // Export tooltip
    'export.disabled': '请先设计一个 Swarm',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.en[key] || key;
}
