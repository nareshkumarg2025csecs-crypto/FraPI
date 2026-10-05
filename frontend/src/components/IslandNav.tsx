import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { PillButton } from './PillButton';

export const IslandNav: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Analyzer', path: '/check' },
    { label: 'References', path: '/references' },
    { label: 'Scam Library', path: '/library' },
    { label: 'History', path: '/history' },
    { label: 'Evaluation', path: '/evaluation' },
    { label: 'Privacy & Specs', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-4 z-50 px-4 max-w-7xl mx-auto w-full">
      {/* Desktop & Tablet Floating Capsule */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 bg-[#131d2e]/90 backdrop-blur-md border border-[#233044] rounded-full shadow-lg shadow-black/40">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-[#f8fafc] hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">FraPI Sentinel</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
            2.0
          </span>
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                isActive(link.path)
                  ? 'bg-[#1e293b] text-sky-400 border border-[#334155]'
                  : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-3">
          <Link to="/check">
            <PillButton size="sm" showArrow variant="primary">
              Verify QR
            </PillButton>
          </Link>
        </div>
      </div>

      {/* Mobile Compact Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-[#131d2e]/95 backdrop-blur-md border border-[#233044] rounded-2xl shadow-lg">
        <Link to="/" className="flex items-center gap-2 text-[#f8fafc]">
          <div className="w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">FraPI Sentinel</span>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-[#94a3b8] hover:text-[#f8fafc] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Fullscreen Navigation Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] bg-[#0b0f17]/98 z-40 px-6 py-8 flex flex-col justify-between border-t border-[#233044]">
          <nav className="flex flex-col gap-3">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`p-3.5 text-base font-semibold rounded-xl transition-colors ${
                isActive('/') ? 'bg-[#131d2e] text-sky-400 border border-[#233044]' : 'text-[#f8fafc]'
              }`}
            >
              Home
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`p-3.5 text-base font-semibold rounded-xl transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#131d2e] text-sky-400 border border-[#233044]'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/design"
              onClick={() => setMobileOpen(false)}
              className={`p-3.5 text-base font-semibold rounded-xl transition-colors ${
                isActive('/design') ? 'bg-[#131d2e] text-sky-400 border border-[#233044]' : 'text-[#64748b]'
              }`}
            >
              Design System Showcase
            </Link>
          </nav>

          <div className="pt-6 border-t border-[#233044] flex flex-col gap-3">
            <Link to="/check" onClick={() => setMobileOpen(false)}>
              <PillButton size="lg" showArrow className="w-full">
                Verify Payment QR
              </PillButton>
            </Link>
            <p className="text-xs text-center text-[#64748b]">
              100% Privacy-Preserving • On-Device UPI Verification
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
