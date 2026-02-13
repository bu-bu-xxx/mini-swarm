import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../../store';
import { AVAILABLE_MODELS } from '../../core/llm/openrouter';
import { mcpManager } from '../../core/mcp/client';

export default function SettingsDrawer() {
  const { settings, settingsOpen, setSettingsOpen, setApiKey, setSelectedModel, addMCPServer, removeMCPServer, updateMCPServer } = useAppStore();
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpToken, setMcpToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  if (!settingsOpen) return null;

  const handleAddMCP = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) return;
    const server = {
      id: uuidv4(),
      name: mcpName.trim(),
      url: mcpUrl.trim(),
      token: mcpToken.trim() || undefined,
      connected: false,
      tools: [] as { name: string; description: string; inputSchema: Record<string, unknown>; serverId: string }[],
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

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={() => setSettingsOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setSettingsOpen(false); }}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-96 bg-slate-800 border-l border-slate-700 h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* LLM Configuration */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3">LLM Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">OpenRouter API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Model</label>
              <select
                value={settings.selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* MCP Servers */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3">MCP Servers</h3>

          {settings.mcpServers.length > 0 && (
            <div className="space-y-2 mb-4">
              {settings.mcpServers.map((s) => (
                <div key={s.id} className="bg-slate-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm">{s.name}</span>
                      <span className={`ml-2 text-xs ${s.connected ? 'text-green-400' : 'text-slate-500'}`}>
                        {s.connected ? '● Connected' : '○ Disconnected'}
                      </span>
                    </div>
                    <button
                      onClick={() => removeMCPServer(s.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <span className="text-slate-400 text-xs">{s.url}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="text"
              value={mcpName}
              onChange={(e) => setMcpName(e.target.value)}
              placeholder="Server name"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="url"
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              placeholder="Server URL"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              value={mcpToken}
              onChange={(e) => setMcpToken(e.target.value)}
              placeholder="Auth token (optional)"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddMCP}
              disabled={!mcpName.trim() || !mcpUrl.trim() || connecting}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm transition"
            >
              {connecting ? 'Connecting...' : 'Add Server'}
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h3 className="text-sm font-medium text-slate-300 mb-2">About</h3>
          <p className="text-xs text-slate-500">
            AutoSwarm Designer v1.0 - Open Source Agent Swarm Design Tool.
            All data stays in your browser.
          </p>
        </section>
      </div>
    </div>
  );
}
