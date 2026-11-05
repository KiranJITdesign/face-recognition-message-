export type AuditEventType =
  | 'attachment_encrypted'
  | 'attachment_decrypted';

export interface AuditEvent {
  type: AuditEventType;
  timestamp: string;
}

const STORAGE_KEY = 'confidential-messenger:audit-log';
const MAX_EVENTS = 100;

export function readAuditLog(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error('Stored audit log has an invalid format');
  return parsed.filter((event): event is AuditEvent =>
    typeof event === 'object' &&
    event !== null &&
    ['attachment_encrypted', 'attachment_decrypted'].includes(
      (event as AuditEvent).type
    ) &&
    typeof (event as AuditEvent).timestamp === 'string'
  );
}

export function appendAuditEvent(type: AuditEventType): void {
  if (typeof window === 'undefined') throw new Error('Audit logging requires a browser');
  const events = readAuditLog();
  events.push({ type, timestamp: new Date().toISOString() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}
