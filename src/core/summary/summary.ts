import { callLLM } from '../llm/openrouter';
import { v4 as uuidv4 } from 'uuid';
import type { SummaryEntry, SummaryLink, ToolCallInfo } from '../../types';

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `You are an execution summary assistant. Your task is to concisely summarize the work and output of each AI Agent.

Rules:
1. Keep each summary to 1-3 sentences, extremely concise
2. If the agent used the file_write tool to create a file, mark it with [FILE:file_path]
3. If the agent used webpage_build_preview_tool to generate a web page, mark it with [PAGE:page_title]
4. Maintain coherence with previous summaries, avoid repeating content
5. Respond in the same language as the user's task description`;

const MAX_AGENT_OUTPUT_LENGTH = 3000;
const MAX_SUMMARY_TOKENS = 256;

export interface SummaryTask {
  agentId: string;
  agentName: string;
  agentRole: string;
  agentOutput: string;
  toolCalls: ToolCallInfo[];
  onComplete: (entry: SummaryEntry) => void;
  onError?: (error: Error) => void;
}

export type SummaryLogFn = (agentName: string, level: 'info' | 'warn' | 'error', message: string) => void;

export class SummaryAgent {
  private queue: SummaryTask[] = [];
  private processing = false;
  private entries: SummaryEntry[] = [];
  private apiKey: string;
  private model: string;
  private systemPrompt: string;
  private aborted = false;

  private logFn?: SummaryLogFn;

  constructor(apiKey: string, model: string, systemPrompt?: string, logFn?: SummaryLogFn) {
    this.apiKey = apiKey;
    this.model = model;
    this.systemPrompt = systemPrompt || DEFAULT_SUMMARY_SYSTEM_PROMPT;
    this.logFn = logFn;
  }

  /** Enqueue a summary task */
  enqueue(task: SummaryTask): void {
    if (this.aborted) return;
    this.queue.push(task);
    this.processNext();
  }

  /** Abort all pending tasks */
  abort(): void {
    this.aborted = true;
    this.queue = [];
  }

  /** Reset state */
  reset(): void {
    this.aborted = false;
    this.queue = [];
    this.entries = [];
    this.processing = false;
  }

  /** Check if the queue is idle (no pending tasks and not processing) */
  isIdle(): boolean {
    return !this.processing && this.queue.length === 0;
  }

  /** Get all completed summary entries */
  getEntries(): SummaryEntry[] {
    return [...this.entries];
  }

  /** Get full summary text for persistence */
  getFullSummaryText(): string {
    return this.entries
      .map((e) => `### ${e.agentName}\n${e.summary}`)
      .join('\n\n');
  }

  /** Process tasks one at a time (strict single-thread) */
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.aborted) return;
    this.processing = true;

    const task = this.queue.shift()!;
    try {
      const entry = await this.generateSummary(task);
      this.entries.push(entry);
      task.onComplete(entry);
    } catch (err) {
      task.onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    this.processing = false;
    if (!this.aborted) {
      this.processNext();
    }
  }

  /** Call LLM to generate summary */
  private async generateSummary(task: SummaryTask): Promise<SummaryEntry> {
    this.logFn?.(task.agentName, 'info', `Summary: Generating summary for agent ${task.agentName}...`);

    const previousSummaries = this.entries.length > 0
      ? this.entries.map((e) => `- **${e.agentName}**: ${e.summary}`).join('\n')
      : '(None yet)';

    const toolCallsText = task.toolCalls.length > 0
      ? task.toolCalls.map((tc) =>
          `- ${tc.name}(${JSON.stringify(tc.arguments)})`
        ).join('\n')
      : '(No tool calls)';

    const userPrompt = `## Previous summaries:\n${previousSummaries}\n\n## Current Agent info:\n- Name: ${task.agentName}\n- Role: ${task.agentRole}\n- Tool calls used:\n${toolCallsText}\n\n## Agent output:\n${task.agentOutput.slice(0, MAX_AGENT_OUTPUT_LENGTH)}\n\nPlease summarize this agent's work.`;

    const response = await callLLM({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: this.model,
      apiKey: this.apiKey,
      temperature: 0.3,
      maxTokens: MAX_SUMMARY_TOKENS,
    });

    const summary = response.content;
    const links = this.parseLinks(summary, task.toolCalls);

    this.logFn?.(task.agentName, 'info', `Summary: Completed summary for agent ${task.agentName}`);

    return {
      id: uuidv4(),
      agentId: task.agentId,
      agentName: task.agentName,
      summary,
      links,
      timestamp: Date.now(),
    };
  }

  /** Parse links from summary text and tool calls */
  private parseLinks(summary: string, toolCalls: ToolCallInfo[]): SummaryLink[] {
    const links: SummaryLink[] = [];

    // Extract [FILE:path] markers
    const fileMatches = summary.matchAll(/\[FILE:([^\]]+)\]/g);
    for (const match of fileMatches) {
      links.push({
        type: 'file',
        path: match[1].trim(),
        label: match[1].trim(),
      });
    }

    // Extract [PAGE:title] markers
    const pageMatches = summary.matchAll(/\[PAGE:([^\]]+)\]/g);
    for (const match of pageMatches) {
      links.push({
        type: 'page',
        path: match[1].trim(),
        label: match[1].trim(),
      });
    }

    // Fallback: if LLM didn't output markers, extract from tool calls
    if (links.length === 0) {
      for (const tc of toolCalls) {
        if (tc.name === 'file_write' && tc.arguments.path) {
          const path = String(tc.arguments.path);
          if (!links.some((l) => l.type === 'file' && l.path === path)) {
            links.push({ type: 'file', path, label: path });
          }
        }
        if (tc.name === 'webpage_build_preview_tool') {
          const title = String(tc.arguments.title || tc.arguments.entryPath || 'Preview');
          if (!links.some((l) => l.type === 'page' && l.label === title)) {
            links.push({ type: 'page', path: title, label: title });
          }
        }
      }
    }

    return links;
  }
}
