import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AppSettings,
  AppView,
  SwarmDesign,
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
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
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
  leftPanelCollapsed: boolean;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  rightPanelCollapsed: boolean;
  setRightPanelCollapsed: (collapsed: boolean) => void;
}

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem('autoswarm_settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return {
    apiKey: '',
    selectedModel: 'anthropic/claude-sonnet-4',
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
    setApiKey: (key) => set((s) => {
      s.settings.apiKey = key;
      saveSettings(s.settings);
    }),
    setSelectedModel: (model) => set((s) => {
      s.settings.selectedModel = model;
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
    leftPanelCollapsed: false,
    setLeftPanelCollapsed: (collapsed) => set((s) => { s.leftPanelCollapsed = collapsed; }),
    rightPanelCollapsed: false,
    setRightPanelCollapsed: (collapsed) => set((s) => { s.rightPanelCollapsed = collapsed; }),
  }))
);
