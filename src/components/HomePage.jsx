import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Monitor, UserCheck, ArrowRight, Activity } from 'lucide-react';

function HomePage() {
  // Set tab title on mount
  useEffect(() => {
    document.title = "Queue Cure — Home";
  }, []);

  const floatingIcons = [
    { left: '8%', size: '16px', delay: '0s', duration: '14s', type: '+' },
    { left: '18%', size: '22px', delay: '2s', duration: '18s', type: 'x' },
    { left: '28%', size: '14px', delay: '1s', duration: '15s', type: '+' },
    { left: '38%', size: '26px', delay: '4s', duration: '22s', type: 'x' },
    { left: '48%', size: '12px', delay: '0.5s', duration: '12s', type: '+' },
    { left: '58%', size: '20px', delay: '3s', duration: '17s', type: 'x' },
    { left: '68%', size: '24px', delay: '5s', duration: '20s', type: '+' },
    { left: '78%', size: '15px', delay: '6s', duration: '14s', type: 'x' },
    { left: '88%', size: '18px', delay: '8s', duration: '16s', type: '+' },
    { left: '94%', size: '22px', delay: '1.5s', duration: '19s', type: 'x' },
    { left: '13%', size: '12px', delay: '7s', duration: '13s', type: '+' },
    { left: '23%', size: '20px', delay: '5s', duration: '16s', type: 'x' },
    { left: '43%', size: '16px', delay: '9s', duration: '15s', type: '+' },
    { left: '63%', size: '18px', delay: '2.5s', duration: '13s', type: 'x' },
    { left: '83%', size: '25px', delay: '5.5s', duration: '21s', type: '+' },
  ];

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-[#0A1628] to-[#060D1A] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Floating Animated Symbols Background (CSS keyframes) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <style type="text/css">{`
          @keyframes floatUp {
            0% {
              transform: translateY(110vh) rotate(0deg);
              opacity: 0;
            }
            15% {
              opacity: 0.15;
            }
            85% {
              opacity: 0.15;
            }
            100% {
              transform: translateY(-10vh) rotate(360deg);
              opacity: 0;
            }
          }
          .float-icon {
            position: absolute;
            bottom: -50px;
            animation: floatUp 15s linear infinite;
            color: #477CBF;
            font-family: 'DM Sans', sans-serif;
            font-weight: 300;
          }
        `}</style>
        {floatingIcons.map((ico, idx) => (
          <div
            key={idx}
            className="float-icon text-blue-400/20"
            style={{
              left: ico.left,
              fontSize: ico.size,
              animationDelay: ico.delay,
              animationDuration: ico.duration,
            }}
          >
            {ico.type}
          </div>
        ))}
      </div>

      {/* Decorative Radial Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Header section */}
      <header className="px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#0066CC]/15 text-[#0066CC] border border-[#0066CC]/20 p-2.5 rounded-xl">
            <Activity className="w-5 h-5 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-heading text-white">Queue Cure</h1>
            <span className="text-[9px] text-[#477CBF] font-bold tracking-widest uppercase">Smart Flow Management</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-bold font-mono tracking-wider">v1.1.0</div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center z-10 relative">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-4 font-heading">
            Triage & Dispatch <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-[#00D4AA] bg-clip-text text-transparent">
              In Perfect Sync
            </span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed font-light">
            An automated, real-time patient queue system designed to reduce hospital lobby congestion, synthesize chimes, and improve clinical efficiency.
          </p>
        </div>

        {/* 3-Column Portal Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          
          {/* Portal 1: Receptionist Console */}
          <Link
            to="/receptionist"
            className="group relative flex flex-col justify-between p-6 bg-[#0E1B30]/80 hover:bg-[#122440] border border-[#1E3A5F]/40 hover:border-blue-500/60 rounded-2xl text-left transition-all duration-300 shadow-xl hover:shadow-blue-500/5 hover:-translate-y-2 overflow-hidden"
            aria-label="Launch Receptionist Panel"
          >
            <div>
              <div className="bg-blue-500/10 text-blue-400 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-blue-500/10">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Receptionist Panel</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Register arriving patients, set consultation pacing, manage doctors, and dispatch tokens from a unified, live dashboard.
              </p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-800/40 flex items-center justify-between text-blue-400 text-xs font-semibold group-hover:underline">
              <span>Open Console</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </Link>

          {/* Portal 2: Lobby TV Display */}
          <Link
            to="/waiting-room"
            className="group relative flex flex-col justify-between p-6 bg-[#0E1B30]/80 hover:bg-[#122440] border border-[#1E3A5F]/40 hover:border-teal-500/60 rounded-2xl text-left transition-all duration-300 shadow-xl hover:shadow-teal-500/5 hover:-translate-y-2 overflow-hidden"
            aria-label="Launch Lobby TV Board"
          >
            <div>
              <div className="bg-teal-500/10 text-teal-400 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-teal-500/10">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Lobby TV Board</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                A high-visibility display board for clinic lobbies. Shows the active called token, up-next sequence, and plays 3-tone chimes.
              </p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-800/40 flex items-center justify-between text-teal-400 text-xs font-semibold group-hover:underline">
              <span>Open Lobby Board</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </Link>

          {/* Portal 3: Patient Self Check-in */}
          <Link
            to="/checkin"
            className="group relative flex flex-col justify-between p-6 bg-[#0E1B30]/80 hover:bg-[#122440] border border-[#1E3A5F]/40 hover:border-emerald-500/60 rounded-2xl text-left transition-all duration-300 shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-2 overflow-hidden"
            aria-label="Launch Patient Self Check-in"
          >
            <div>
              <div className="bg-emerald-500/10 text-emerald-400 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/10">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">Self Check-in</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Mobile-optimized triage registration portal. Enables patients to check-in, get their token, and monitor queue position in real-time.
              </p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-800/40 flex items-center justify-between text-emerald-400 text-xs font-semibold group-hover:underline">
              <span>Check-in Now</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </Link>

        </div>
      </main>

      {/* Redesigned footer containing Wooble Hackathon meta info */}
      <footer className="w-full py-6 bg-black/20 border-t border-[#1E3A5F]/20 text-center z-10 shrink-0">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em]">
          Queue Cure &apos;26 • Built for Wooble Hackathon
        </p>
      </footer>

    </div>
  );
}

export default HomePage;
