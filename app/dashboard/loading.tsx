export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="flex h-full w-full">
      <div className="hidden w-80 flex-col gap-3 border-r border-zinc-200 p-4 dark:border-zinc-800 md:flex">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
