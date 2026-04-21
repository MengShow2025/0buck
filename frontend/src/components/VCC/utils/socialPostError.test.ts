import { describe, expect, it } from 'vitest';
import { getSocialPostErrorMessage } from './socialPostError';

describe('getSocialPostErrorMessage', () => {
  it('maps auth and media upload errors', () => {
    expect(getSocialPostErrorMessage({ response: { status: 401 } })).toBe('请先登录后再发布');
    expect(getSocialPostErrorMessage(new Error('upload_failed'))).toBe('图片上传失败，请检查网络后重试');
    expect(getSocialPostErrorMessage({ response: { data: { detail: 'media_not_committed' } } })).toBe('图片上传未完成，请稍后重试');
  });

  it('falls back to generic message', () => {
    expect(getSocialPostErrorMessage({})).toBe('发布失败，请稍后重试');
  });
});
