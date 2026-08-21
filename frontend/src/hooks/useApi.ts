import { useState, useCallback } from 'react';
import { ApiClient } from '../lib/api';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>(endpoint: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequest = useCallback(async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any) => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (method) {
        case 'GET':
          result = await ApiClient.get<T>(endpoint);
          break;
        case 'POST':
          result = await ApiClient.post<T>(endpoint, body);
          break;
        case 'PUT':
          result = await ApiClient.put<T>(endpoint, body);
          break;
        case 'DELETE':
          result = await ApiClient.delete<T>(endpoint);
          break;
      }
      setData(result as T);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      options?.onError?.(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const get = useCallback(() => fetchRequest('GET'), [fetchRequest]);
  const post = useCallback((body: any) => fetchRequest('POST', body), [fetchRequest]);
  const put = useCallback((body: any) => fetchRequest('PUT', body), [fetchRequest]);
  const del = useCallback(() => fetchRequest('DELETE'), [fetchRequest]);

  return { data, loading, error, get, post, put, del, refetch: get };
}
