import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../../store';
import { AVAILABLE_MODELS } from '../../core/llm/openrouter';
import { mcpManager } from '../../core/mcp/client';
import type { MCPServerConfig } from '../../types';

export default function SetupPage() {
  const { settings, setApiKey, setSelectedModel, addMCPServer, removeMCPServer, updateMCPServer, setSetupComplete, setView } = useAppStore();
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpToken, setMcpToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  const handleAddMCP = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) return;
    const server: MCPServerConfig = {
      id: uuidv4(),
      name: mcpName.trim(),
      url: mcpUrl.trim(),
      token: mcpToken.trim() || undefined,
      connected: false,
      tools: [],
    };
    addMCPServer(server);
    setMcpName('');
    setMcpUrl('');
    setMcpToken('');

    // Attempt to connect
    setConnecting(true);
    try {
      const tools = await mcpManager.connect(server);
      updateMCPServer(server.id, { connected: true, tools });
    } catch {
      // Connection failed, server remains disconnected
    } finally {
      setConnecting(false);
    }
  };

  const isCustomModel = settings.selectedModel === 'custom' ||
    !AVAILABLE_MODELS.some(m => m.id === settings.selectedModel);

  const handleModelChange = (value: string) => {
    if (value === 'custom') {
      setSelectedModel('custom');
      setCustomModelName('');
    } else {
      setSelectedModel(value);
      setCustomModelName('');
    }
  };

  const handleCustomModelNameChange = (value: string) => {
    setCustomModelName(value);
    if (value.trim()) {
      setSelectedModel(value.trim());
    }
  };

  const handleEnter = () => {
    if (!settings.apiKey.trim()) return;
    setSetupComplete(true);
    setView('workspace');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🐝 AutoSwarm Designer</h1>
          <p className="text-slate-400">Automated Agent Swarm Design & Visualization</p>
        </div>

        {/* Step 1: API Key */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            1. Configure OpenRouter API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block"
          >
            How to get an API key →
          </a>
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Model
          </label>
          <select
            value={isCustomModel ? 'custom' : settings.selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="custom">Custom (OpenRouter Model)</option>
          </select>
          {isCustomModel && (
            <input
              type="text"
              value={customModelName || settings.selectedModel}
              onChange={(e) => handleCustomModelNameChange(e.target.value)}
              placeholder="e.g. anthropic/claude-3-opus"
              className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          )}
        </div>

        {/* Step 2: MCP Servers (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            2. Add MCP Servers (Optional)
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={mcpName}
              onChange={(e) => setMcpName(e.target.value)}
              placeholder="Server name"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="url"
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              placeholder="Server URL (e.g. https://mcp.example.com)"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              value={mcpToken}
              onChange={(e) => setMcpToken(e.target.value)}
              placeholder="Auth token (optional)"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddMCP}
              disabled={!mcpName.trim() || !mcpUrl.trim() || connecting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition"
            >
              {connecting ? 'Connecting...' : 'Add Server'}
            </button>
          </div>

          {settings.mcpServers.length > 0 && (
            <div className="mt-3 space-y-2">
              {settings.mcpServers.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-white text-sm">{s.name}</span>
                    <span className="text-slate-400 text-xs ml-2">{s.url}</span>
                  </div>
                  <button
                    onClick={() => removeMCPServer(s.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enter Button */}
        <button
          onClick={handleEnter}
          disabled={!settings.apiKey.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition"
        >
          Enter Workspace →
        </button>
      </div>
    </div>
  );
}
