import axios, { AxiosError } from 'axios';
import { HealthCheckResponse } from '../types';

// Read API base URL from Vite environment variable with a safe fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Fetches backend health check status
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await apiClient.get<HealthCheckResponse>('/health');
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Unable to connect to backend server'
      );
    }
  },
};

export default apiService;
