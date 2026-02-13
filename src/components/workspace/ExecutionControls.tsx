import { useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { PipelineEngine } from '../../core/engine/pipeline';

export default function ExecutionControls() {
  const {
    settings,
    currentDesign,
    executionStatus,
    setExecutionStatus,
    setNodeStatus,
    addLog,
    setContextEntry,
    initNodeStates,
    clearLogs,
  } = useAppStore();

  const engineRef = useRef<PipelineEngine | null>(null);

  const handleStart = useCallback(async () => {
    if (!currentDesign || !settings.apiKey) return;

    clearLogs();
    initNodeStates(currentDesign.topology.nodes.map((n) => n.id));
    setExecutionStatus('running');

    const engine = new PipelineEngine(settings.apiKey, settings.selectedModel, {
      onNodeStatusChange: (nodeId, status, error) => {
        setNodeStatus(nodeId, status, error);
      },
      onLog: (log) => {
        addLog(log);
      },
      onContextUpdate: (key, entry) => {
        setContextEntry(key, entry);
      },
    });

    engineRef.current = engine;

    try {
      await engine.execute(currentDesign);
      setExecutionStatus('completed');
    } catch (err) {
      setExecutionStatus('failed');
      addLog({
        timestamp: Date.now(),
        nodeId: 'system',
        nodeName: 'System',
        message: `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
        level: 'error',
      });
    }
  }, [currentDesign, settings.apiKey, settings.selectedModel, clearLogs, initNodeStates, setExecutionStatus, setNodeStatus, addLog, setContextEntry]);

  const handlePause = useCallback(() => {
    if (executionStatus === 'running' && engineRef.current) {
      engineRef.current.pause();
      setExecutionStatus('paused');
    }
  }, [executionStatus, setExecutionStatus]);

  const handleResume = useCallback(() => {
    if (executionStatus === 'paused' && engineRef.current) {
      engineRef.current.resume();
      setExecutionStatus('running');
    }
  }, [executionStatus, setExecutionStatus]);

  const handleStop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.abort();
      setExecutionStatus('idle');
    }
  }, [setExecutionStatus]);

  const statusColors: Record<string, string> = {
    idle: 'text-slate-400',
    running: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };

  return (
    <div className="p-3 border-b border-slate-700">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Execution</h3>

      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-xs ${statusColors[executionStatus]}`}>
          ● {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
        </span>
      </div>

      <div className="flex gap-1.5">
        {executionStatus === 'idle' || executionStatus === 'completed' || executionStatus === 'failed' ? (
          <button
            onClick={handleStart}
            disabled={!currentDesign || !settings.apiKey}
            className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition"
          >
            ▶ Start
          </button>
        ) : null}

        {executionStatus === 'running' && (
          <button
            onClick={handlePause}
            className="flex-1 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-medium transition"
          >
            ⏸ Pause
          </button>
        )}

        {executionStatus === 'paused' && (
          <button
            onClick={handleResume}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
          >
            ▶ Resume
          </button>
        )}

        {(executionStatus === 'running' || executionStatus === 'paused') && (
          <button
            onClick={handleStop}
            className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition"
          >
            ⏹ Stop
          </button>
        )}
      </div>
    </div>
  );
}
