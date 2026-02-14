import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge as rfAddEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store';
import AgentNodeComponent from './AgentNode';

const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
};

export default function PipelineGraph() {
  const currentDesign = useAppStore((s) => s.currentDesign);
  const nodeStates = useAppStore((s) => s.nodeStates);
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const selectedEdgeId = useAppStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useAppStore((s) => s.setSelectedEdgeId);
  const addEdgeToStore = useAppStore((s) => s.addEdge);
  const removeEdgeFromStore = useAppStore((s) => s.removeEdge);
  const addAgentToStore = useAppStore((s) => s.addAgent);
  const removeAgentFromStore = useAppStore((s) => s.removeAgent);
  const newAgentId = useAppStore((s) => s.newAgentId);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('researcher');

  const initialNodes = useMemo(() => {
    if (!currentDesign) return [];
    const { nodes: agentNodes, parallelGroups } = currentDesign.topology;

    return agentNodes.map((agent) => {
      // Find which level this agent is in
      let level = 0;
      let posInLevel = 0;
      for (let i = 0; i < parallelGroups.length; i++) {
        const idx = parallelGroups[i].indexOf(agent.id);
        if (idx >= 0) {
          level = i;
          posInLevel = idx;
          break;
        }
      }

      const groupSize = parallelGroups[level]?.length || 1;
      const xOffset = (posInLevel - (groupSize - 1) / 2) * 250;

      return {
        id: agent.id,
        type: 'agent',
        position: { x: 400 + xOffset, y: level * 180 + 50 },
        data: {
          label: agent.name,
          role: agent.role,
          status: nodeStates[agent.id]?.status || 'idle',
          toolCount: agent.tools.length,
        },
      } satisfies Node;
    });
  }, [currentDesign, nodeStates]);

  const initialEdges = useMemo(() => {
    if (!currentDesign) return [] as Edge[];
    return currentDesign.topology.edges.map((e) => {
      const isSelected = e.id === selectedEdgeId;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: isSelected ? '#f59e0b' : '#8b5cf6',
          strokeWidth: isSelected ? 3 : 1,
          filter: isSelected ? 'drop-shadow(0 0 6px #f59e0b)' : undefined,
        },
        className: isSelected ? 'selected-edge' : undefined,
      } satisfies Edge;
    });
  }, [currentDesign, selectedEdgeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, [setSelectedEdgeId, setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  // Handle new edge connection
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edgeId = `edge-${connection.source}-${connection.target}`;
    const newEdge: Edge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      label: 'data',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#8b5cf6' },
    };
    setEdges((eds) => rfAddEdge(newEdge, eds));
    addEdgeToStore({ id: edgeId, source: connection.source, target: connection.target, label: 'data' });
  }, [setEdges, addEdgeToStore]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    for (const edge of deletedEdges) {
      removeEdgeFromStore(edge.id);
    }
    setSelectedEdgeId(null);
  }, [removeEdgeFromStore, setSelectedEdgeId]);

  // Handle node deletion (via keyboard)
  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    for (const node of deletedNodes) {
      removeAgentFromStore(node.id);
    }
  }, [removeAgentFromStore]);

  // Add new agent
  const handleAddAgent = useCallback(() => {
    if (!newAgentName.trim() || !currentDesign) return;
    const agentId = newAgentId();
    addAgentToStore({
      id: agentId,
      name: newAgentName.trim(),
      role: newAgentRole,
      skillMarkdown: `You are a ${newAgentRole} agent named ${newAgentName.trim()}. Complete your assigned tasks.`,
      tools: ['context_read', 'context_write'],
      inputMappings: [],
      outputMappings: [{ from: 'output', to: `context.${newAgentName.trim()}` }],
    });
    setNewAgentName('');
    setNewAgentRole('researcher');
    setShowAddAgent(false);
  }, [newAgentName, newAgentRole, currentDesign, newAgentId, addAgentToStore]);

  if (!currentDesign) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🐝</div>
          <p className="text-lg">Describe a task to generate your Agent Swarm</p>
          <p className="text-sm mt-2 text-slate-600">The pipeline will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        deleteKeyCode={["Delete", "Backspace"]}
        fitView
        className="bg-slate-900"
      >
        <Background color="#475569" gap={20} />
        <Controls className="!bg-slate-800 !border-slate-600 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600" />
        <MiniMap
          nodeColor={(n) => {
            const status = n.data?.status as string;
            if (status === 'running') return '#3b82f6';
            if (status === 'completed') return '#22c55e';
            if (status === 'failed') return '#ef4444';
            return '#64748b';
          }}
          className="!bg-slate-800 !border-slate-600 !rounded-lg"
        />
      </ReactFlow>

      {/* Toolbar */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <button
          onClick={() => setShowAddAgent(!showAddAgent)}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium shadow-lg transition"
        >
          ➕ Add Agent
        </button>
      </div>

      {/* Add Agent Dialog */}
      {showAddAgent && (
        <div className="absolute top-12 right-3 z-20 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl w-64 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">New Agent</h4>
          <input
            type="text"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="Agent name..."
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={newAgentRole}
            onChange={(e) => setNewAgentRole(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="researcher">🔍 Researcher</option>
            <option value="coder">💻 Coder</option>
            <option value="reviewer">📝 Reviewer</option>
            <option value="coordinator">🎯 Coordinator</option>
            <option value="writer">✍️ Writer</option>
            <option value="analyst">📊 Analyst</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddAgent}
              disabled={!newAgentName.trim()}
              className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddAgent(false); setNewAgentName(''); }}
              className="flex-1 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs font-medium transition"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500">Tip: Select a node and press Delete to remove it</p>
        </div>
      )}
    </div>
  );
}
