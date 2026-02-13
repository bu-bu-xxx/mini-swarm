import type { MCPServerConfig, MCPToolInfo } from '../../types';

interface ToolExecutor {
  serverId: string;
  schema: MCPToolInfo;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export class MCPClientManager {
  toolRegistry = new Map<string, ToolExecutor>();
  connections = new Map<string, MCPServerConfig>();

  async connect(config: MCPServerConfig): Promise<MCPToolInfo[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    // Initialize session with MCP server
    const initResponse = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'autoswarm', version: '1.0.0' },
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`MCP connection failed (${initResponse.status}): ${await initResponse.text()}`);
    }

    // List tools
    const toolsResponse = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });

    if (!toolsResponse.ok) {
      throw new Error(`MCP tools/list failed: ${await toolsResponse.text()}`);
    }

    const toolsData = await toolsResponse.json();
    const tools: MCPToolInfo[] = (toolsData.result?.tools || []).map(
      (t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || {},
        serverId: config.id,
      })
    );

    // Register tools
    for (const tool of tools) {
      this.toolRegistry.set(tool.name, {
        serverId: config.id,
        schema: tool,
        execute: async (args) => this.callTool(config, tool.name, args),
      });
    }

    this.connections.set(config.id, { ...config, connected: true, tools });
    return tools;
  }

  async callTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP tool call failed: ${await response.text()}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`MCP tool error: ${data.error.message}`);
    }
    return data.result;
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const executor = this.toolRegistry.get(name);
    if (!executor) {
      throw new Error(`Tool not found: ${name}`);
    }
    return executor.execute(args);
  }

  disconnect(serverId: string): void {
    this.connections.delete(serverId);
    for (const [name, executor] of this.toolRegistry.entries()) {
      if (executor.serverId === serverId) {
        this.toolRegistry.delete(name);
      }
    }
  }

  getAvailableTools(): MCPToolInfo[] {
    return Array.from(this.toolRegistry.values()).map((e) => e.schema);
  }

  isConnected(serverId: string): boolean {
    return this.connections.has(serverId);
  }
}

// Singleton instance
export const mcpManager = new MCPClientManager();
