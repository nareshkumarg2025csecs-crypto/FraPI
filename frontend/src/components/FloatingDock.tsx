import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scan } from 'lucide-react';

export const FloatingDock: React.FC = () => {
  const location = useLocation();

  // Hide on /check page since user is already analyzing
  if (location.pathname === '/check') {
    return null;
  }

  return (
    <aside aria-label="Quick Actions" className="fixed bottom-6 right-6 z-40">
      <Link
        to="/check"
        className="group flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#131d2e]/95 hover:bg-[#1e293b] text-[#f8fafc] border border-[#233044] hover:border-sky-500/50 shadow-xl shadow-black/60 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 min-h-[44px]"
      >
        <span className="w-6 h-6 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
          <Scan className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs md:text-sm font-bold text-[#f8fafc]">
          Check a message
        </span>
        <span className="text-sky-400 font-bold text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          ↗
        </span>
      </Link>
    </aside>
  );
};
