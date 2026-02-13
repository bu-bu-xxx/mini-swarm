/**
 * OpenRouter Integration Tests
 *
 * Requires OPENROUTER_API_KEY environment variable.
 * Run with: node tests/openrouter.integration.test.mjs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;
// Use a cheap, fast model for integration tests
const TEST_MODEL = 'openai/gpt-4o-mini';

let passed = 0;
let failed = 0;

async function assert(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
  }
}

function assertTruthy(value, msg) {
  if (!value) throw new Error(msg || `Expected truthy but got: ${value}`);
}

function assertType(value, type, msg) {
  if (typeof value !== type) throw new Error(msg || `Expected type ${type} but got ${typeof value}`);
}

// ─── Test: Basic Chat Completion (non-streaming) ─────────────────────

async function testBasicCompletion() {
  console.log('\n📋 Test 1: Basic Chat Completion');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Title': 'AutoSwarm Integration Test',
    },
    body: JSON.stringify({
      model: TEST_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Reply briefly.' },
        { role: 'user', content: 'Say "hello world" and nothing else.' },
      ],
      temperature: 0,
      max_tokens: 50,
      stream: false,
    }),
  });

  await assert('Response status is 200', () => {
    assertTruthy(response.ok, `Status: ${response.status}`);
  });

  const data = await response.json();

  await assert('Response has choices array', () => {
    assertTruthy(Array.isArray(data.choices), 'choices is not an array');
    assertTruthy(data.choices.length > 0, 'choices is empty');
  });

  await assert('Response has content string', () => {
    const content = data.choices[0]?.message?.content;
    assertType(content, 'string', 'content is not a string');
    assertTruthy(content.length > 0, 'content is empty');
    console.log(`     Response: "${content.slice(0, 100)}"`);
  });

  await assert('Response has usage info', () => {
    assertTruthy(data.usage, 'usage is missing');
    assertType(data.usage.prompt_tokens, 'number');
    assertType(data.usage.completion_tokens, 'number');
    assertType(data.usage.total_tokens, 'number');
    console.log(`     Tokens: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens}, total=${data.usage.total_tokens}`);
  });
}

// ─── Test: Streaming Chat Completion ─────────────────────────────────

async function testStreamingCompletion() {
  console.log('\n📋 Test 2: Streaming Chat Completion');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Title': 'AutoSwarm Integration Test',
    },
    body: JSON.stringify({
      model: TEST_MODEL,
      messages: [
        { role: 'user', content: 'Count from 1 to 5, one number per line.' },
      ],
      temperature: 0,
      max_tokens: 100,
      stream: true,
    }),
  });

  await assert('Streaming response status is 200', () => {
    assertTruthy(response.ok, `Status: ${response.status}`);
  });

  await assert('Can read stream and assemble content', async () => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let chunkCount = 0;
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
            chunkCount++;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    assertTruthy(fullContent.length > 0, 'Stream produced no content');
    assertTruthy(chunkCount > 1, `Expected multiple chunks, got ${chunkCount}`);
    console.log(`     Chunks received: ${chunkCount}`);
    console.log(`     Full content: "${fullContent.slice(0, 100)}"`);
  });
}

// ─── Test: JSON Response Format ──────────────────────────────────────

async function testJSONResponse() {
  console.log('\n📋 Test 3: JSON Structured Response');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Title': 'AutoSwarm Integration Test',
    },
    body: JSON.stringify({
      model: TEST_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You must respond with valid JSON only. No markdown, no code blocks.',
        },
        {
          role: 'user',
          content: 'Return a JSON object with keys "name" (string) and "count" (number). Use any values.',
        },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
      stream: false,
    }),
  });

  await assert('JSON response status is 200', () => {
    assertTruthy(response.ok, `Status: ${response.status}`);
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  await assert('Response content is valid JSON', () => {
    assertType(content, 'string');
    const parsed = JSON.parse(content);
    assertType(parsed, 'object');
    console.log(`     Parsed JSON: ${JSON.stringify(parsed)}`);
  });

  await assert('Parsed JSON has expected keys', () => {
    const parsed = JSON.parse(content);
    assertTruthy('name' in parsed, 'Missing "name" key');
    assertTruthy('count' in parsed, 'Missing "count" key');
  });
}

// ─── Test: Swarm Design Generation ───────────────────────────────────

async function testSwarmDesign() {
  console.log('\n📋 Test 4: Swarm Design Generation (Core Feature)');

  const taskDescription = 'Write a short poem about technology and review it for quality';

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Title': 'AutoSwarm Integration Test',
    },
    body: JSON.stringify({
      model: TEST_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert multi-agent system designer. Given a task description, you must:
1. Break it down into a todo list with dependencies
2. Design a team of AI agents to accomplish the todos
3. Define each agent's role and skill description

Built-in tools always available: context_read, context_write, file_read, file_write

Respond with a JSON object with this exact structure:
{
  "todos": [
    {
      "description": "string - what needs to be done",
      "dependencies": ["string[] - descriptions of todos this depends on, empty for first tasks"],
      "parallelizable": true/false
    }
  ],
  "agents": [
    {
      "name": "string - short agent name",
      "role": "string - one of: researcher, coder, reviewer, coordinator, writer, analyst",
      "skill": "string - system prompt for the agent",
      "tools": ["string[] - tool names"],
      "todoIndices": [0],
      "dependsOn": ["string[] - names of agents this depends on"]
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Design a multi-agent swarm for this task:\n\n${taskDescription}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      stream: false,
    }),
  });

  await assert('Design response status is 200', () => {
    assertTruthy(response.ok, `Status: ${response.status}`);
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  let design;
  await assert('Design response is valid JSON', () => {
    design = JSON.parse(content);
    assertType(design, 'object');
  });

  await assert('Design has todos array', () => {
    assertTruthy(Array.isArray(design.todos), 'todos is not an array');
    assertTruthy(design.todos.length > 0, 'todos is empty');
    console.log(`     Todos: ${design.todos.length}`);
    for (const todo of design.todos) {
      console.log(`       - ${todo.description}`);
    }
  });

  await assert('Design has agents array', () => {
    assertTruthy(Array.isArray(design.agents), 'agents is not an array');
    assertTruthy(design.agents.length >= 2, `Expected >=2 agents, got ${design.agents.length}`);
    console.log(`     Agents: ${design.agents.length}`);
    for (const agent of design.agents) {
      console.log(`       - ${agent.name} (${agent.role})`);
    }
  });

  await assert('Each agent has required fields', () => {
    for (const agent of design.agents) {
      assertType(agent.name, 'string', `agent missing name`);
      assertType(agent.role, 'string', `agent ${agent.name} missing role`);
      assertType(agent.skill, 'string', `agent ${agent.name} missing skill`);
      assertTruthy(Array.isArray(agent.tools), `agent ${agent.name} tools not array`);
      assertTruthy(Array.isArray(agent.todoIndices), `agent ${agent.name} todoIndices not array`);
      assertTruthy(Array.isArray(agent.dependsOn), `agent ${agent.name} dependsOn not array`);
    }
  });

  await assert('Agent dependencies form valid DAG (no unknown references)', () => {
    const agentNames = new Set(design.agents.map((a) => a.name));
    for (const agent of design.agents) {
      for (const dep of agent.dependsOn) {
        assertTruthy(agentNames.has(dep), `Agent "${agent.name}" depends on unknown agent "${dep}"`);
      }
    }
  });

  await assert('Token usage reported', () => {
    assertTruthy(data.usage, 'usage missing');
    console.log(`     Tokens used: ${data.usage.total_tokens}`);
  });
}

// ─── Test: Error Handling (Invalid API Key) ──────────────────────────

async function testErrorHandling() {
  console.log('\n📋 Test 5: Error Handling');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-key-12345',
      'X-Title': 'AutoSwarm Integration Test',
    },
    body: JSON.stringify({
      model: TEST_MODEL,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    }),
  });

  await assert('Invalid API key returns non-200 status', () => {
    assertTruthy(!response.ok, `Expected error but got status ${response.status}`);
    assertTruthy(response.status === 401 || response.status === 403,
      `Expected 401/403 but got ${response.status}`);
    console.log(`     Error status: ${response.status}`);
  });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🐝 AutoSwarm Designer - OpenRouter Integration Tests\n');

  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set.');
    console.error('   Set it with: export OPENROUTER_API_KEY=sk-or-v1-...');
    process.exit(1);
  }

  console.log(`🔑 API Key: ${API_KEY.slice(0, 12)}...${API_KEY.slice(-4)}`);
  console.log(`🤖 Test Model: ${TEST_MODEL}`);

  await testBasicCompletion();
  await testStreamingCompletion();
  await testJSONResponse();
  await testSwarmDesign();
  await testErrorHandling();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n✅ All OpenRouter integration tests passed!');
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
