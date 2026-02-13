import { useState, useCallback } from 'react';
import { useAppStore } from '../../store';
import { designSwarm } from '../../core/designer/designer';
import { mcpManager } from '../../core/mcp/client';
import { AVAILABLE_MODELS } from '../../core/llm/openrouter';

export default function TaskInput() {
  const [task, setTask] = useState('');
  const {
    settings,
    setSelectedModel,
    isDesigning,
    setIsDesigning,
    designProgress,
    setDesignProgress,
    setCurrentDesign,
    clearLogs,
    clearContext,
    initNodeStates,
    setExecutionStatus,
  } = useAppStore();

  const handleDesign = useCallback(async () => {
    if (!task.trim() || !settings.apiKey) return;

    setIsDesigning(true);
    setDesignProgress('Starting design...');
    clearLogs();
    clearContext();
    setExecutionStatus('idle');

    try {
      const design = await designSwarm({
        task: task.trim(),
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        availableTools: mcpManager.getAvailableTools(),
        onProgress: (msg) => setDesignProgress(msg),
      });

      setCurrentDesign(design);
      initNodeStates(design.topology.nodes.map((n) => n.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setDesignProgress(`Error: ${message}`);
    } finally {
      setIsDesigning(false);
    }
  }, [task, settings.apiKey, settings.selectedModel, setIsDesigning, setDesignProgress, clearLogs, clearContext, setExecutionStatus, setCurrentDesign, initNodeStates]);

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase">Task</h3>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Describe your task... e.g., 'Research AI frameworks and write a comparison report'"
        className="w-full h-24 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        disabled={isDesigning}
      />

      <div className="flex items-center gap-2">
        <select
          value={settings.selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isDesigning}
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleDesign}
        disabled={!task.trim() || !settings.apiKey || isDesigning}
        className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
      >
        {isDesigning ? '🔄 Designing...' : '🐝 Design Swarm'}
      </button>

      {isDesigning && designProgress && (
        <div className="text-xs text-purple-400 animate-pulse">{designProgress}</div>
      )}
    </div>
  );
}
