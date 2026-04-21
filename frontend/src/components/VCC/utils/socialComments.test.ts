import { describe, expect, it } from 'vitest';
import { mapSocialComments } from './socialComments';

describe('mapSocialComments', () => {
  it('maps api comments with delete permissions', () => {
    const rows = mapSocialComments([
      {
        id: 'c1',
        user: 'Alice',
        content: 'hello',
        timestamp: '2026-01-01T00:00:00Z',
        can_delete: true,
        is_author: true,
        replies: [
          {
            id: 'r1',
            user: 'Bob',
            content: 'reply',
            timestamp: '2026-01-01T00:01:00Z',
            can_delete: false,
            is_author: false,
            parent_comment_id: 'c1',
          },
        ],
      },
      {
        id: 'c2',
        user: 'Bob',
        content: 'world',
        timestamp: '',
        can_delete: false,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: 'c1',
      user: 'Alice',
      content: 'hello',
      timestamp: '2026-01-01T00:00:00Z',
      canDelete: true,
      isAuthor: true,
      parentCommentId: '',
      replies: [
        {
          id: 'r1',
          user: 'Bob',
          content: 'reply',
          timestamp: '2026-01-01T00:01:00Z',
          canDelete: false,
          isAuthor: false,
          parentCommentId: 'c1',
          replies: [],
        },
      ],
    });
    expect(rows[1].canDelete).toBe(false);
  });

  it('handles empty or malformed payload safely', () => {
    expect(mapSocialComments(undefined as any)).toEqual([]);
    expect(mapSocialComments([{} as any])[0]).toEqual({
      id: '',
      user: 'User',
      content: '',
      timestamp: '',
      canDelete: false,
      isAuthor: false,
      parentCommentId: '',
      replies: [],
    });
  });
});
