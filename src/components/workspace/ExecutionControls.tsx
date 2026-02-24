import { useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { PipelineEngine } from '../../core/engine/pipeline';
import { v4 as uuidv4 } from 'uuid';

export default function ExecutionControls() {
  const {
    settings,
    currentDesign,
    executionStatus,
    setExecutionStatus,
    setNodeStatus,
    addLog,
    setContextEntry,
    clearContext,
    initNodeStates,
    clearLogs,
    addGeneratedPage,
    clearGeneratedPages,
    refreshWorkspaceFiles,
    refreshOutputFiles,
    addSummaryEntry,
    clearSummaryEntries,
    summarySystemPrompt,
  } = useAppStore();
  const t = useT();

  const engineRef = useRef<PipelineEngine | null>(null);

  const handleStart = useCallback(async () => {
    const providerSettings = settings.providers[settings.activeProvider] || {
      apiKey: '',
      selectedModel: '',
      customModels: [],
      testStatus: 'idle',
    };
    if (!currentDesign || !providerSettings.apiKey) return;

    clearLogs();
    clearContext();
    clearGeneratedPages();
    clearSummaryEntries();
    initNodeStates(currentDesign.topology.nodes.map((n) => n.id));
    setExecutionStatus('running');

    const engine = new PipelineEngine(providerSettings.apiKey, providerSettings.selectedModel, {
      onNodeStatusChange: (nodeId, status, error) => {
        setNodeStatus(nodeId, status, error);
      },
      onLog: (log) => {
        addLog(log);
      },
      onContextUpdate: (key, entry) => {
        setContextEntry(key, entry);
      },
      onOutputsPersisted: () => {
        refreshWorkspaceFiles();
        refreshOutputFiles();
      },
      onWorkspaceChanged: () => {
        refreshWorkspaceFiles();
      },
      onPagePreviewGenerated: (preview) => {
        addGeneratedPage({
          id: uuidv4(),
          entryPath: preview.entryPath,
          title: preview.title,
          url: preview.url,
          timestamp: preview.timestamp,
          generatedBy: preview.generatedBy,
        });
      },
      onSummaryGenerated: (entry) => {
        addSummaryEntry(entry);
      },
    }, settings.agentDefaults, summarySystemPrompt || undefined);

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
  }, [currentDesign, settings.activeProvider, settings.providers, settings.agentDefaults, summarySystemPrompt, clearLogs, clearContext, clearGeneratedPages, clearSummaryEntries, initNodeStates, setExecutionStatus, setNodeStatus, addLog, setContextEntry, addGeneratedPage, addSummaryEntry, refreshWorkspaceFiles, refreshOutputFiles]);

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

  const statusColorsDot: Record<string, string> = {
    idle: 'bg-slate-400',
    running: 'bg-blue-400',
    paused: 'bg-yellow-400',
    completed: 'bg-green-400',
    failed: 'bg-red-400',
  };

  const statusColorsText: Record<string, string> = {
    idle: 'text-slate-400',
    running: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };

  const statusTranslationKeys: Record<string, 'status.idle' | 'status.running' | 'status.paused' | 'status.completed' | 'status.failed'> = {
    idle: 'status.idle',
    running: 'status.running',
    paused: 'status.paused',
    completed: 'status.completed',
    failed: 'status.failed',
  };

  const hasDesign = !!currentDesign;
  const hasKey = !!(settings.providers[settings.activeProvider]?.apiKey);
  const startDisabled = !hasDesign || !hasKey;
  const startTitle = !hasDesign ? t('execution.disabledNoDesign') : !hasKey ? t('execution.disabledNoKey') : undefined;

  return (
    <div className="p-3 border-b border-slate-700">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">{t('execution.title')}</h3>

      <div className="flex items-center gap-1.5 mb-2">
        <span className={`inline-block w-2 h-2 rounded-full ${statusColorsDot[executionStatus]}`} />
        <span className={`text-xs ${statusColorsText[executionStatus]}`}>
          {t(statusTranslationKeys[executionStatus] || 'status.idle')}
        </span>
      </div>

      <div className="flex gap-1.5">
        {executionStatus === 'idle' || executionStatus === 'completed' || executionStatus === 'failed' ? (
          <button
            onClick={handleStart}
            disabled={startDisabled}
            title={startTitle}
            className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition"
          >
            ▶ {t('execution.start')}
          </button>
        ) : null}

        {executionStatus === 'running' && (
          <button
            onClick={handlePause}
            className="flex-1 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-medium transition"
          >
            ⏸ {t('execution.pause')}
          </button>
        )}

        {executionStatus === 'paused' && (
          <button
            onClick={handleResume}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
          >
            ▶ {t('execution.resume')}
          </button>
        )}

        {(executionStatus === 'running' || executionStatus === 'paused') && (
          <button
            onClick={handleStop}
            className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition"
          >
            ⏹ {t('execution.stop')}
          </button>
        )}
      </div>
    </div>
  );
}
