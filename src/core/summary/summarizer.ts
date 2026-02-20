import { callLLM } from '../llm/openrouter';

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `You are a concise pipeline activity summarizer. When given an agent's name, role, and output, provide a 1-2 sentence summary of what the agent accomplished. Be specific and brief. Focus on key results, not process. Do not use bullet points. Write in plain prose.`;

const MAX_OUTPUT_CHARS = 1500;

export interface SummaryGenerationOptions {
  agentName: string;
  agentRole: string;
  output: string;
  fileWrites: string[];
  generatedPageTitles: string[];
  apiKey: string;
  model: string;
  systemPrompt?: string;
  onChunk: (chunk: string) => void;
}

export async function generateAgentSummary(options: SummaryGenerationOptions): Promise<void> {
  const { agentName, agentRole, output, fileWrites, generatedPageTitles, apiKey, model, systemPrompt, onChunk } = options;

  const fileContext = fileWrites.length > 0 ? `\nFiles written: ${fileWrites.join(', ')}` : '';
  const pageContext = generatedPageTitles.length > 0 ? `\nWeb pages generated: ${generatedPageTitles.join(', ')}` : '';

  const userMessage = `Agent: ${agentName} (${agentRole})${fileContext}${pageContext}\n\nOutput:\n${output.slice(0, MAX_OUTPUT_CHARS)}${output.length > MAX_OUTPUT_CHARS ? '\n...[truncated]' : ''}`;

  await callLLM({
    messages: [
      { role: 'system', content: systemPrompt || DEFAULT_SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    model,
    apiKey,
    maxTokens: 120,
    temperature: 0.3,
    onStream: onChunk,
  });
}
