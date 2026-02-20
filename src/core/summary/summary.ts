import { callLLM } from '../llm/openrouter';
import { v4 as uuidv4 } from 'uuid';
import type { SummaryEntry, SummaryLink, ToolCallInfo } from '../../types';

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `你是一个执行摘要助手。你的任务是用简洁的文字概括 AI Agent 的工作内容和产出。

规则：
1. 每个摘要限制在 1-3 句话以内，保持极度简洁
2. 如果 agent 使用了 file_write 工具创建了文件，用 [FILE:文件路径] 标记
3. 如果 agent 使用了 webpage_build_preview_tool 生成了网页，用 [PAGE:页面标题] 标记
4. 基于已有的总结历史保持连贯性，避免重复内容
5. 用中文回答`;

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

export class SummaryAgent {
  private queue: SummaryTask[] = [];
  private processing = false;
  private entries: SummaryEntry[] = [];
  private apiKey: string;
  private model: string;
  private systemPrompt: string;
  private aborted = false;

  constructor(apiKey: string, model: string, systemPrompt?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.systemPrompt = systemPrompt || DEFAULT_SUMMARY_SYSTEM_PROMPT;
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
    const previousSummaries = this.entries.length > 0
      ? this.entries.map((e) => `- **${e.agentName}**: ${e.summary}`).join('\n')
      : '(暂无)';

    const toolCallsText = task.toolCalls.length > 0
      ? task.toolCalls.map((tc) =>
          `- ${tc.name}(${JSON.stringify(tc.arguments)})`
        ).join('\n')
      : '(无工具调用)';

    const userPrompt = `## 已有总结:\n${previousSummaries}\n\n## 当前 Agent 信息:\n- 名称: ${task.agentName}\n- 角色: ${task.agentRole}\n- 使用的工具调用:\n${toolCallsText}\n\n## Agent 输出内容:\n${task.agentOutput.slice(0, MAX_AGENT_OUTPUT_LENGTH)}\n\n请概括该 agent 的工作内容。`;

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
