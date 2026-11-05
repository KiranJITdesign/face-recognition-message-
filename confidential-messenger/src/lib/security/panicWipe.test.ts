// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { trackSensitiveBuffer } from '@/lib/crypto/utils';
import { appendAuditEvent, readAuditLog } from './auditLog';
import { panicWipe } from './panicWipe';

describe('local security controls', () => {
  it('records only the action and timestamp in the audit log', () => {
    localStorage.clear();
    appendAuditEvent('attachment_encrypted');

    expect(readAuditLog()).toHaveLength(1);
    expect(readAuditLog()[0].type).toBe('attachment_encrypted');
    expect(localStorage.getItem('confidential-messenger:audit-log')).not.toContain('filename');
  });

  it('clears web storage and tracked key material during panic wipe', async () => {
    localStorage.setItem('test-data', 'private');
    sessionStorage.setItem('test-data', 'private');
    const key = trackSensitiveBuffer(new Uint8Array([1, 2, 3, 4]));

    await panicWipe();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(key).toEqual(new Uint8Array(4));
  });
});
