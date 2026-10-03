import React from 'react';
import { Sparkles, Calendar, Info } from 'lucide-react';

export const WelcomeBanner: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-subtle mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDF5E9] text-[#087F5B] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Operational Console
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-pharmacy-text-main tracking-tight">
            Good morning, Dr. Vance! 👋
          </h2>
          <p className="text-sm text-pharmacy-text-muted mt-1">
            Here's your pharmacy overview. 14 items require immediate reordering attention.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
            <Calendar className="w-4 h-4 text-[#087F5B]" />
            <span>{currentDate}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200/50">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Phase 1: Illustrative preview data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
