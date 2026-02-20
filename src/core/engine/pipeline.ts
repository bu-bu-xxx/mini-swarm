import { callLLM } from '../llm/openrouter';
import { executeBuiltinTool, getToolSchemasForAgent, isBuiltinTool } from '../tools/builtin';
import { opfsService } from '../storage/opfs';
import { identifyParallelGroups } from '../../utils/topology';
import { generateAgentSummary } from '../summary/summarizer';
import type { SwarmDesign, AgentNode, AgentDefaults, ContextEntry, LogEntry, NodeStatus, LLMMessage, SummaryEntry, SummaryLink } from '../../types';

export interface EngineCallbacks {
  onNodeStatusChange: (nodeId: string, status: NodeStatus, error?: string) => void;
  onLog: (log: LogEntry) => void;
  onContextUpdate: (key: string, entry: ContextEntry) => void;
  onOutputsPersisted?: () => void;
  onWorkspaceChanged?: () => void;
  onPagePreviewGenerated?: (preview: {
    url: string;
    entryPath: string;
    title: string;
    timestamp: number;
    generatedBy: string;
  }) => void;
  onSummaryEntry?: (entry: SummaryEntry) => void;
  onSummaryTextChunk?: (id: string, chunk: string) => void;
  onSummaryComplete?: (id: string) => void;
}

const DEFAULT_AGENT_DEFAULTS: AgentDefaults = {
  temperature: 0.7,
  maxTokens: 4096,
  maxIterations: 10,
};

export class PipelineEngine {
  context = new Map<string, ContextEntry>();
  aborted = false;
  paused = false;
  pauseResolve: (() => void) | null = null;
  apiKey: string;
  model: string;
  callbacks: EngineCallbacks;
  agentDefaults: AgentDefaults;
  summarySystemPrompt: string;
  startedAt: number = 0;

  constructor(apiKey: string, model: string, callbacks: EngineCallbacks, agentDefaults?: AgentDefaults, summarySystemPrompt?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.callbacks = callbacks;
    this.agentDefaults = agentDefaults || DEFAULT_AGENT_DEFAULTS;
    this.summarySystemPrompt = summarySystemPrompt || '';
  }

  async execute(design: SwarmDesign): Promise<void> {
    this.aborted = false;
    this.paused = false;
    this.context.clear();
    this.startedAt = Date.now();

    // Initialize OPFS
    await opfsService.init();

    // Set initial task context
    this.setContext('__task__', {
      value: design.taskDescription,
      producedBy: 'system',
      timestamp: Date.now(),
      type: 'intermediate',
    });

    const batches = this.getExecutionBatches(design);

    for (const batch of batches) {
      if (this.aborted) break;
      await this.checkPause();

      // Execute batch in parallel
      await Promise.all(
        batch.map((node) => this.executeNode(node, design))
      );

      if (this.context.has('__TERMINATE__')) break;
    }

    // Auto-persist outputs to /outputs
    if (!this.aborted) {
      await this.persistOutputs(design);
    }
  }

  getExecutionBatches(design: SwarmDesign): AgentNode[][] {
    const { nodes, edges } = design.topology;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    // Compute parallelGroups in real-time from current edges
    const groups = identifyParallelGroups(nodes, edges);

    return groups.map((group) =>
      group.map((id) => nodeMap.get(id)!).filter(Boolean)
    );
  }

  async executeNode(node: AgentNode, design: SwarmDesign): Promise<void> {
    if (this.aborted) return;
    await this.checkPause();

    this.callbacks.onNodeStatusChange(node.id, 'running');
    this.log(node, 'info', `Starting agent: ${node.name} (${node.role})`);

    try {
      // Gather input from context based on mappings
      const input = this.resolveInputMappings(node);

      // Build the agent prompt
      const systemPrompt = this.buildAgentPrompt(node, design);

      if (this.aborted) return;
      await this.checkPause();

      // Resolve parameters with layered priority: agent > global > hardcoded
      // A value of -1 means "omit this parameter" (use provider defaults)
      const rawTemperature = node.temperature ?? this.agentDefaults.temperature ?? 0.7;
      const rawMaxTokens = node.maxTokens ?? this.agentDefaults.maxTokens ?? 4096;
      const maxIterations = node.maxIterations ?? this.agentDefaults.maxIterations ?? 10;
      const temperature = rawTemperature === -1 ? undefined : rawTemperature;
      const maxTokens = rawMaxTokens === -1 ? undefined : rawMaxTokens;

      // Build tool schemas for this agent
      const toolSchemas = getToolSchemasForAgent(node.tools);
      const hasTools = toolSchemas.length > 0;

      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Task: ${design.taskDescription}\n\nYour input data:\n${JSON.stringify(input, null, 2)}\n\nExecute your role and provide your output.`,
        },
      ];

      let result = '';

      // Track tool artifacts for summary
      const fileWrites: string[] = [];
      const localPageLinks: { title: string; url: string }[] = [];

      // ReAct loop
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (this.aborted) return;
        await this.checkPause();

        this.log(node, 'info', hasTools && iteration === 0 ? 'Calling LLM with tools...' : iteration > 0 ? `ReAct iteration ${iteration + 1}...` : 'Calling LLM...');

        let fullResponse = '';
        const response = await callLLM({
          messages,
          model: this.model,
          apiKey: this.apiKey,
          temperature,
          maxTokens,
          tools: hasTools ? toolSchemas : undefined,
          onStream: !hasTools ? (chunk) => { fullResponse += chunk; } : undefined,
        });

        const content = response.content || fullResponse;

        // No tool calls → final answer, exit loop
        if (!response.toolCalls || response.toolCalls.length === 0) {
          result = content;
          break;
        }

        // Has tool calls → execute tools → append messages → continue loop
        messages.push({
          role: 'assistant',
          content: content || '',
          tool_calls: response.toolCalls,
        });

        for (const tc of response.toolCalls) {
          this.log(node, 'info', `Calling tool: ${tc.name}(${JSON.stringify(tc.arguments)})`);

          let toolResult: string;
          try {
            toolResult = await this.executeTool(tc.name, tc.arguments);
            // Notify UI of workspace changes for file-modifying tools
            if (['file_write', 'file_delete', 'python_workspace_tool'].includes(tc.name)) {
              this.callbacks.onWorkspaceChanged?.();
            }
            // Track file writes for summary
            if (tc.name === 'file_write' && typeof tc.arguments.path === 'string') {
              fileWrites.push(tc.arguments.path);
            }
            if (tc.name === 'webpage_build_preview_tool') {
              this.handlePreviewToolResult(toolResult, node.name);
              // Also capture page link for summary
              try {
                const parsed = JSON.parse(toolResult) as { success?: boolean; previewUrl?: string; title?: string; entryPath?: string };
                if (parsed.success && parsed.previewUrl) {
                  localPageLinks.push({ title: parsed.title || parsed.entryPath || parsed.previewUrl, url: parsed.previewUrl });
                }
              } catch {
                console.debug('webpage_build_preview_tool returned non-JSON output for summary tracking');
              }
            }
          } catch (err) {
            toolResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }

          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: tc.id,
          });

          this.log(node, 'info', `Tool ${tc.name} result: ${toolResult.slice(0, 200)}${toolResult.length > 200 ? '...' : ''}`);
        }

        // If this is the last iteration, force a final call without tools
        if (iteration === maxIterations - 1) {
          this.log(node, 'warn', `Max iterations (${maxIterations}) reached, requesting final answer...`);
          messages.push({
            role: 'user',
            content: 'Maximum tool iterations reached. Please provide your final answer now.',
          });
          const finalResponse = await callLLM({
            messages,
            model: this.model,
            apiKey: this.apiKey,
            temperature,
            maxTokens,
          });
          result = finalResponse.content;
        }
      }

      // Store output in context with display key
      this.setContext(`${node.name}(${node.id})`, {
        value: result,
        producedBy: node.id,
        timestamp: Date.now(),
        type: 'intermediate',
      });

      // Also store with agent name (hidden) for input mapping resolution
      this.setInternalContext(node.name, {
        value: result,
        producedBy: node.id,
        timestamp: Date.now(),
        type: 'intermediate',
      });

      // Fire async summary generation (non-blocking, does not affect pipeline)
      if (this.callbacks.onSummaryEntry) {
        const entryId = `summary-${node.id}-${Date.now()}`;
        const links: SummaryLink[] = [
          ...fileWrites.map((fp) => ({ type: 'file' as const, label: fp, filePath: fp })),
          ...localPageLinks.map((p) => ({ type: 'page' as const, label: p.title, url: p.url })),
        ];
        const summaryEntry: SummaryEntry = {
          id: entryId,
          agentName: node.name,
          agentRole: node.role,
          text: '',
          timestamp: Date.now(),
          links,
          streaming: true,
        };
        this.callbacks.onSummaryEntry(summaryEntry);
        generateAgentSummary({
          agentName: node.name,
          agentRole: node.role,
          output: result,
          fileWrites,
          generatedPageTitles: localPageLinks.map((p) => p.title),
          apiKey: this.apiKey,
          model: this.model,
          systemPrompt: this.summarySystemPrompt || undefined,
          onChunk: (chunk) => this.callbacks.onSummaryTextChunk?.(entryId, chunk),
        }).finally(() => {
          this.callbacks.onSummaryComplete?.(entryId);
        });
      }

      this.log(node, 'info', `Agent ${node.name} completed successfully`);
      this.callbacks.onNodeStatusChange(node.id, 'completed');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.log(node, 'error', `Agent ${node.name} failed: ${errMsg}`);
      this.callbacks.onNodeStatusChange(node.id, 'failed', errMsg);
    }
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (isBuiltinTool(name)) {
      return executeBuiltinTool(name, args);
    }
    // MCP tools would go here in future
    return `Unknown tool: ${name}`;
  }

  buildAgentPrompt(node: AgentNode, design: SwarmDesign): string {
    const todoDescriptions = design.todos
      .filter((t) => t.assignedNodeIds.includes(node.id))
      .map((t) => `- ${t.description}`)
      .join('\n');

    const toolNames = node.tools.length > 0 ? node.tools.join(', ') : 'none';

    return `${node.skillMarkdown}

## Your Assigned Tasks
${todoDescriptions || 'Complete your designated role in the pipeline.'}

## Available Tools
${toolNames}
${node.tools.length > 0 ? '\nUse tools when needed to read/write files in the workspace.' : ''}

## Available Context Keys
${Array.from(this.context.keys()).filter(k => !k.startsWith('__')).join(', ') || 'none yet'}

## Instructions
- Focus on your specific role: ${node.role}
- Provide clear, structured output
- If you have file tools available, use them to persist important results
- If you encounter issues, describe them clearly`;
  }

  resolveInputMappings(node: AgentNode): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    for (const mapping of node.inputMappings) {
      const key = mapping.from.replace('context.', '');
      const entry = this.context.get(key);
      if (entry) {
        input[mapping.to] = entry.value;
      }
    }

    // Also include task description
    const taskEntry = this.context.get('__task__');
    if (taskEntry) {
      input['task'] = taskEntry.value;
    }

    return input;
  }

  setContext(key: string, entry: ContextEntry): void {
    this.context.set(key, entry);
    this.callbacks.onContextUpdate(key, entry);
  }

  setInternalContext(key: string, entry: ContextEntry): void {
    this.context.set(key, entry);
  }

  handlePreviewToolResult(toolResult: string, generatedBy: string): void {
    try {
      const parsed = JSON.parse(toolResult) as {
        success?: boolean;
        previewUrl?: string;
        entryPath?: string;
        title?: string;
        timestamp?: number;
      };
      if (!parsed.success || !parsed.previewUrl || !parsed.entryPath) return;
      this.callbacks.onPagePreviewGenerated?.({
        url: parsed.previewUrl,
        entryPath: parsed.entryPath,
        title: parsed.title || parsed.entryPath,
        timestamp: parsed.timestamp || Date.now(),
        generatedBy,
      });
    } catch {
      // ignore non-JSON tool output
      console.debug('webpage_build_preview_tool returned non-JSON output');
    }
  }

  async persistOutputs(design: SwarmDesign): Promise<void> {
    try {
      await opfsService.clearOutputs();

      for (const [key, entry] of this.context.entries()) {
        if (key.startsWith('__')) continue;
        const content = typeof entry.value === 'string'
          ? entry.value
          : JSON.stringify(entry.value, null, 2);
        // Extract agent name from key format "AgentName(agent-id)"
        const agentName = key.split('(')[0];
        await opfsService.saveAgentOutput(agentName, content);
      }

      await opfsService.saveExecutionMeta({
        designId: design.id,
        taskDescription: design.taskDescription,
        modelUsed: design.modelUsed,
        startedAt: this.startedAt,
        completedAt: Date.now(),
        agents: design.topology.nodes.map((n) => ({
          name: n.name,
          role: n.role,
          status: 'completed',
        })),
      });

      this.callbacks.onOutputsPersisted?.();
    } catch {
      // Non-critical: outputs persistence failure shouldn't break the pipeline
    }
  }

  log(node: AgentNode, level: LogEntry['level'], message: string): void {
    this.callbacks.onLog({
      timestamp: Date.now(),
      nodeId: node.id,
      nodeName: node.name,
      message,
      level,
    });
  }

  abort(): void {
    this.aborted = true;
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  checkPause(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.pauseResolve = resolve;
    });
  }

  getContext(): Map<string, ContextEntry> {
    return new Map(this.context);
  }
}
