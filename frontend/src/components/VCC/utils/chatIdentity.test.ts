import { describe, expect, it } from 'vitest';
import { resolveChatDisplayName } from './chatIdentity';

describe('resolveChatDisplayName', () => {
  it('uses latest butler name for ai chat', () => {
    const name = resolveChatDisplayName(
      { id: '2', name: 'AI Butler', isAiButler: true },
      '小七'
    );
    expect(name).toBe('小七');
  });

  it('keeps active chat name for normal chat', () => {
    const name = resolveChatDisplayName(
      { id: 'friend_1', name: 'Alex Design' },
      '小七'
    );
    expect(name).toBe('Alex Design');
  });
});
