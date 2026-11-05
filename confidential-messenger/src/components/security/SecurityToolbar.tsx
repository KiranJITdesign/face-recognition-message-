'use client';

import { useEffect, useState } from 'react';
import { AuditEvent, readAuditLog } from '@/lib/security/auditLog';
import { panicWipe } from '@/lib/security/panicWipe';

const eventLabels: Record<AuditEvent['type'], string> = {
  attachment_encrypted: 'Attachment encrypted',
  attachment_decrypted: 'Attachment decrypted',
};

export default function SecurityToolbar() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [wipeError, setWipeError] = useState('');
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    try {
      setEvents(readAuditLog().slice().reverse());
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Unable to read security activity');
    }
  }, []);

  const refreshAuditLog = () => {
    try {
      setEvents(readAuditLog().slice().reverse());
      setAuditError('');
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Unable to read security activity');
    }
    setIsAuditOpen(true);
  };

  const handlePanicWipe = async () => {
    if (!window.confirm('Erase this app’s local data and reload? This cannot be undone.')) return;

    setWipeError('');
    try {
      await panicWipe();
      window.location.replace('/chats');
    } catch (error) {
      setWipeError(error instanceof Error ? error.message : 'Panic wipe did not complete');
    }
  };

  return (
    <>
      <div className="security-toolbar">
        <div className="security-toolbar__inner">
          <span className="confidential-badge" title="Local attachment encryption is enabled">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Confidential
          </span>
          <div className="security-toolbar__actions">
            <button type="button" className="security-link" onClick={refreshAuditLog}>
              Audit log
            </button>
            <button type="button" className="panic-button" onClick={handlePanicWipe}>
              Panic wipe
            </button>
          </div>
        </div>
        {wipeError && (
          <p role="alert" className="security-error">
            {wipeError}. Some data may remain on this device.
          </p>
        )}
        {auditError && <p role="status" className="security-error">{auditError}</p>}
      </div>

      {isAuditOpen && (
        <div className="security-dialog-backdrop" role="presentation" onClick={() => setIsAuditOpen(false)}>
          <section
            aria-labelledby="audit-title"
            aria-modal="true"
            className="security-dialog"
            role="dialog"
            onClick={event => event.stopPropagation()}
          >
            <div className="security-dialog__heading">
              <div>
                <p className="eyebrow">On this device only</p>
                <h2 id="audit-title">Security activity</h2>
              </div>
              <button type="button" aria-label="Close audit log" onClick={() => setIsAuditOpen(false)}>×</button>
            </div>
            <p className="security-dialog__note">
              Events contain timestamps and actions only; filenames and message contents are never recorded.
            </p>
            {auditError ? (
              <p className="audit-empty" role="alert">Could not read the local audit log: {auditError}</p>
            ) : events.length === 0 ? (
              <p className="audit-empty">No security activity recorded yet.</p>
            ) : (
              <ol className="audit-list">
                {events.map((event, index) => (
                  <li key={`${event.timestamp}-${index}`}>
                    <span>{eventLabels[event.type]}</span>
                    <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
  );
}
