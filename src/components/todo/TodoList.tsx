import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { cn } from '../../utils';

export default function TodoList() {
  const currentDesign = useAppStore((s) => s.currentDesign);
  const t = useT();

  if (!currentDesign) {
    return (
      <div className="p-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">{t('todo.title')}</h3>
        <p className="text-xs text-slate-500">{t('todo.empty')}</p>
      </div>
    );
  }

  const statusIcons: Record<string, string> = {
    pending: '⬜',
    in_progress: '🔵',
    completed: '✅',
    failed: '❌',
  };

  // Build id-to-name map for agent name resolution
  const idToName: Record<string, string> = {};
  for (const node of currentDesign.topology.nodes) {
    idToName[node.id] = node.name;
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
        {t('todo.title')} ({currentDesign.todos.length})
      </h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {currentDesign.todos.map((todo) => (
          <div
            key={todo.id}
            className={cn(
              'p-2 rounded-lg text-xs border transition',
              todo.status === 'completed' && 'bg-green-900/20 border-green-800',
              todo.status === 'failed' && 'bg-red-900/20 border-red-800',
              todo.status === 'in_progress' && 'bg-blue-900/20 border-blue-800',
              todo.status === 'pending' && 'bg-slate-800 border-slate-700'
            )}
          >
            <div className="flex items-start gap-2">
              <span>{statusIcons[todo.status]}</span>
              <span className="text-slate-300 flex-1">{todo.description}</span>
            </div>
            {todo.assignedNodeIds.length > 0 && (
              <div className="mt-1 ml-6 text-slate-500">
                {t('todo.agents')}: {todo.assignedNodeIds.map((id) => idToName[id] || id).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
