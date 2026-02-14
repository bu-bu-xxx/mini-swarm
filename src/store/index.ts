import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppSettings,
  AppView,
  ModelProvider,
  ProviderSettings,
  SwarmDesign,
  AgentNode,
  PipelineEdge,
  NodeExecutionState,
  LogEntry,
  ExecutionStatus,
  ContextEntry,
  NodeStatus,
  MCPServerConfig,
} from '../types';

interface AppState {
  // View
  view: AppView;
  setView: (view: AppView) => void;

  // Settings
  settings: AppSettings;
  setActiveProvider: (provider: ModelProvider) => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  addCustomModel: (model: string) => void;
  removeCustomModel: (model: string) => void;
  setProviderTestStatus: (status: ProviderSettings['testStatus'], message?: string) => void;
  setSetupComplete: (complete: boolean) => void;
  addMCPServer: (server: MCPServerConfig) => void;
  removeMCPServer: (id: string) => void;
  updateMCPServer: (id: string, updates: Partial<MCPServerConfig>) => void;

  // Swarm Design
  currentDesign: SwarmDesign | null;
  setCurrentDesign: (design: SwarmDesign | null) => void;
  isDesigning: boolean;
  setIsDesigning: (v: boolean) => void;
  designProgress: string;
  setDesignProgress: (msg: string) => void;

  // Design Editing
  addAgent: (agent: AgentNode) => void;
  removeAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<AgentNode>) => void;
  addEdge: (edge: PipelineEdge) => void;
  removeEdge: (edgeId: string) => void;
  newAgentId: () => string;

  // Execution
  executionStatus: ExecutionStatus;
  setExecutionStatus: (status: ExecutionStatus) => void;
  nodeStates: Record<string, NodeExecutionState>;
  setNodeStatus: (nodeId: string, status: NodeStatus, error?: string) => void;
  initNodeStates: (nodeIds: string[]) => void;

  // Logs
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // Context
  context: Record<string, ContextEntry>;
  setContextEntry: (key: string, entry: ContextEntry) => void;
  clearContext: () => void;

  // UI State
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  leftPanelCollapsed: boolean;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  rightPanelCollapsed: boolean;
  setRightPanelCollapsed: (collapsed: boolean) => void;
}

const DEFAULT_PROVIDER: ModelProvider = 'openrouter';

const defaultProviderSettings = (): ProviderSettings => ({
  apiKey: '',
  selectedModel: 'anthropic/claude-sonnet-4',
  customModels: [],
  testStatus: 'idle',
  testMessage: '',
});

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem('autoswarm_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.providers) {
        return {
          activeProvider: DEFAULT_PROVIDER,
          providers: {
            [DEFAULT_PROVIDER]: {
              ...defaultProviderSettings(),
              apiKey: parsed.apiKey || '',
              selectedModel: parsed.selectedModel || 'anthropic/claude-sonnet-4',
            },
          },
          mcpServers: parsed.mcpServers || [],
          setupComplete: parsed.setupComplete || false,
        };
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return {
    activeProvider: DEFAULT_PROVIDER,
    providers: {
      [DEFAULT_PROVIDER]: defaultProviderSettings(),
    },
    mcpServers: [],
    setupComplete: false,
  };
};

const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem('autoswarm_settings', JSON.stringify(settings));
  } catch { /* ignore */ }
};

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // View
    view: loadSettings().setupComplete ? 'workspace' : 'setup',
    setView: (view) => set((s) => { s.view = view; }),

    // Settings
    settings: loadSettings(),
    setActiveProvider: (provider) => set((s) => {
      if (!s.settings.providers[provider]) {
        s.settings.providers[provider] = defaultProviderSettings();
      }
      s.settings.activeProvider = provider;
      saveSettings(s.settings);
    }),
    setApiKey: (key) => set((s) => {
      const provider = s.settings.activeProvider || DEFAULT_PROVIDER;
      if (!s.settings.providers[provider]) {
        s.settings.providers[provider] = defaultProviderSettings();
      }
      s.settings.providers[provider].apiKey = key;
      s.settings.providers[provider].testStatus = 'idle';
      s.settings.providers[provider].testMessage = '';
      saveSettings(s.settings);
    }),
    setSelectedModel: (model) => set((s) => {
      const provider = s.settings.activeProvider || DEFAULT_PROVIDER;
      if (!s.settings.providers[provider]) {
        s.settings.providers[provider] = defaultProviderSettings();
      }
      s.settings.providers[provider].selectedModel = model;
      saveSettings(s.settings);
    }),
    addCustomModel: (model) => set((s) => {
      const provider = s.settings.activeProvider || DEFAULT_PROVIDER;
      if (!s.settings.providers[provider]) {
        s.settings.providers[provider] = defaultProviderSettings();
      }
      const providerSettings = s.settings.providers[provider];
      if (!providerSettings.customModels.includes(model)) {
        providerSettings.customModels.push(model);
      }
      providerSettings.selectedModel = model;
      saveSettings(s.settings);
    }),
    removeCustomModel: (model) => set((s) => {
      const provider = s.settings.activeProvider || DEFAULT_PROVIDER;
      const providerSettings = s.settings.providers[provider];
      if (!providerSettings) return;
      providerSettings.customModels = providerSettings.customModels.filter((m) => m !== model);
      if (providerSettings.selectedModel === model) {
        providerSettings.selectedModel = providerSettings.customModels[0] || 'anthropic/claude-sonnet-4';
      }
      saveSettings(s.settings);
    }),
    setProviderTestStatus: (status, message) => set((s) => {
      const provider = s.settings.activeProvider || DEFAULT_PROVIDER;
      if (!s.settings.providers[provider]) {
        s.settings.providers[provider] = defaultProviderSettings();
      }
      s.settings.providers[provider].testStatus = status;
      s.settings.providers[provider].testMessage = message;
      saveSettings(s.settings);
    }),
    setSetupComplete: (complete) => set((s) => {
      s.settings.setupComplete = complete;
      saveSettings(s.settings);
    }),
    addMCPServer: (server) => set((s) => {
      s.settings.mcpServers.push(server);
      saveSettings(s.settings);
    }),
    removeMCPServer: (id) => set((s) => {
      s.settings.mcpServers = s.settings.mcpServers.filter((s2) => s2.id !== id);
      saveSettings(s.settings);
    }),
    updateMCPServer: (id, updates) => set((s) => {
      const idx = s.settings.mcpServers.findIndex((s2) => s2.id === id);
      if (idx !== -1) {
        Object.assign(s.settings.mcpServers[idx], updates);
        saveSettings(s.settings);
      }
    }),

    // Swarm Design
    currentDesign: null,
    setCurrentDesign: (design) => set((s) => { s.currentDesign = design; }),
    isDesigning: false,
    setIsDesigning: (v) => set((s) => { s.isDesigning = v; }),
    designProgress: '',
    setDesignProgress: (msg) => set((s) => { s.designProgress = msg; }),

    // Design Editing
    newAgentId: () => `agent-${uuidv4().slice(0, 8)}`,
    addAgent: (agent) => set((s) => {
      if (!s.currentDesign) return;
      s.currentDesign.topology.nodes.push(agent);
      // New agents go into their own parallel group until connected
      s.currentDesign.topology.parallelGroups.push([agent.id]);
      // Init node state
      s.nodeStates[agent.id] = { nodeId: agent.id, status: 'idle', logs: [] };
    }),
    removeAgent: (agentId) => set((s) => {
      if (!s.currentDesign) return;
      s.currentDesign.topology.nodes = s.currentDesign.topology.nodes.filter((n) => n.id !== agentId);
      s.currentDesign.topology.edges = s.currentDesign.topology.edges.filter(
        (e) => e.source !== agentId && e.target !== agentId
      );
      s.currentDesign.topology.parallelGroups = s.currentDesign.topology.parallelGroups
        .map((g) => g.filter((id) => id !== agentId))
        .filter((g) => g.length > 0);
      delete s.nodeStates[agentId];
      if (s.selectedNodeId === agentId) s.selectedNodeId = null;
    }),
    updateAgent: (agentId, updates) => set((s) => {
      if (!s.currentDesign) return;
      const idx = s.currentDesign.topology.nodes.findIndex((n) => n.id === agentId);
      if (idx !== -1) {
        Object.assign(s.currentDesign.topology.nodes[idx], updates);
      }
    }),
    addEdge: (edge) => set((s) => {
      if (!s.currentDesign) return;
      // Avoid duplicate edges
      const exists = s.currentDesign.topology.edges.some(
        (e) => e.source === edge.source && e.target === edge.target
      );
      if (!exists) {
        s.currentDesign.topology.edges.push(edge);
      }
    }),
    removeEdge: (edgeId) => set((s) => {
      if (!s.currentDesign) return;
      s.currentDesign.topology.edges = s.currentDesign.topology.edges.filter((e) => e.id !== edgeId);
    }),

    // Execution
    executionStatus: 'idle',
    setExecutionStatus: (status) => set((s) => { s.executionStatus = status; }),
    nodeStates: {},
    setNodeStatus: (nodeId, status, error) => set((s) => {
      if (!s.nodeStates[nodeId]) {
        s.nodeStates[nodeId] = { nodeId, status: 'idle', logs: [] };
      }
      s.nodeStates[nodeId].status = status;
      if (status === 'running') s.nodeStates[nodeId].startTime = Date.now();
      if (status === 'completed' || status === 'failed') s.nodeStates[nodeId].endTime = Date.now();
      if (error) s.nodeStates[nodeId].error = error;
    }),
    initNodeStates: (nodeIds) => set((s) => {
      s.nodeStates = {};
      for (const id of nodeIds) {
        s.nodeStates[id] = { nodeId: id, status: 'idle', logs: [] };
      }
    }),

    // Logs
    logs: [],
    addLog: (log) => set((s) => { s.logs.push(log); }),
    clearLogs: () => set((s) => { s.logs = []; }),

    // Context
    context: {},
    setContextEntry: (key, entry) => set((s) => { s.context[key] = entry; }),
    clearContext: () => set((s) => { s.context = {}; }),

    // UI State
    settingsOpen: false,
    setSettingsOpen: (open) => set((s) => { s.settingsOpen = open; }),
    selectedNodeId: null,
    setSelectedNodeId: (id) => set((s) => { s.selectedNodeId = id; }),
    selectedEdgeId: null,
    setSelectedEdgeId: (id) => set((s) => { s.selectedEdgeId = id; }),
    leftPanelCollapsed: false,
    setLeftPanelCollapsed: (collapsed) => set((s) => { s.leftPanelCollapsed = collapsed; }),
    rightPanelCollapsed: false,
    setRightPanelCollapsed: (collapsed) => set((s) => { s.rightPanelCollapsed = collapsed; }),
  }))
);
