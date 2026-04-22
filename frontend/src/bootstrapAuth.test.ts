import { describe, expect, it } from 'vitest';
import { bootstrapAuthFromUrl } from './bootstrapAuth.ts';

describe('bootstrapAuthFromUrl', () => {
  it('stores access_token before app boot and strips auth params from url', () => {
    const setItemCalls: Array<[string, string]> = [];
    const storage = {
      setItem: (key: string, value: string) => {
        setItemCalls.push([key, value]);
      },
    };

    const result = bootstrapAuthFromUrl(
      'https://www.0buck.com/?auth_success=true&access_token=token-123&email=test@example.com',
      storage,
    );

    expect(setItemCalls).toEqual([['access_token', 'token-123']]);
    expect(result.didBootstrap).toBe(true);
    expect(result.cleanedUrl).toBe('https://www.0buck.com/');
  });

  it('keeps unrelated query params', () => {
    const setItemCalls: Array<[string, string]> = [];
    const storage = {
      setItem: (key: string, value: string) => {
        setItemCalls.push([key, value]);
      },
    };

    const result = bootstrapAuthFromUrl(
      'https://www.0buck.com/?auth_success=true&access_token=token-123&redirect=%2Forders',
      storage,
    );

    expect(setItemCalls).toEqual([['access_token', 'token-123']]);
    expect(result.cleanedUrl).toBe('https://www.0buck.com/?redirect=%2Forders');
  });

  it('does nothing when auth_success is absent', () => {
    const setItemCalls: Array<[string, string]> = [];
    const storage = {
      setItem: (key: string, value: string) => {
        setItemCalls.push([key, value]);
      },
    };

    const result = bootstrapAuthFromUrl('https://www.0buck.com/?foo=bar', storage);

    expect(setItemCalls).toEqual([]);
    expect(result.didBootstrap).toBe(false);
    expect(result.cleanedUrl).toBe('https://www.0buck.com/?foo=bar');
  });
});
