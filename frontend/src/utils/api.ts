/**
 * Utility to get the correct API URL based on environment.
 * In production (Vercel), we use relative paths to leverage the Vercel Proxy and avoid CORS.
 * In development, we use VITE_BACKEND_URL if provided, or fall back to relative.
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // v3.4.6: In production/Vercel, we MUST use relative paths to leverage the proxy.
  // This bypasses CORS and ensures all requests go through the same origin.
  if (import.meta.env.PROD) {
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
