import { v4 as uuidv4 } from 'uuid';
import { callLLMForJSON } from '../llm/openrouter';
import { identifyParallelGroups } from '../../utils/topology';
import type { SwarmDesign, TodoItem, AgentNode, PipelineEdge, MCPToolInfo } from '../../types';

interface DesignOptions {
  task: string;
  apiKey: string;
  model: string;
  availableTools: MCPToolInfo[];
  onProgress?: (message: string) => void;
}

interface LLMDesignResponse {
  todos: {
    description: string;
    dependencies: string[];
    parallelizable: boolean;
  }[];
  agents: {
    name: string;
    role: string;
    skill: string;
    tools: string[];
    todoIndices: number[];
    dependsOn: string[];
  }[];
}

export async function designSwarm(options: DesignOptions): Promise<SwarmDesign> {
  const { task, apiKey, model, availableTools, onProgress } = options;

  onProgress?.('Analyzing task complexity...');

  const toolDescriptions = availableTools.length > 0
    ? availableTools.map((t) => `- ${t.name}: ${t.description}`).join('\n')
    : 'No external tools available. Agents will use built-in file_read, file_write, file_list, file_delete tools.';

  const designResult = await callLLMForJSON<LLMDesignResponse>({
    messages: [
      {
        role: 'system',
        content: `You are an expert multi-agent system designer. Given a task description, you must:
1. Break it down into a todo list with dependencies
2. Design a team of AI agents to accomplish the todos
3. Define each agent's role and skill description

Available external tools:
${toolDescriptions}

Built-in tools always available: file_read, file_write, file_list, file_delete

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
      "name": "string - short agent name like 'Researcher' or 'Writer'",
      "role": "string - one of: researcher, coder, reviewer, coordinator, writer, analyst",
      "skill": "string - detailed system prompt describing the agent's capabilities and instructions",
      "tools": ["string[] - tool names this agent needs"],
      "todoIndices": [0, 1],
      "dependsOn": ["string[] - names of agents this depends on"]
    }
  ]
}

Design tips:
- Identify tasks that can run in parallel
- Each agent should have a clear, focused responsibility
- Create 2-6 agents depending on task complexity
- Simple tasks may only need 2 agents, complex ones need more`,
      },
      {
        role: 'user',
        content: `Design a multi-agent swarm for this task:\n\n${task}`,
      },
    ],
    model,
    apiKey,
    temperature: 0.7,
    maxTokens: 4096,
  });

  onProgress?.('Building topology...');

  const designId = uuidv4();

  // Build todos
  const todos: TodoItem[] = designResult.todos.map((t, i) => ({
    id: `todo-${i}`,
    description: t.description,
    status: 'pending' as const,
    assignedNodeIds: [],
    dependencies: t.dependencies.map((dep) => {
      const depIdx = designResult.todos.findIndex((td) => td.description === dep);
      return depIdx >= 0 ? `todo-${depIdx}` : '';
    }).filter(Boolean),
  }));

  // Build agent nodes
  const nodes: AgentNode[] = designResult.agents.map((a) => {
    const nodeId = `agent-${uuidv4().slice(0, 8)}`;

    // Assign todos
    for (const idx of a.todoIndices) {
      if (todos[idx]) {
        todos[idx].assignedNodeIds.push(nodeId);
      }
    }

    return {
      id: nodeId,
      name: a.name,
      role: a.role,
      skillMarkdown: a.skill,
      tools: a.tools,
      inputMappings: a.dependsOn.map((dep) => ({
        from: `context.${dep}`,
        to: 'input',
      })),
      outputMappings: [{ from: 'output', to: `context.${a.name}` }],
    };
  });

  // Build edges based on dependencies
  const edges: PipelineEdge[] = [];
  for (const agent of designResult.agents) {
    const targetNode = nodes.find((n) => n.name === agent.name);
    if (!targetNode) continue;

    for (const dep of agent.dependsOn) {
      const sourceNode = nodes.find((n) => n.name === dep);
      if (sourceNode) {
        edges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: 'data',
        });
      }
    }
  }

  // Identify parallel groups
  const parallelGroups = identifyParallelGroups(nodes, edges);

  onProgress?.('Design complete!');

  return {
    id: designId,
    createdAt: Date.now(),
    taskDescription: task,
    modelUsed: model,
    todos,
    topology: { nodes, edges, parallelGroups },
  };
}

interface RefineOptions {
  currentDesign: SwarmDesign;
  refinementPrompt: string;
  apiKey: string;
  model: string;
  availableTools: MCPToolInfo[];
  onProgress?: (message: string) => void;
}

export async function refineSwarm(options: RefineOptions): Promise<SwarmDesign> {
  const { currentDesign, refinementPrompt, apiKey, model, availableTools, onProgress } = options;

  onProgress?.('Analyzing refinement request...');

  const toolDescriptions = availableTools.length > 0
    ? availableTools.map((t) => `- ${t.name}: ${t.description}`).join('\n')
    : 'No external tools available. Agents will use built-in file_read, file_write, file_list, file_delete tools.';

  const currentDesignJSON = JSON.stringify({
    taskDescription: currentDesign.taskDescription,
    agents: currentDesign.topology.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      role: n.role,
      skill: n.skillMarkdown,
      tools: n.tools,
      dependsOn: currentDesign.topology.edges
        .filter((e) => e.target === n.id)
        .map((e) => {
          const src = currentDesign.topology.nodes.find((node) => node.id === e.source);
          return src?.name || e.source;
        }),
    })),
  }, null, 2);

  const designResult = await callLLMForJSON<LLMDesignResponse>({
    messages: [
      {
        role: 'system',
        content: `You are an expert multi-agent system designer. You are given an existing multi-agent swarm design and a user request to modify it.

Current design:
${currentDesignJSON}

Available external tools:
${toolDescriptions}

Built-in tools always available: file_read, file_write, file_list, file_delete

Based on the user's modification request, output the COMPLETE updated design as JSON with this exact structure:
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
      "name": "string - short agent name like 'Researcher' or 'Writer'",
      "role": "string - one of: researcher, coder, reviewer, coordinator, writer, analyst",
      "skill": "string - detailed system prompt describing the agent's capabilities and instructions",
      "tools": ["string[] - tool names this agent needs"],
      "todoIndices": [0, 1],
      "dependsOn": ["string[] - names of agents this depends on"]
    }
  ]
}

Important:
- Incorporate the user's requested changes
- Keep unchanged parts as they are
- Output the COMPLETE design, not just the changes`,
      },
      {
        role: 'user',
        content: `Please modify the swarm design as follows:\n\n${refinementPrompt}`,
      },
    ],
    model,
    apiKey,
    temperature: 0.7,
    maxTokens: 4096,
  });

  onProgress?.('Rebuilding topology...');

  const designId = uuidv4();

  // Build todos
  const todos: TodoItem[] = designResult.todos.map((t, i) => ({
    id: `todo-${i}`,
    description: t.description,
    status: 'pending' as const,
    assignedNodeIds: [],
    dependencies: t.dependencies.map((dep) => {
      const depIdx = designResult.todos.findIndex((td) => td.description === dep);
      return depIdx >= 0 ? `todo-${depIdx}` : '';
    }).filter(Boolean),
  }));

  // Build agent nodes
  const nodes: AgentNode[] = designResult.agents.map((a) => {
    const nodeId = `agent-${uuidv4().slice(0, 8)}`;

    for (const idx of a.todoIndices) {
      if (todos[idx]) {
        todos[idx].assignedNodeIds.push(nodeId);
      }
    }

    return {
      id: nodeId,
      name: a.name,
      role: a.role,
      skillMarkdown: a.skill,
      tools: a.tools,
      inputMappings: a.dependsOn.map((dep) => ({
        from: `context.${dep}`,
        to: 'input',
      })),
      outputMappings: [{ from: 'output', to: `context.${a.name}` }],
    };
  });

  // Build edges based on dependencies
  const edges: PipelineEdge[] = [];
  for (const agent of designResult.agents) {
    const targetNode = nodes.find((n) => n.name === agent.name);
    if (!targetNode) continue;

    for (const dep of agent.dependsOn) {
      const sourceNode = nodes.find((n) => n.name === dep);
      if (sourceNode) {
        edges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: 'data',
        });
      }
    }
  }

  const parallelGroups = identifyParallelGroups(nodes, edges);

  onProgress?.('Refinement complete!');

  return {
    id: designId,
    createdAt: Date.now(),
    taskDescription: currentDesign.taskDescription,
    modelUsed: model,
    todos,
    topology: { nodes, edges, parallelGroups },
  };
}
