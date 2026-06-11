import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, HeartPulse } from 'lucide-react';

function NotFound() {
  // Set page title on mount
  useEffect(() => {
    document.title = "Wrong Ward! — Queue Cure";
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 bg-gradient-to-b from-[#0A1628] to-[#060C16] text-slate-100 min-h-screen relative">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="text-center relative z-10 max-w-md w-full">
        {/* Warning Icon */}
        <div className="inline-flex justify-center items-center mb-6 relative">
          <div className="absolute inset-0 bg-rose-500/20 rounded-full filter blur-xl animate-pulse-slow"></div>
          <div className="relative bg-[#0E1B30] border border-rose-500/30 text-rose-500 p-6 rounded-3xl shadow-xl flex items-center justify-center">
            <HeartPulse className="w-12 h-12" />
          </div>
        </div>

        {/* Fun Hospital 404 Heading */}
        <h1 className="text-4xl font-black text-white font-heading tracking-tight mb-2">Wrong ward!</h1>
        <h2 className="text-base text-[#477CBF] font-bold tracking-wider uppercase mb-4">404 Error: Code Red</h2>
        
        {/* Medical themed description */}
        <p className="text-sm text-slate-400 leading-relaxed mb-8 font-light">
          You seem to have taken a wrong turn in the clinic corridors. The medical resource or ward you are trying to reach does not exist or has been relocated.
        </p>

        {/* Return Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#0066CC] hover:bg-[#0055b3] text-white font-bold text-sm py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 hover:-translate-y-[1px] active:translate-y-0"
          aria-label="Return to Portal Entrance"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Portal Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
