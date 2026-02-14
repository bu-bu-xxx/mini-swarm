import type { LLMMessage, LLMResponse } from '../../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface LLMRequestOptions {
  messages: LLMMessage[];
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
  onStream?: (chunk: string) => void;
}

export async function callLLM(options: LLMRequestOptions): Promise<LLMResponse> {
  const { messages, model, apiKey, temperature = 0.7, maxTokens = 4096, responseFormat, onStream } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: !!onStream,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AutoSwarm Designer',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errBody}`);
  }

  if (onStream && response.body) {
    return handleStream(response.body, onStream);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

async function handleStream(
  body: ReadableStream<Uint8Array>,
  onStream: (chunk: string) => void
): Promise<LLMResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onStream(delta);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return { content: fullContent };
}

export async function callLLMForJSON<T>(options: LLMRequestOptions): Promise<T> {
  const response = await callLLM({
    ...options,
    responseFormat: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.content) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim()) as T;
    }
    throw new Error('Failed to parse LLM response as JSON: ' + response.content.slice(0, 200));
  }
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
];

export async function testOpenRouterApiKey(apiKey: string): Promise<number> {
  if (!apiKey.trim()) {
    throw new Error('API key is required');
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AutoSwarm Designer',
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter test failed (${response.status}): ${errBody || 'Unexpected error'}`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.data) ? data.data : [];
  return models.length;
}
