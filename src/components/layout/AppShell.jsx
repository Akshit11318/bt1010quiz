const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'local';

export function AppShell({ children, showFooter = true }) {
  return (
    <div className="relative flex flex-col h-[calc(100dvh-1rem)] mt-2 lg:mt-4 w-full max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden font-sans">
      {children}
      {showFooter && (
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400 dark:text-slate-500">
          (c) akshit 2026 | {BUILD_ID}
        </p>
      )}
    </div>
  )
}
