import { callLLM } from '../llm/openrouter';
import type { SwarmDesign, AgentNode, ContextEntry, LogEntry, NodeStatus } from '../../types';

export interface EngineCallbacks {
  onNodeStatusChange: (nodeId: string, status: NodeStatus, error?: string) => void;
  onLog: (log: LogEntry) => void;
  onContextUpdate: (key: string, entry: ContextEntry) => void;
}

export class PipelineEngine {
  context = new Map<string, ContextEntry>();
  aborted = false;
  paused = false;
  pauseResolve: (() => void) | null = null;
  apiKey: string;
  model: string;
  callbacks: EngineCallbacks;

  constructor(apiKey: string, model: string, callbacks: EngineCallbacks) {
    this.apiKey = apiKey;
    this.model = model;
    this.callbacks = callbacks;
  }

  async execute(design: SwarmDesign): Promise<void> {
    this.aborted = false;
    this.paused = false;
    this.context.clear();

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
  }

  getExecutionBatches(design: SwarmDesign): AgentNode[][] {
    const { nodes, parallelGroups } = design.topology;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    return parallelGroups.map((group) =>
      group.map((id) => nodeMap.get(id)!).filter(Boolean)
    );
  }

  async executeNode(node: AgentNode, design: SwarmDesign): Promise<void> {
    if (this.aborted) return;

    this.callbacks.onNodeStatusChange(node.id, 'running');
    this.log(node, 'info', `Starting agent: ${node.name} (${node.role})`);

    try {
      // Gather input from context based on mappings
      const input = this.resolveInputMappings(node);

      // Build the agent prompt
      const systemPrompt = this.buildAgentPrompt(node, design);

      this.log(node, 'info', 'Calling LLM...');

      let fullResponse = '';
      const response = await callLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Task: ${design.taskDescription}\n\nYour input data:\n${JSON.stringify(input, null, 2)}\n\nExecute your role and provide your output.`,
          },
        ],
        model: this.model,
        apiKey: this.apiKey,
        temperature: 0.7,
        maxTokens: 4096,
        onStream: (chunk) => {
          fullResponse += chunk;
        },
      });

      const result = response.content || fullResponse;

      // Store output in context
      this.setContext(node.id, {
        value: result,
        producedBy: node.id,
        timestamp: Date.now(),
        type: 'intermediate',
      });

      // Also store with agent name for easier reference
      this.setContext(node.name, {
        value: result,
        producedBy: node.id,
        timestamp: Date.now(),
        type: 'intermediate',
      });

      this.log(node, 'info', `Agent ${node.name} completed successfully`);
      this.callbacks.onNodeStatusChange(node.id, 'completed');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.log(node, 'error', `Agent ${node.name} failed: ${errMsg}`);
      this.callbacks.onNodeStatusChange(node.id, 'failed', errMsg);
    }
  }

  buildAgentPrompt(node: AgentNode, design: SwarmDesign): string {
    const todoDescriptions = design.todos
      .filter((t) => t.assignedNodeIds.includes(node.id))
      .map((t) => `- ${t.description}`)
      .join('\n');

    return `${node.skillMarkdown}

## Your Assigned Tasks
${todoDescriptions || 'Complete your designated role in the pipeline.'}

## Available Context Keys
${Array.from(this.context.keys()).join(', ')}

## Instructions
- Focus on your specific role: ${node.role}
- Provide clear, structured output
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
