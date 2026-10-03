import React from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { useBackendHealth } from '../../hooks/useBackendHealth';

export const ConnectionBadge: React.FC = () => {
  const { data, isLoading, isError, errorMessage, refetch } = useBackendHealth();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Backend API Status Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-subtle text-xs font-medium">
        <span className="text-pharmacy-text-muted flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-pharmacy-primary" />
          API Server:
        </span>

        {isLoading ? (
          <span className="flex items-center gap-1.5 text-blue-600">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Connecting...
          </span>
        ) : isError ? (
          <span className="flex items-center gap-1.5 text-red-600 font-semibold" title={errorMessage || 'Disconnected'}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Offline
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[#087F5B] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#087F5B]"></span>
            Online
          </span>
        )}

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          title="Refresh connection status"
          className="ml-1 p-0.5 text-gray-400 hover:text-pharmacy-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Supabase Status Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-subtle text-xs font-medium">
        <span className="text-pharmacy-text-muted flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          Supabase:
        </span>

        {isLoading ? (
          <span className="text-gray-400">Checking...</span>
        ) : isError ? (
          <span className="text-gray-500">Unavailable</span>
        ) : data?.supabase.configured ? (
          <span className="flex items-center gap-1 text-[#087F5B] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Configured
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-normal">
            <AlertTriangle className="w-3 h-3" />
            Pending (Phase 1 Ready)
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionBadge;
