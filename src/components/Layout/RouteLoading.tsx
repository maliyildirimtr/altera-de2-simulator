/** Shown while a tool page's code chunk downloads. */
export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-1 flex items-center justify-center text-[0.8125rem]"
      style={{ color: 'var(--text-muted)' }}
    >
      Loading…
    </div>
  );
}
