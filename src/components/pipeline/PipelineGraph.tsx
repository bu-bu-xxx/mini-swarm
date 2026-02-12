import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
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

  const initialNodes = useMemo(() => {
    if (!currentDesign) return [];
    const { nodes: agentNodes, parallelGroups } = currentDesign.topology;

    return agentNodes.map((agent, _index) => {
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
    if (!currentDesign) return [];
    return currentDesign.topology.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#8b5cf6' },
    } satisfies Edge));
  }, [currentDesign]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
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
  );
}
