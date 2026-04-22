type StorageLike = Pick<Storage, 'setItem'>;

export function bootstrapAuthFromUrl(rawUrl: string, storage: StorageLike) {
  const url = new URL(rawUrl);
  const params = url.searchParams;
  const authSuccess = params.get('auth_success') === 'true';
  const accessToken = params.get('access_token');

  if (authSuccess && accessToken) {
    storage.setItem('access_token', accessToken);
  }

  if (authSuccess) {
    params.delete('auth_success');
    params.delete('access_token');
    params.delete('email');
  }

  const query = params.toString();
  const cleanedUrl = `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;

  return {
    didBootstrap: authSuccess && Boolean(accessToken),
    cleanedUrl,
  };
}
