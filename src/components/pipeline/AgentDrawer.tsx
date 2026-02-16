import { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { cn } from '../../utils';

const BUILT_IN_TOOLS = ['file_read', 'file_write', 'file_list', 'file_delete'];

export default function AgentDrawer() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const currentDesign = useAppStore((s) => s.currentDesign);
  const nodeStates = useAppStore((s) => s.nodeStates);
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const context = useAppStore((s) => s.context);
  const updateAgent = useAppStore((s) => s.updateAgent);
  const removeAgent = useAppStore((s) => s.removeAgent);
  const mcpServers = useAppStore((s) => s.settings.mcpServers);
  const [editingSkill, setEditingSkill] = useState(false);
  const [skillDraft, setSkillDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showAddTool, setShowAddTool] = useState(false);
  const [customToolName, setCustomToolName] = useState('');

  // Local string buffers for per-agent parameter inputs (allows typing "-" without resetting)
  const [agTempStr, setAgTempStr] = useState('');
  const [agMaxTokStr, setAgMaxTokStr] = useState('');
  const [agMaxIterStr, setAgMaxIterStr] = useState('');

  const node = selectedNodeId && currentDesign
    ? currentDesign.topology.nodes.find((n) => n.id === selectedNodeId)
    : undefined;

  // Reset local buffers when selected node changes
  useEffect(() => {
    if (node) {
      setAgTempStr(node.temperature != null ? String(node.temperature) : '');
      setAgMaxTokStr(node.maxTokens != null ? String(node.maxTokens) : '');
      setAgMaxIterStr(node.maxIterations != null ? String(node.maxIterations) : '');
    }
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!node) return null;

  const state = nodeStates[node.id];
  const nodeContext = context[node.id] || context[node.name];

  const handleStartEditSkill = () => {
    setSkillDraft(node.skillMarkdown);
    setEditingSkill(true);
  };

  const handleSaveSkill = () => {
    updateAgent(node.id, { skillMarkdown: skillDraft });
    setEditingSkill(false);
  };

  const handleStartEditName = () => {
    setNameDraft(node.name);
    setEditingName(true);
  };

  const handleSaveName = () => {
    const newName = nameDraft.trim() || node.name;
    updateAgent(node.id, { name: newName });
    setEditingName(false);
  };

  const handleDelete = () => {
    removeAgent(node.id);
  };

  const handleRemoveTool = (toolName: string) => {
    updateAgent(node.id, { tools: node.tools.filter((t) => t !== toolName) });
  };

  const handleAddTool = (toolName: string) => {
    if (toolName && !node.tools.includes(toolName)) {
      updateAgent(node.id, { tools: [...node.tools, toolName] });
    }
    setShowAddTool(false);
    setCustomToolName('');
  };

  // Collect all available MCP tools from connected servers
  const mcpToolNames = mcpServers.flatMap((s) => s.tools.map((t) => t.name));
  const allKnownTools = [...new Set([...BUILT_IN_TOOLS, ...mcpToolNames])];
  const addableTools = allKnownTools.filter((t) => !node.tools.includes(t));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={() => setSelectedNodeId(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setSelectedNodeId(null); }}
      />

      <div className="relative ml-auto w-[420px] bg-slate-800 border-l border-slate-700 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
                <button onClick={() => setEditingName(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
              </div>
            ) : (
              <h2
                className="text-white font-semibold cursor-pointer hover:text-purple-300 transition"
                onClick={handleStartEditName}
                title="Click to edit name"
              >
                Agent: {node.name} ✏️
              </h2>
            )}
            <span className="text-xs text-slate-400">{node.role}</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-sm px-1"
              title="Delete agent"
            >
              🗑️
            </button>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Status */}
          {state && (
            <section>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Status</h3>
              <span className={cn(
                'text-xs px-2 py-1 rounded-full',
                state.status === 'idle' && 'bg-slate-600 text-slate-300',
                state.status === 'running' && 'bg-blue-600 text-blue-100',
                state.status === 'completed' && 'bg-green-600 text-green-100',
                state.status === 'failed' && 'bg-red-600 text-red-100',
              )}>
                {state.status}
              </span>
              {state.error && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
                  {state.error}
                </div>
              )}
            </section>
          )}

          {/* Skill / System Prompt */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase">Skill (System Prompt)</h3>
              {!editingSkill ? (
                <button
                  onClick={handleStartEditSkill}
                  className="text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  ✏️ Edit
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveSkill}
                    className="text-xs text-green-400 hover:text-green-300 transition"
                  >
                    ✓ Save
                  </button>
                  <button
                    onClick={() => setEditingSkill(false)}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>
            {editingSkill ? (
              <textarea
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                className="w-full h-48 px-3 py-2 bg-slate-900 border border-purple-500 rounded-lg text-xs text-slate-200 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            ) : (
              <div
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono cursor-pointer hover:border-purple-500 transition"
                onClick={handleStartEditSkill}
                title="Click to edit"
              >
                {node.skillMarkdown}
              </div>
            )}
          </section>

          {/* Tools */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase">
                Available Tools ({node.tools.length})
              </h3>
              <button
                onClick={() => setShowAddTool(!showAddTool)}
                className="text-xs text-purple-400 hover:text-purple-300 transition"
              >
                ➕ Add
              </button>
            </div>
            {showAddTool && (
              <div className="mb-2 p-2 bg-slate-900 border border-slate-600 rounded-lg space-y-2">
                {addableTools.length > 0 && (
                  <div className="space-y-1">
                    {addableTools.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleAddTool(t)}
                        className="w-full text-left text-xs px-2 py-1 rounded hover:bg-slate-700 text-slate-300 transition"
                      >
                        🔧 {t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customToolName}
                    onChange={(e) => setCustomToolName(e.target.value)}
                    placeholder="Custom tool name..."
                    className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => { if (e.key === 'Enter' && customToolName.trim()) handleAddTool(customToolName.trim()); }}
                  />
                  <button
                    onClick={() => { if (customToolName.trim()) handleAddTool(customToolName.trim()); }}
                    disabled={!customToolName.trim()}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-xs transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {node.tools.map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs group">
                  <span className="text-purple-400">🔧</span>
                  <span className="text-slate-300 flex-1">{t}</span>
                  <button
                    onClick={() => handleRemoveTool(t)}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    title="Remove tool"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Parameters */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Parameters</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 w-24">Temperature</label>
                <input
                  type="number"
                  min="-1"
                  max="2"
                  step="0.1"
                  value={agTempStr}
                  placeholder="default"
                  onChange={(e) => setAgTempStr(e.target.value)}
                  onBlur={() => { if (!agTempStr) updateAgent(node.id, { temperature: undefined }); else { const v = Number(agTempStr); if (!isNaN(v)) updateAgent(node.id, { temperature: v }); else setAgTempStr(node.temperature != null ? String(node.temperature) : ''); } }}
                  className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 w-24">Max Tokens</label>
                <input
                  type="number"
                  min="-1"
                  max="128000"
                  step="256"
                  value={agMaxTokStr}
                  placeholder="default"
                  onChange={(e) => setAgMaxTokStr(e.target.value)}
                  onBlur={() => { if (!agMaxTokStr) updateAgent(node.id, { maxTokens: undefined }); else { const v = Number(agMaxTokStr); if (!isNaN(v)) updateAgent(node.id, { maxTokens: v }); else setAgMaxTokStr(node.maxTokens != null ? String(node.maxTokens) : ''); } }}
                  className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 w-24">Max Iterations</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={agMaxIterStr}
                  placeholder="default"
                  onChange={(e) => setAgMaxIterStr(e.target.value)}
                  onBlur={() => { if (!agMaxIterStr) updateAgent(node.id, { maxIterations: undefined }); else { const v = Number(agMaxIterStr); if (!isNaN(v)) updateAgent(node.id, { maxIterations: v }); else setAgMaxIterStr(node.maxIterations != null ? String(node.maxIterations) : ''); } }}
                  className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-xs text-slate-500">Leave empty to use global defaults. Set -1 to omit from API request.</p>
            </div>
          </section>

          {/* Input Mappings */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Input Mappings</h3>
            {node.inputMappings.length === 0 ? (
              <p className="text-xs text-slate-500">No inputs (root node)</p>
            ) : (
              <div className="space-y-1">
                {node.inputMappings.map((m, i) => (
                  <div key={i} className="text-xs text-slate-300">
                    <span className="text-blue-400">{m.from}</span> → <span className="text-green-400">{m.to}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Output Mappings */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Output Mappings</h3>
            <div className="space-y-1">
              {node.outputMappings.map((m, i) => (
                <div key={i} className="text-xs text-slate-300">
                  <span className="text-blue-400">{m.from}</span> → <span className="text-green-400">{m.to}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Output (if available) */}
          {nodeContext && (
            <section>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Output</h3>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {typeof nodeContext.value === 'string'
                  ? nodeContext.value
                  : JSON.stringify(nodeContext.value, null, 2)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
