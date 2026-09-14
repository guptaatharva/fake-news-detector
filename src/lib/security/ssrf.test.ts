import { describe, it, expect, vi } from 'vitest';

const resolve4 = vi.fn();
const resolve6 = vi.fn();

vi.mock('node:dns/promises', () => ({
  default: {
    resolve4: (...args: any[]) => resolve4(...args),
    resolve6: (...args: any[]) => resolve6(...args),
  },
}));

const { assertSafeUrl, UnsafeUrlError } = await import('./ssrf');

describe('assertSafeUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects the localhost hostname outright', async () => {
    await expect(assertSafeUrl('http://localhost/admin')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a literal loopback IP', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects the cloud metadata address', async () => {
    await expect(assertSafeUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a private 10.x IP', async () => {
    await expect(assertSafeUrl('http://10.0.0.5/')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a non-standard port', async () => {
    await expect(assertSafeUrl('http://example.com:8080/')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a hostname that resolves to a private IP (DNS rebinding)', async () => {
    resolve4.mockResolvedValueOnce(['10.0.0.5']);
    resolve6.mockRejectedValueOnce(new Error('no AAAA'));
    await expect(assertSafeUrl('https://rebind.example.com/')).rejects.toThrow(UnsafeUrlError);
  });

  it('allows a hostname that resolves to a public IP', async () => {
    resolve4.mockResolvedValueOnce(['93.184.216.34']);
    resolve6.mockRejectedValueOnce(new Error('no AAAA'));
    const result = await assertSafeUrl('https://public.example.com/article');
    expect(result.resolvedIps).toEqual(['93.184.216.34']);
  });

  it('rejects a hostname that fails to resolve at all', async () => {
    resolve4.mockRejectedValueOnce(new Error('ENOTFOUND'));
    resolve6.mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(assertSafeUrl('https://does-not-exist.example.invalid/')).rejects.toThrow(UnsafeUrlError);
  });
});
