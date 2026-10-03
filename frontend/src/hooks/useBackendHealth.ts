import { useState, useEffect, useCallback } from 'react';
import { apiService, API_BASE_URL } from '../services/api';
import { HealthCheckResponse } from '../types';

export interface BackendHealthState {
  data: HealthCheckResponse | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  apiUrl: string;
  refetch: () => Promise<void>;
}

export function useBackendHealth(): BackendHealthState {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      const response = await apiService.checkHealth();
      setData(response);
    } catch (err: unknown) {
      setIsError(true);
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setErrorMessage(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Periodically recheck every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    data,
    isLoading,
    isError,
    errorMessage,
    apiUrl: API_BASE_URL,
    refetch: fetchHealth,
  };
}
