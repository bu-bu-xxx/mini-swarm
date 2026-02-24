import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '../../utils';

interface AgentNodeData {
  label: string;
  role: string;
  status: string;
  toolCount: number;
  [key: string]: unknown;
}

function AgentNode({ data }: NodeProps) {
  const { label, role, status, toolCount } = data as unknown as AgentNodeData;

  const roleIcons: Record<string, string> = {
    researcher: '🔍',
    coder: '💻',
    reviewer: '📝',
    coordinator: '🎯',
    writer: '✍️',
    analyst: '📊',
  };

  const statusColors: Record<string, string> = {
    idle: 'border-slate-500 bg-slate-800',
    running: 'border-blue-500 bg-blue-900/50 shadow-blue-500/20 shadow-lg',
    completed: 'border-green-500 bg-green-900/50',
    failed: 'border-red-500 bg-red-900/50',
  };

  const statusBadge: Record<string, string> = {
    idle: 'bg-slate-600 text-slate-300',
    running: 'bg-blue-600 text-blue-100',
    completed: 'bg-green-600 text-green-100',
    failed: 'bg-red-600 text-red-100',
  };

  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all duration-300',
        statusColors[status] || statusColors.idle,
        status === 'running' && 'agent-node-running'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{roleIcons[role] || '🤖'}</span>
        <span className="font-semibold text-white text-sm">{label}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadge[status] || statusBadge.idle)}>
          {capitalizedStatus}
        </span>
        <span className="text-xs text-slate-400">🔧 {toolCount}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
}

export default memo(AgentNode);
