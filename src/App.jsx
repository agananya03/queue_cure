import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import ReceptionistView from './components/ReceptionistView';
import WaitingRoomView from './components/WaitingRoomView';
import PatientCheckIn from './components/PatientCheckIn';
import NotFound from './components/NotFound';
import { isFirebaseConfigured, subscribeToQueue, subscribeToConnectionStatus } from './firebase';
import { Activity, Database, AlertCircle, Home, Heart } from 'lucide-react';
import { ToastProvider } from './components/ui/Toast';

function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fade-in");

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("fade-out");
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("fade-in");
      }, 150); // Route exit: fade out over 150ms
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <main className={`flex-1 flex flex-col relative min-h-0 ${
      transitionStage === "fade-in" ? "animate-page-enter" : "animate-page-exit"
    }`}>
      <Routes location={displayLocation}>
        <Route path="/" element={<HomePage />} />
        <Route path="/receptionist" element={<ReceptionistView />} />
        <Route path="/waiting-room" element={<WaitingRoomView />} />
        <Route path="/checkin" element={<PatientCheckIn />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

function App() {
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFirebaseConnected(isFirebaseConfigured());
    
    // Subscribe to database to detect successful connection
    const unsubscribe = subscribeToQueue(() => {
      // Slight delay so the heartbeat animation is fully appreciated by the user
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    });

    const unsubscribeConn = subscribeToConnectionStatus((status) => {
      setIsConnected(status);
    });

    return () => {
      unsubscribe();
      unsubscribeConn();
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0A1628] flex flex-col items-center justify-center text-slate-100 font-sans">
        <style type="text/css">{`
          @keyframes heartbeatLoader {
            0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(244, 63, 94, 0.4)); }
            14% { transform: scale(1.3); filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.8)); }
            28% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(244, 63, 94, 0.4)); }
            42% { transform: scale(1.3); filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.8)); }
            70% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(244, 63, 94, 0.4)); }
          }
          .animate-heartbeat-loader {
            animation: heartbeatLoader 1.2s infinite ease-in-out;
          }
          @keyframes textFade {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .animate-text-fade {
            animation: textFade 2s infinite ease-in-out;
          }
        `}</style>

        <div className="flex flex-col items-center gap-6">
          {/* Glowing Red Pulse Heart */}
          <div className="bg-rose-500/10 text-rose-500 p-6 rounded-full border border-rose-500/20 animate-heartbeat-loader">
            <Heart className="w-12 h-12 fill-current" />
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-black tracking-wider uppercase text-slate-300">QUEUE CURE</h2>
            <p className="text-xs text-slate-500 mt-1.5 animate-text-fade">Connecting to real-time clinical database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        {/* CSS injection for route transitions */}
        <style type="text/css">{`
          @keyframes pageSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pageFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          .animate-page-enter {
            animation: pageSlideIn 300ms ease-out forwards;
          }
          .animate-page-exit {
            animation: pageFadeOut 150ms ease-in forwards;
          }
        `}</style>

        {/* Reconnecting banner for Firebase */}
        {!isConnected && isFirebaseConfigured() && (
          <div className="bg-rose-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2.5 z-[9999] shrink-0 shadow-md animate-pulse">
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-bold tracking-wider">RECONNECTING TO CLINICAL DATABASE...</span>
          </div>
        )}

        {/* Dynamic Status Header */}
        <header className="bg-navy-900 border-b border-navy-800 px-4 py-2 text-xs flex justify-between items-center shrink-0 z-50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse-slow" />
            <span className="font-semibold text-slate-300 tracking-wider">QUEUE CURE</span>
            <span className="text-slate-500">v1.0.0</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Database className={`w-3.5 h-3.5 ${firebaseConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              {firebaseConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Firebase Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Offline Demo Mode
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Demo Warning Banner */}
        {!firebaseConnected && (
          <div className="bg-gradient-to-r from-amber-950 to-amber-900 border-b border-amber-800 text-amber-200 text-xs px-4 py-2 flex items-center justify-between z-40 gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Running in Local Demo Mode:</strong> Database states are saved to browser local storage and will sync in real-time across open tabs. To connect to your cloud database, edit <code>src/firebase.js</code>.
              </span>
            </div>
          </div>
        )}

        {/* Page Routing Container */}
        <AnimatedRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
