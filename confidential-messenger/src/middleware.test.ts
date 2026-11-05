import { describe, expect, it } from 'vitest';
import { createContentSecurityPolicy } from '../middleware';

describe('content security policy', () => {
  it('requires a per-request nonce for scripts and blocks unsafe production scripts', () => {
    const policy = createContentSecurityPolicy('test-nonce', false);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    const scriptPolicy = policy.split(';').find(directive => directive.trim().startsWith('script-src'));
    expect(scriptPolicy).not.toContain("'unsafe-inline'");
    expect(scriptPolicy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('allows eval only for the development server', () => {
    expect(createContentSecurityPolicy('dev-nonce', true)).toContain("'unsafe-eval'");
  });
});
