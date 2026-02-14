import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store';
import { designSwarm, refineSwarm } from '../../core/designer/designer';
import { mcpManager } from '../../core/mcp/client';
import { AVAILABLE_MODELS } from '../../core/llm/openrouter';

export default function TaskInput() {
  const [task, setTask] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const {
    settings,
    setSelectedModel,
    isDesigning,
    setIsDesigning,
    designProgress,
    setDesignProgress,
    currentDesign,
    setCurrentDesign,
    clearLogs,
    clearContext,
    initNodeStates,
    setExecutionStatus,
  } = useAppStore();

  const activeProvider = settings.activeProvider;
  const providerSettings = settings.providers[activeProvider] || {
    apiKey: '',
    selectedModel: AVAILABLE_MODELS[0].id,
    customModels: [],
    testStatus: 'idle',
    testMessage: '',
  };

  const savedModels = useMemo(() => ([
    ...AVAILABLE_MODELS.map((m) => ({ id: m.id, name: `OpenRouter • ${m.name}` })),
    ...providerSettings.customModels.map((id) => ({ id, name: `OpenRouter • ${id}` })),
  ]), [providerSettings.customModels]);

  const handleDesign = useCallback(async () => {
    if (!task.trim() || !providerSettings.apiKey) return;

    setIsDesigning(true);
    setDesignProgress('Starting design...');
    clearLogs();
    clearContext();
    setExecutionStatus('idle');

    try {
      const design = await designSwarm({
        task: task.trim(),
        apiKey: providerSettings.apiKey,
        model: providerSettings.selectedModel,
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
  }, [task, providerSettings.apiKey, providerSettings.selectedModel, setIsDesigning, setDesignProgress, clearLogs, clearContext, setExecutionStatus, setCurrentDesign, initNodeStates]);

  const handleRefine = useCallback(async () => {
    if (!refinePrompt.trim() || !providerSettings.apiKey || !currentDesign) return;

    setIsDesigning(true);
    setDesignProgress('Refining pipeline...');

    try {
      const design = await refineSwarm({
        currentDesign,
        refinementPrompt: refinePrompt.trim(),
        apiKey: providerSettings.apiKey,
        model: providerSettings.selectedModel,
        availableTools: mcpManager.getAvailableTools(),
        onProgress: (msg) => setDesignProgress(msg),
      });

      setCurrentDesign(design);
      initNodeStates(design.topology.nodes.map((n) => n.id));
      setRefinePrompt('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setDesignProgress(`Error: ${message}`);
    } finally {
      setIsDesigning(false);
    }
  }, [refinePrompt, providerSettings.apiKey, providerSettings.selectedModel, currentDesign, setIsDesigning, setDesignProgress, setCurrentDesign, initNodeStates]);

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
          value={providerSettings.selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isDesigning}
        >
          {savedModels.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleDesign}
        disabled={!task.trim() || !providerSettings.apiKey || isDesigning}
        className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
      >
        {isDesigning ? '🔄 Designing...' : '🐝 Design Swarm'}
      </button>

      {/* Refine Pipeline Section */}
      {currentDesign && !isDesigning && (
        <div className="pt-2 border-t border-slate-700 space-y-2">
          <h3 className="text-sm font-semibold text-slate-400 uppercase">Refine Pipeline</h3>
          <textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Describe changes... e.g., 'Add a testing agent' or 'Remove the reviewer and merge its tasks with the coder'"
            className="w-full h-16 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isDesigning}
          />
          <button
            onClick={handleRefine}
            disabled={!refinePrompt.trim() || !providerSettings.apiKey || isDesigning}
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            ✨ Refine Pipeline
          </button>
        </div>
      )}

      {isDesigning && designProgress && (
        <div className="text-xs text-purple-400 animate-pulse">{designProgress}</div>
      )}
    </div>
  );
}
