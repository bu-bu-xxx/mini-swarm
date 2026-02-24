import { useAppStore } from '../../store';
import { useT } from '../../i18n';

export default function GeneratedPagesSidebar() {
  const generatedPages = useAppStore((s) => s.generatedPages);
  const clearGeneratedPages = useAppStore((s) => s.clearGeneratedPages);
  const t = useT();

  const handleClear = () => {
    if (!window.confirm(t('pages.confirmClear'))) return;
    clearGeneratedPages();
  };

  return (
    <div className="p-3 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">
          🌐 {t('pages.title')} ({generatedPages.length})
        </h3>
        <button
          onClick={handleClear}
          disabled={generatedPages.length === 0}
          className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
          title={t('pages.clear')}
        >
          {t('pages.clear')}
        </button>
      </div>

      {generatedPages.length === 0 ? (
        <p className="text-xs text-slate-600">{t('pages.empty')}</p>
      ) : (
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {generatedPages.map((page) => (
            <div key={page.id} className="text-xs bg-slate-800/80 border border-slate-700 rounded-lg p-2">
              <div className="text-slate-300 truncate">{page.title}</div>
              <div className="text-slate-500 truncate">{page.entryPath}</div>
              <div className="mt-1 flex items-center justify-between">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  {t('pages.open')}
                </a>
                <span className="text-slate-600 text-[10px]">
                  {new Date(page.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
