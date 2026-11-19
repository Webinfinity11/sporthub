/**
 * Runs once when the server starts. TBC installments have no callback, so every 5 minutes the
 * server asks its own /api/tbc/sync route to re-check open applications. Only when TBC is set up.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.TBC_API_KEY || !process.env.TBC_API_SECRET || !process.env.SESSION_SECRET) return;

  const g = globalThis as unknown as { __tbcSyncTimer?: ReturnType<typeof setInterval> };
  if (g.__tbcSyncTimer) return; // dev reloads call register again

  const run = () =>
    fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/tbc/sync`, {
      method: "POST",
      headers: { "x-sync-key": process.env.SESSION_SECRET! },
    }).catch((e) => console.error("TBC sync request failed", e));

  setTimeout(run, 60 * 1000);
  g.__tbcSyncTimer = setInterval(run, 5 * 60 * 1000);
}
