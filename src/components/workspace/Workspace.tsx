import { useAppStore } from '../../store';
import { exportDesignAsJSON, importDesignFromJSON, isValidSwarmDesign } from '../../utils';
import TaskInput from './TaskInput';
import ExecutionControls from './ExecutionControls';
import ContextViewer from './ContextViewer';
import PipelineGraph from '../pipeline/PipelineGraph';
import AgentDrawer from '../pipeline/AgentDrawer';
import TodoList from '../todo/TodoList';
import LogViewer from '../logs/LogViewer';
import SettingsDrawer from '../settings/SettingsDrawer';

export default function Workspace() {
  const {
    setSettingsOpen,
    currentDesign,
    setCurrentDesign,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    settings,
    initNodeStates,
  } = useAppStore();

  const handleExport = () => {
    if (currentDesign) {
      exportDesignAsJSON(currentDesign);
    }
  };

  const handleImport = async () => {
    try {
      const data = await importDesignFromJSON();
      if (isValidSwarmDesign(data)) {
        setCurrentDesign(data);
        initNodeStates(data.topology.nodes.map((n) => n.id));
      }
    } catch {
      // user cancelled or invalid file
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Bar */}
      <header className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 shrink-0">
        <span className="font-semibold text-sm">🐝 AutoSwarm Designer</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={!currentDesign}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition disabled:opacity-50"
          >
            Export
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div
          className={`${leftPanelCollapsed ? 'w-8' : 'w-72'} border-r border-slate-700 flex flex-col shrink-0 transition-all duration-200 bg-slate-850`}
        >
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="h-8 flex items-center justify-center text-slate-500 hover:text-white text-xs border-b border-slate-700"
          >
            {leftPanelCollapsed ? '▶' : '◀'}
          </button>
          {!leftPanelCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <TaskInput />
              <div className="border-t border-slate-700">
                <TodoList />
              </div>
            </div>
          )}
        </div>

        {/* Center: Pipeline Graph */}
        <div className="flex-1 overflow-hidden">
          <PipelineGraph />
        </div>

        {/* Right Panel */}
        <div
          className={`${rightPanelCollapsed ? 'w-8' : 'w-72'} border-l border-slate-700 flex flex-col shrink-0 transition-all duration-200`}
        >
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="h-8 flex items-center justify-center text-slate-500 hover:text-white text-xs border-b border-slate-700"
          >
            {rightPanelCollapsed ? '◀' : '▶'}
          </button>
          {!rightPanelCollapsed && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ExecutionControls />
              <div className="flex-1 overflow-hidden border-t border-slate-700">
                <LogViewer />
              </div>
              <div className="border-t border-slate-700 max-h-48 overflow-y-auto">
                <ContextViewer />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-slate-800 border-t border-slate-700 flex items-center px-4 text-xs text-slate-500 shrink-0">
        <span>MCP Servers: {settings.mcpServers.filter((s) => s.connected).length}/{settings.mcpServers.length}</span>
        <span className="mx-3">|</span>
        <span>Model: {settings.selectedModel.split('/').pop()}</span>
        <span className="mx-3">|</span>
        <span>{currentDesign ? `Agents: ${currentDesign.topology.nodes.length}` : 'Ready'}</span>
      </footer>

      {/* Overlays */}
      <SettingsDrawer />
      <AgentDrawer />
    </div>
  );
}
