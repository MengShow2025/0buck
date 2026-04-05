/**
 * Utility to get the correct API URL based on environment.
 * In production (Vercel), we use relative paths to leverage the Vercel Proxy and avoid CORS.
 * In development, we use VITE_BACKEND_URL if provided, or fall back to relative.
 */
export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // v3.4.7: Fixed CORS logic.
  // In production (Vercel), we MUST use relative paths to leverage the Vercel Proxy.
  // This bypasses CORS and ensures all requests go through the same origin.
  // We check for '0buck.com' in the hostname to be absolutely sure we're in prod.
  const isProd = import.meta.env.PROD || window.location.hostname.includes('0buck.com');
  
  if (isProd) {
    return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  }

  // Development: Use VITE_BACKEND_URL if provided
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || '';
  if (backendUrl) {
    if (backendUrl.endsWith('/api') && normalizedPath.startsWith('/api')) {
      return `${backendUrl}${normalizedPath.substring(4)}`;
    }
    return `${backendUrl}${normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`}`;
  }

  // Local Fallback
  return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
};
