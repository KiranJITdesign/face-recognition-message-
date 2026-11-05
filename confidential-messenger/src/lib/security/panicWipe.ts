import { wipeSensitiveBuffers } from '@/lib/crypto/utils';

export async function panicWipe(): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Panic wipe requires a browser');

  wipeSensitiveBuffers();
  window.localStorage.clear();
  window.sessionStorage.clear();

  const cleanupTasks: Promise<unknown>[] = [];
  if ('caches' in window) {
    cleanupTasks.push(
      window.caches.keys().then(keys => Promise.all(keys.map(key => window.caches.delete(key))))
    );
  }
  if ('serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.unregister()))
      )
    );
  }
  if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
    cleanupTasks.push(
      indexedDB.databases().then(databases => Promise.all(
        databases
          .filter(database => database.name)
          .map(database => new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(database.name as string);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error ?? new Error('Failed to delete local database'));
            request.onblocked = () => reject(new Error(`Database deletion blocked: ${database.name}`));
          }))
      ))
    );
  }

  const results = await Promise.allSettled(cleanupTasks);
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason);
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Some browser data could not be removed');
  }
}
