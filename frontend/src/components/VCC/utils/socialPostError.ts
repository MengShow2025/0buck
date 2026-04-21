export const getSocialPostErrorMessage = (err: any): string => {
  const status = err?.response?.status as number | undefined;
  const detail = err?.response?.data?.detail as string | undefined;
  const message = typeof err?.message === 'string' ? err.message : '';

  if (status === 401) {
    return '请先登录后再发布';
  }

  if (detail === 'media_not_committed') {
    return '图片上传未完成，请稍后重试';
  }

  if (message === 'ticket_failed') {
    return '获取上传凭证失败，请稍后重试';
  }

  if (message === 'upload_failed') {
    return '图片上传失败，请检查网络后重试';
  }

  return '发布失败，请稍后重试';
};

