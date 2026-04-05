/**
 * Utility to get the correct API URL based on environment.
 * In production (Vercel), we use relative paths to leverage the Vercel Proxy and avoid CORS.
 * In development, we use VITE_BACKEND_URL if provided, or fall back to relative.
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Production: Always use relative path to leverage Vercel Proxy
  const isProd = import.meta.env.PROD;
  if (isProd) {
    const base = 'https://zerobuck-api.onrender.com/api';
    const subPath = normalizedPath.startsWith('/api') ? normalizedPath.substring(4) : normalizedPath;
    return `${base}${subPath}`;
  }

  // Development: Use VITE_BACKEND_URL if available
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || '';
  if (backendUrl) {
    // If backendUrl already includes /api, don't duplicate it
    if (backendUrl.endsWith('/api') && normalizedPath.startsWith('/api')) {
      return `${backendUrl}${normalizedPath.substring(4)}`;
    }
    return `${backendUrl}${normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`}`;
  }

  // Fallback to relative
  return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
};
