// Core data models for AutoSwarm Designer

export interface SwarmDesign {
  id: string;
  createdAt: number;
  taskDescription: string;
  modelUsed: string;
  todos: TodoItem[];
  topology: Topology;
}

export interface Topology {
  nodes: AgentNode[];
  edges: PipelineEdge[];
  parallelGroups: string[][];
}

export interface AgentNode {
  id: string;
  name: string;
  role: string;
  skillMarkdown: string;
  tools: string[];
  parallelGroup?: string;
  inputMappings: Mapping[];
  outputMappings: Mapping[];
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Mapping {
  from: string;
  to: string;
}

export interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedNodeIds: string[];
  dependencies: string[];
}

export interface ContextEntry {
  value: unknown;
  producedBy: string;
  timestamp: number;
  type: 'intermediate' | 'final' | 'file_reference';
}

export type NodeStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface NodeExecutionState {
  nodeId: string;
  status: NodeStatus;
  startTime?: number;
  endTime?: number;
  error?: string;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  token?: string;
  connected: boolean;
  tools: MCPToolInfo[];
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}

export interface AppSettings {
  apiKey: string;
  selectedModel: string;
  mcpServers: MCPServerConfig[];
  setupComplete: boolean;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AppView = 'setup' | 'workspace';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
