import { describe, expect, it } from 'vitest';
import { shouldUseButlerBackend } from './chatRouting';

describe('shouldUseButlerBackend', () => {
  it('returns true for explicit ai butler context', () => {
    expect(shouldUseButlerBackend({ id: 'x', isAiButler: true })).toBe(true);
  });

  it('returns true for legacy lounge ai id', () => {
    expect(shouldUseButlerBackend({ id: '2' })).toBe(true);
  });

  it('returns false for normal private chat', () => {
    expect(shouldUseButlerBackend({ id: 'friend_1', type: 'private' })).toBe(false);
  });
});
