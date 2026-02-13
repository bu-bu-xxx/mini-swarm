import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { formatTimestamp, cn } from '../../utils';

export default function LogViewer() {
  const logs = useAppStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColors: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-slate-500',
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-slate-400 uppercase px-3 py-2 border-b border-slate-700 shrink-0">
        Logs ({logs.length})
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5"
      >
        {logs.length === 0 ? (
          <p className="text-slate-500 text-center mt-4">No logs yet</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-1.5 leading-5">
              <span className="text-slate-600 shrink-0">{formatTimestamp(log.timestamp)}</span>
              <span className={cn('shrink-0', levelColors[log.level])}>[{log.nodeName}]</span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
