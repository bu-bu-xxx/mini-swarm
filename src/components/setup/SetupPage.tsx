import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../../store';
import { AVAILABLE_MODELS, testOpenRouterApiKey } from '../../core/llm/openrouter';
import { mcpManager } from '../../core/mcp/client';
import type { MCPServerConfig } from '../../types';

export default function SetupPage() {
  const {
    settings,
    setActiveProvider,
    setApiKey,
    setSelectedModel,
    addCustomModel,
    removeCustomModel,
    setProviderTestStatus,
    addMCPServer,
    removeMCPServer,
    updateMCPServer,
    setSetupComplete,
    setView,
  } = useAppStore();
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

  const activeProvider = settings.activeProvider;
  const providerSettings = settings.providers[activeProvider] || {
    apiKey: '',
    selectedModel: AVAILABLE_MODELS[0].id,
    customModels: [],
    testStatus: 'idle',
    testMessage: '',
  };

  const savedModels = useMemo(() => ([
    ...AVAILABLE_MODELS.map((m) => ({ id: m.id, name: `OpenRouter • ${m.name}`, builtIn: true })),
    ...providerSettings.customModels.map((id) => ({ id, name: `OpenRouter • ${id}`, builtIn: false })),
  ]), [providerSettings.customModels]);

  const handleAddCustomModel = () => {
    if (!customModelName.trim()) return;
    addCustomModel(customModelName.trim());
    setCustomModelName('');
  };

  const handleTestConnection = async () => {
    setProviderTestStatus('testing');
    try {
      const count = await testOpenRouterApiKey(providerSettings.apiKey);
      setProviderTestStatus('success', `Connected to OpenRouter. ${count} models available.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setProviderTestStatus('error', message);
    }
  };

  const handleEnter = () => {
    if (!providerSettings.apiKey.trim()) return;
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

        {/* Provider & API Key */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            1. Choose Provider
          </label>
          <select
            value={activeProvider}
            onChange={(e) => setActiveProvider(e.target.value as typeof activeProvider)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
          >
            <option value="openrouter">OpenRouter</option>
          </select>

          <div className="flex gap-2">
            <input
              type="password"
              value={providerSettings.apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleTestConnection}
              disabled={!providerSettings.apiKey.trim() || providerSettings.testStatus === 'testing'}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition"
            >
              {providerSettings.testStatus === 'testing' ? 'Testing…' : 'Test'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs mt-2">
            {providerSettings.testStatus === 'success' && (
              <span className="text-green-400">{providerSettings.testMessage || 'Connected to OpenRouter'}</span>
            )}
            {providerSettings.testStatus === 'error' && (
              <span className="text-red-400">{providerSettings.testMessage || 'Connection failed'}</span>
            )}
            {providerSettings.testStatus === 'idle' && providerSettings.apiKey && (
              <span className="text-slate-400">Enter key and test connection</span>
            )}
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
            2. Select OpenRouter Model
          </label>
          <select
            value={providerSettings.selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {savedModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              placeholder="Add custom model (vendor/model)"
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddCustomModel}
              disabled={!customModelName.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition"
            >
              Add
            </button>
          </div>
          {providerSettings.customModels.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs text-slate-400">Custom models</div>
              {providerSettings.customModels.map((model) => (
                <div key={model} className="flex items-center justify-between bg-slate-700/60 px-3 py-2 rounded-lg text-sm">
                  <span className="text-white">{model}</span>
                  <button
                    onClick={() => removeCustomModel(model)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {providerSettings.testStatus === 'success' && (
            <div className="mt-2 text-xs text-green-400">
              Connected to OpenRouter, model: {providerSettings.selectedModel}
            </div>
          )}
        </div>

        {/* Step 2: MCP Servers (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            3. Add MCP Servers (Optional)
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
          disabled={!providerSettings.apiKey.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition"
        >
          Enter Workspace →
        </button>
      </div>
    </div>
  );
}
