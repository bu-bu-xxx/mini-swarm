import { useAppStore } from '../../store';

export default function EdgeDrawer() {
  const selectedEdgeId = useAppStore((s) => s.selectedEdgeId);
  const currentDesign = useAppStore((s) => s.currentDesign);
  const setSelectedEdgeId = useAppStore((s) => s.setSelectedEdgeId);
  const removeEdge = useAppStore((s) => s.removeEdge);

  if (!selectedEdgeId || !currentDesign) return null;

  const edge = currentDesign.topology.edges.find((e) => e.id === selectedEdgeId);
  if (!edge) return null;

  const sourceNode = currentDesign.topology.nodes.find((n) => n.id === edge.source);
  const targetNode = currentDesign.topology.nodes.find((n) => n.id === edge.target);

  const handleDelete = () => {
    removeEdge(edge.id);
    setSelectedEdgeId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        aria-label="Close drawer"
        onClick={() => setSelectedEdgeId(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setSelectedEdgeId(null); }}
      />

      <div className="relative ml-auto w-[360px] bg-slate-800 border-l border-slate-700 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold">🔗 Connection</h2>
          <button
            onClick={() => setSelectedEdgeId(null)}
            aria-label="Close"
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Connection Info */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Connection Details</h3>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">From:</span>
                <span className="text-blue-400 font-medium">{sourceNode?.name || edge.source}</span>
              </div>
              <div className="flex items-center justify-center text-slate-500">
                <span>↓</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">To:</span>
                <span className="text-green-400 font-medium">{targetNode?.name || edge.target}</span>
              </div>
              {edge.label && (
                <div className="flex items-center gap-2 text-sm pt-1 border-t border-slate-700">
                  <span className="text-slate-400">Label:</span>
                  <span className="text-purple-400">{edge.label}</span>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Actions</h3>
            <button
              onClick={handleDelete}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              🗑️ Delete Connection
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Tip: You can also select a connection and press Delete or Backspace to remove it.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
