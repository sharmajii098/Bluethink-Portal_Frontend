/**
 * When an AI action confirmation has an uncertain outcome, preserve a minimal
 * per-account warning across dialog closes and page reloads. Never persist the
 * raw confirmation token, action payload, reference, or JWT.
 */
export interface RecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = "bt_ai_unverified_action_v1:";

function storageOrNull(explicit?: RecoveryStorage | null): RecoveryStorage | null {
  if (explicit !== undefined) return explicit;
  try { return typeof window === "undefined" ? null : window.sessionStorage; }
  catch { return null; }
}

function keyFor(userId?: string | null): string | null {
  return userId?.trim() ? `${PREFIX}${encodeURIComponent(userId.trim())}` : null;
}

export function hasUnverifiedAiAction(userId?: string | null, storage?: RecoveryStorage | null): boolean {
  const key = keyFor(userId);
  if (!key) return false;
  try { return storageOrNull(storage)?.getItem(key) === "1"; }
  catch { return false; }
}

export function markUnverifiedAiAction(userId?: string | null, storage?: RecoveryStorage | null): void {
  const key = keyFor(userId);
  if (!key) return;
  try { storageOrNull(storage)?.setItem(key, "1"); }
  catch { /* In-memory dialog warning remains in place if storage is disabled. */ }
}

export function clearUnverifiedAiAction(userId?: string | null, storage?: RecoveryStorage | null): void {
  const key = keyFor(userId);
  if (!key) return;
  try { storageOrNull(storage)?.removeItem(key); }
  catch { /* Do not break a user's active dialog if browser storage is disabled. */ }
}
