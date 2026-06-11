import React, { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToQueue, subscribeToConnectionStatus } from '../firebase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Volume2, 
  VolumeX, 
  Clock, 
  Activity, 
  Eye, 
  Ticket, 
  Users, 
  ArrowUpRight, 
  Heart,
  HeartPulse, 
  Check, 
  CheckCircle, 
  Sliders, 
  QrCode
} from 'lucide-react';
import { 
  Card, 
  TokenBadge, 
  Button, 
  Badge 
} from './ui';

// Shared requestAnimationFrame count-up hook
function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = count;
    const end = Number(target) || 0;
    if (start === end) return;

    const startTime = performance.now();
    let frameId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // Ease-out quad
      const current = Math.floor(start + (end - start) * ease);
      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return count;
}

// Independent Clock Component for subheader
const SubHeaderClock = React.memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
      {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  );
});

// Memoized Patient Card for waiting list
const LobbyPatientCard = React.memo(({ patient, index, now, avgTime, getLabelBadgeVariant, formatWaitTime }) => {
  const estimatedWaitVal = index * (avgTime || 10);
  const waitDurationMins = Math.max(0, Math.floor((now - patient.addedAt) / 60000));
  const isFirst = index === 0;

  // Ordinal position formatting
  const getOrdinalSuffix = (num) => {
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };

  return (
    <div 
      style={{ animationDelay: `${index * 50}ms` }}
      className={`p-4 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden transition-all animate-spring-in ${
        isFirst ? 'border-l-4 border-l-[#0066CC] pl-3' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-3">
        <TokenBadge 
          token={patient.id} 
          variant="waiting" 
          size="sm" 
        />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800 truncate">{patient.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 font-bold font-mono">
              Waiting {waitDurationMins > 0 ? `${waitDurationMins}m` : '< 1m'}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] text-slate-400 font-bold font-mono">
              Est. wait: {formatWaitTime(estimatedWaitVal)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={getLabelBadgeVariant(patient.label)} size="sm">
          {patient.label || 'Walk-in'}
        </Badge>
        <div className="h-8 w-px bg-slate-200 mx-1" />
        <span className="text-xs font-black font-mono text-slate-650 bg-slate-100 px-2 py-0.5 rounded">
          {getOrdinalSuffix(index + 1)}
        </span>
      </div>
    </div>
  );
});

function WaitingRoomView() {
  const [queueData, setQueueData] = useState({
    currentToken: 0,
    avgConsultationTime: 10,
    lastTokenIssued: 0,
    patients: {}
  });

  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('qc_waiting_room_mute') === 'false');
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(document.body.classList.contains('high-contrast'));

  // Animation states for serving card green flash & slide up
  const [cardFlash, setCardFlash] = useState(false);
  const [tokenAnimation, setTokenAnimation] = useState({ current: 0, prev: 0, trigger: false });
  
  // Interactive patient token lookup states
  const [lookupToken, setLookupToken] = useState('');
  
  // Tick for waiting duration calculations
  const [now, setNow] = useState(Date.now());

  const prevTokenRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Set page title on mount
  useEffect(() => {
    document.title = "Waiting Room — Queue Cure";
  }, []);

  // Web Audio API C5-E5-G5 3-tone chime generator
  const playChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (frequency, startOffset, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);
        
        // Attack/Release envelope (duration 150ms)
        gainNode.gain.setValueAtTime(0, ctx.currentTime + startOffset);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + startOffset + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime + startOffset);
        osc.stop(ctx.currentTime + startOffset + duration);
      };
      
      playNote(523.25, 0.0, 0.15);  // Tone 1: C5
      playNote(659.25, 0.2, 0.15);  // Tone 2: E5
      playNote(783.99, 0.4, 0.15);  // Tone 3: G5
    } catch (e) {
      console.warn("Chime blocked by browser policy:", e);
    }
  }, []);

  // Subscribe to real-time database updates from Firebase
  useEffect(() => {
    const unsubscribeQueue = subscribeToQueue((data) => {
      setQueueData(data);
      
      const newToken = data.currentToken || 0;
      if (newToken !== prevTokenRef.current) {
        // Trigger background flash
        setCardFlash(true);

        // Trigger slide-up token state
        setTokenAnimation({
          prev: prevTokenRef.current,
          current: newToken,
          trigger: true
        });

        const timer = setTimeout(() => {
          setCardFlash(false);
          setTokenAnimation(prev => ({ ...prev, trigger: false }));
        }, 800);

        // Play audio chime if enabled
        if (soundEnabledRef.current && newToken > 0) {
          playChime();
        }

        prevTokenRef.current = newToken;
        return () => clearTimeout(timer);
      }
    });

    const unsubscribeConn = subscribeToConnectionStatus((status) => {
      setIsConnected(status);
    });

    // Clock tick for live waiting durations
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    
    return () => {
      unsubscribeQueue();
      unsubscribeConn();
      clearInterval(timer);
    };
  }, [playChime]);

  // Manage skeleton loader duration
  useEffect(() => {
    if (queueData.currentToken !== undefined) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [queueData.currentToken]);

  // Toggle Mute Audio
  const toggleSound = useCallback(() => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('qc_waiting_room_mute', nextVal ? 'false' : 'true');
    if (nextVal) {
      setTimeout(() => playChime(), 100);
    }
  }, [soundEnabled, playChime]);

  // Toggle Accessibility High Contrast Mode
  const toggleHighContrast = useCallback(() => {
    const active = document.body.classList.toggle('high-contrast');
    setHighContrast(active);
  }, []);

  // HIPAA Privacy Name Masking
  const maskPatientName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].length > 3 ? `${parts[0].substring(0, 3)}...` : parts[0];
    }
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  };

  // Get waiting patients, sorted by token number ascending
  const getWaitingPatients = () => {
    const patients = queueData.patients || {};
    return Object.entries(patients)
      .map(([key, val]) => ({ id: key, ...val }))
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  };

  const waitingList = getWaitingPatients();
  const avgTime = queueData.avgConsultationTime || 10;

  // Find currently serving patient details
  const getCurrentPatient = () => {
    const patients = queueData.patients || {};
    const currNum = queueData.currentToken || 0;
    if (currNum === 0) return null;
    return Object.values(patients).find(p => p.tokenNumber === currNum && p.status === 'called') || null;
  };

  const currentPatient = getCurrentPatient();

  // Stats calculations
  const allPatientsArray = Object.entries(queueData.patients || {}).map(([key, val]) => ({ id: key, ...val }));
  const completedCount = allPatientsArray.filter(p => p.status === 'completed').length;
  const totalPatientFlowCount = allPatientsArray.filter(
    p => p.status === 'waiting' || p.status === 'called' || p.status === 'completed'
  ).length;

  const animatedCompleted = useCountUp(completedCount);
  const animatedWaiting = useCountUp(waitingList.length);
  const animatedTotal = useCountUp(totalPatientFlowCount);

  // Queue Timeline Log (last 5 called patients)
  const timelinePatients = allPatientsArray
    .filter(p => (p.status === 'called' || p.status === 'completed') && p.calledAt)
    .sort((a, b) => b.calledAt - a.calledAt)
    .slice(0, 5);

  // Helper: Format duration in minutes
  const formatWaitTime = (totalMinutes) => {
    if (totalMinutes === 0) return '0 mins';
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hr${hrs > 1 ? 's' : ''}`;
  };

  const formatTokenString = (tokenVal) => {
    return tokenVal > 0 ? 'T' + String(tokenVal).padStart(3, '0') : 'T---';
  };

  // Helper: Get badge variant for custom label chips
  const getLabelBadgeVariant = (lbl) => {
    switch(lbl) {
      case 'Appointment': return 'info';
      case 'Follow-up': return 'warning';
      case 'Walk-in':
      default:
        return 'success';
    }
  };

  // Interactive Token Lookup logic
  const getLookupResult = () => {
    const cleanToken = lookupToken.trim().toUpperCase();
    if (!cleanToken) return null;
    
    let tokenKey = cleanToken;
    if (/^\d+$/.test(cleanToken)) {
      tokenKey = 'T' + String(cleanToken).padStart(3, '0');
    }
    
    const patients = queueData.patients || {};
    const patient = patients[tokenKey];
    if (!patient) return { found: false, token: tokenKey };
    
    let position = 0;
    let estWait = 0;
    if (patient.status === 'waiting') {
      const waitingList = Object.entries(patients)
        .map(([key, val]) => ({ id: key, ...val }))
        .filter(p => p.status === 'waiting')
        .sort((a, b) => a.tokenNumber - b.tokenNumber);
      
      const idx = waitingList.findIndex(p => p.id === tokenKey);
      position = idx !== -1 ? idx + 1 : 0;
      estWait = position > 0 ? (position - 1) * avgTime : 0;
    }
    
    return {
      found: true,
      token: tokenKey,
      name: patient.name,
      status: patient.status,
      position,
      estWait
    };
  };

  const lookupResult = getLookupResult();

  // Thin capacity loader bar configs
  const queueLoadCount = waitingList.length;
  const loadProgressPercent = Math.min(100, (queueLoadCount / 15) * 100);
  const loadBarColor = queueLoadCount < 5 ? 'bg-[#00A86B]' : queueLoadCount <= 10 ? 'bg-[#F59E0B]' : 'bg-[#DC2626]';

  // Queue Congestion thresholds
  const totalWaitTimeEstimate = waitingList.length * avgTime;
  const getQueueHealth = (time) => {
    if (time < 15) return { label: 'Short Wait', color: 'bg-[#00A86B]', width: '25%' };
    if (time <= 30) return { label: 'Moderate Wait', color: 'bg-[#F59E0B]', width: '60%' };
    return { label: 'Long Wait', color: 'bg-[#DC2626]', width: '100%' };
  };
  const queueHealth = getQueueHealth(totalWaitTimeEstimate);

  // -----------------------------------------------------------------
  // SKELETON LOADING VIEW ( Firebase boot shimmer )
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex-1 bg-[#F0F4F8] text-slate-800 font-sans min-h-screen flex flex-col relative pb-16">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 animate-shimmer" />
            <div className="space-y-1.5">
              <div className="h-4 w-48 bg-slate-200 rounded animate-shimmer" />
              <div className="h-3 w-32 bg-slate-200 rounded animate-shimmer" />
            </div>
          </div>
          <div className="h-6 w-24 bg-slate-200 rounded-full animate-shimmer" />
        </header>

        {/* Body Grid Skeleton */}
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-10 gap-6 flex-1">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-shimmer" />
              <div className="h-16 w-full bg-slate-100 rounded-xl animate-shimmer" />
            </Card>
            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-36 bg-slate-200 rounded animate-shimmer" />
              <div className="h-10 w-full bg-slate-100 rounded-xl animate-shimmer" />
            </Card>
          </div>
          <div className="lg:col-span-4">
            <Card padding="p-5" className="space-y-6 h-full min-h-[500px]">
              <div className="flex justify-between border-b pb-3.5">
                <div className="h-5 w-36 bg-slate-200 rounded animate-shimmer" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="w-10 h-6 bg-slate-200 rounded animate-shimmer" />
                    <div className="h-4 w-28 bg-slate-200 rounded animate-shimmer" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-40 bg-slate-200 rounded animate-shimmer" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F0F4F8] text-slate-800 font-sans min-h-screen flex flex-col relative pb-16 shifting-gradient-bg">
      
      {/* Screen Reader announcer */}
      <div className="sr-only" aria-live="polite" id="waiting-room-announcer">
        {queueData.currentToken > 0 
          ? `Lobby Display Update: Now serving token ${formatTokenString(queueData.currentToken)}. Patient name: ${currentPatient ? currentPatient.name : 'Awaiting Details'}`
          : 'Lobby Standby'}
      </div>

      {/* Style overrides and animations */}
      <style type="text/css">{`
        @keyframes shiftingGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shifting-gradient-bg {
          background: linear-gradient(-45deg, #F0F4F8, #E9EFF6, #E0EEFF, #F5F7FA);
          background-size: 400% 400%;
          animation: shiftingGradient 15s ease infinite;
        }
        @keyframes cardSpringInRight {
          0% { transform: translateX(80px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-spring-in {
          animation: cardSpringInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes greenBgFlash {
          0% { background-color: rgba(16, 185, 129, 0); }
          20% { background-color: rgba(16, 185, 129, 0.15); }
          100% { background-color: rgba(16, 185, 129, 0); }
        }
        .animate-green-flash {
          animation: greenBgFlash 0.8s ease-out forwards;
        }
        @keyframes tokenSlideUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-token-slide-up {
          animation: tokenSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes breatheRing {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.35; }
        }
        .animate-breathe-ring {
          animation: breatheRing 3s infinite ease-in-out;
        }
      `}</style>

      {/* Background Rotated Watermark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <svg className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] text-slate-500 opacity-[0.03] transform rotate-[15deg]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
        </svg>
      </div>

      {/* SECOND BAR (sub-header, white bg) */}
      <div className="shrink-0 z-20 shadow-sm bg-white border-b border-slate-200 relative">
        <header className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left: Brand logo */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0066CC]/10 text-[#0066CC] p-2 rounded-lg">
              <HeartPulse className="w-5 h-5 animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-md font-extrabold text-slate-900 font-heading">Queue Cure</span>
                <Badge variant={isConnected ? 'success' : 'danger'} pulse={isConnected} size="sm">
                  {isConnected ? 'LIVE' : 'DISCONNECTED'}
                </Badge>
              </div>
              <p className="text-[9px] text-[#477CBF] font-bold uppercase tracking-widest mt-0.5">Waiting Room Display</p>
            </div>
          </div>

          {/* Center: Live Status Count Pill */}
          <div className="flex items-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border bg-slate-50 border-slate-200 text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#00A86B] animate-ping" />
              <span>{waitingList.length} patients waiting</span>
            </span>
          </div>

          {/* Right: Clock & Accessibility Toggles */}
          <div className="flex items-center gap-4">
            {/* High Contrast Toggle */}
            <Button
              onClick={toggleHighContrast}
              variant="outline"
              size="sm"
              icon={Eye}
              className="bg-white border-slate-200 text-slate-650 font-bold shadow-sm"
              title="Toggle High Contrast Mode"
              aria-label="Toggle High Contrast Mode"
            />

            {/* Mute/Unmute Speaker Toggle */}
            <Button
              onClick={toggleSound}
              variant="outline"
              size="sm"
              icon={soundEnabled ? Volume2 : VolumeX}
              className="bg-white border-slate-200 text-[#0066CC] hover:text-[#0055b3] font-bold shadow-sm"
              title={soundEnabled ? "Mute Sound Alerts" : "Unmute Sound Alerts"}
              aria-label={soundEnabled ? "Mute Sound Alerts" : "Unmute Sound Alerts"}
            />

            {/* Live Clock HH:MM */}
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-slate-400" />
              <SubHeaderClock />
            </div>
          </div>
        </header>

        {/* Thin load indicator capacity progress bar */}
        <div className="w-full bg-slate-100 h-1.5 relative" title={`Queue Congestion: ${queueLoadCount} waiting`}>
          <div 
            className={`h-full ${loadBarColor} transition-all duration-500 shadow-inner`} 
            style={{ width: `${loadProgressPercent}%` }} 
          />
        </div>
      </div>

      {/* MAIN CONTENT — 3 column grid */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 min-h-0 relative z-10">
        
        {/* ==================== LEFT COLUMN (30%) ==================== */}
        <div className="flex flex-col gap-6">
          
          {/* Card 1 — "Now Serving" */}
          <Card hoverable={false} className={`bg-white transition-all duration-300 ${cardFlash ? 'animate-green-flash' : ''}`}>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Activity className="w-4.5 h-4.5 text-[#00A86B] animate-pulse-slow" />
              Now Serving
            </h3>

            <div className="flex flex-col items-center justify-center p-6 text-center">
              {/* Token Display with Slide-up Animation */}
              <div className="relative w-48 h-20 flex items-center justify-center overflow-hidden mb-4">
                {/* Subtle CSS breathing ring behind the token */}
                <div className="absolute inset-0 rounded-full border-2 border-[#00A86B]/20 animate-breathe-ring" />
                <div className="absolute inset-3 rounded-full border border-[#00A86B]/10 animate-breathe-ring" style={{ animationDelay: '1.5s' }} />

                <div className="relative inline-flex items-center justify-center border font-mono tracking-wide bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/30 text-3xl px-6 py-3 rounded-2xl font-black border-2 shadow-lg shadow-[#00A86B]/15 relative overflow-hidden w-40 h-16 z-10">
                  {tokenAnimation.trigger ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-around h-[200%] w-full animate-token-slide-up">
                      <div className="h-1/2 flex items-center justify-center">{formatTokenString(tokenAnimation.prev)}</div>
                      <div className="h-1/2 flex items-center justify-center">{formatTokenString(tokenAnimation.current)}</div>
                    </div>
                  ) : (
                    <span>{formatTokenString(queueData.currentToken)}</span>
                  )}
                </div>
              </div>

              {/* Patient Details */}
              {queueData.currentToken > 0 ? (
                <div className="space-y-3 w-full">
                  <h3 className="text-2xl font-black text-slate-800 tracking-wide uppercase leading-normal">
                    {currentPatient ? maskPatientName(currentPatient.name) : 'Registering...'}
                  </h3>
                  
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/25 uppercase tracking-wider">
                      🟢 Active Consultation
                    </span>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Consultation started at {currentPatient && currentPatient.calledAt ? formatConsultationTime(currentPatient.calledAt) : 'N/A'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-400 uppercase tracking-wide">
                    Clinic Standby
                  </h3>
                  <p className="text-xs text-slate-500 font-light">
                    Doctor rooms open soon • Awaiting patient calls
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Card 2 — "Your Token" Lookup */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Ticket className="w-4.5 h-4.5 text-[#0066CC]" />
              Your Token Lookup
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">Search your token to view your wait status.</p>

            <div className="space-y-4">
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder=" "
                  value={lookupToken}
                  onChange={(e) => setLookupToken(e.target.value)}
                  className="peer w-full bg-slate-50 border border-slate-250 focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] focus:ring-opacity-50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder-transparent focus:shadow-[0_0_8px_rgba(0,102,204,0.20)]"
                  aria-label="Enter token number to lookup"
                />
                <Ticket className="absolute left-3.5 top-[15px] text-slate-400 w-4 h-4 peer-focus:text-[#0066CC] transition-colors" />
                <label 
                  className="absolute left-10 top-3 text-sm text-slate-400 font-medium transition-all pointer-events-none
                             peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400
                             peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-[10px] peer-focus:text-[#0066CC] peer-focus:bg-white peer-focus:px-1.5 peer-focus:font-bold
                             peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-[#0066CC] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:font-bold"
                >
                  Token Number (e.g. T001)
                </label>
              </div>

              {/* Lookup Result Box */}
              <div className="min-h-[85px] flex flex-col justify-center">
                {!lookupToken.trim() ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Scan QR at reception to get your token
                  </p>
                ) : lookupResult && !lookupResult.found ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-center text-rose-600 text-xs font-semibold">
                    Token {lookupResult.token} not found in queue system.
                  </div>
                ) : lookupResult && lookupResult.found ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between animate-spring-in">
                    <div className="min-w-0 pr-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {lookupResult.status === 'waiting' 
                          ? `Queue Position: #${lookupResult.position}` 
                          : `Status: ${lookupResult.status.toUpperCase()}`}
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{lookupResult.name}</p>
                      
                      {lookupResult.status === 'waiting' && (
                        <Badge variant="info" size="sm" className="mt-1">
                          ~{lookupResult.estWait} mins wait
                        </Badge>
                      )}
                      {lookupResult.status === 'called' && (
                        <Badge variant="success" pulse={true} size="sm" className="mt-1 animate-pulse">
                          Proceed to Doctor Room
                        </Badge>
                      )}
                      {lookupResult.status === 'completed' && (
                        <Badge variant="neutral" size="sm" className="mt-1">
                          Visit Completed
                        </Badge>
                      )}
                      {lookupResult.status === 'cancelled' && (
                        <Badge variant="danger" size="sm" className="mt-1">
                          Ticket Cancelled
                        </Badge>
                      )}
                    </div>
                    <TokenBadge token={lookupResult.token} variant={lookupResult.status === 'called' ? 'current' : 'waiting'} size="sm" className="shrink-0" />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

        </div>

        {/* ==================== CENTER COLUMN (40%) ==================== */}
        <div className="flex flex-col gap-6">
          
          <Card hoverable={false} className="bg-white flex flex-col min-h-[550px] h-full">
            {/* Header Area */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-slate-800">Waiting Queue</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-[#0066CC]/10 text-[#0066CC]">
                  {animatedWaiting}
                </span>
              </div>
            </div>

            {/* List of Waiting Patients */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px] custom-scrollbar">
              {waitingList.length === 0 ? (
                /* Empty chairs SVG */
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4 mt-16 animate-spring-in">
                  <svg className="w-24 h-24 text-slate-300 mx-auto" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 18h10v12H14zM12 30h14M16 30v10M22 30v10" />
                    <path d="M38 18h10v12H38zM36 30h14M40 30v10M46 30v10" />
                    <path d="M8 30h48" strokeWidth="3" />
                  </svg>
                  <div>
                    <p className="font-extrabold text-slate-700 text-sm">No patients in queue. A quiet day!</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      All registered patients have been triage dispatched. New entries will populate here in real-time.
                    </p>
                  </div>
                </div>
              ) : (
                waitingList.map((patient, index) => (
                  <LobbyPatientCard
                    key={patient.id}
                    patient={patient}
                    index={index}
                    now={now}
                    avgTime={avgTime}
                    getLabelBadgeVariant={getLabelBadgeVariant}
                    formatWaitTime={formatWaitTime}
                  />
                ))
              )}
            </div>
          </Card>

        </div>

        {/* ==================== RIGHT COLUMN (Spans 2 cols on md; stacks vertically on xl) ==================== */}
        <div className="md:col-span-2 xl:col-span-1 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-6">
          
          {/* Card 1 — Queue Statistics */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Activity className="w-4.5 h-4.5 text-[#0066CC]" />
              Queue Statistics
            </h3>

            <div className="space-y-4">
              {/* Stat 1: Currently Waiting */}
              <div className="flex justify-between items-baseline p-3 rounded-xl border border-slate-105 bg-slate-50/50">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Currently Waiting</p>
                  <p className="text-2xl font-black text-slate-800 font-mono mt-0.5">{animatedWaiting}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">In waiting lobby</span>
              </div>

              {/* Stat 2: Avg wait time */}
              <div className="flex justify-between items-baseline p-3 rounded-xl border border-slate-105 bg-slate-50/50">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estimated Wait Pacing</p>
                  <p className="text-2xl font-black text-[#0066CC] font-mono mt-0.5">{avgTime}m</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">Per patient avg</span>
              </div>

              {/* Stat 3: Patients Seen Today */}
              <div className="flex justify-between items-baseline p-3 rounded-xl border border-slate-105 bg-slate-50/50">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patients Seen Today</p>
                  <p className="text-2xl font-black text-[#00A86B] font-mono mt-0.5">{animatedCompleted} of {animatedTotal}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">Discharged count</span>
              </div>

              {/* Queue Status Progress Bar */}
              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Lobby Congestion</span>
                  <span className="font-bold text-slate-700">{queueHealth.label}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${queueHealth.color} transition-all duration-500`} style={{ width: queueHealth.width }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2 — Token Timeline */}
          <Card hoverable={false} className="bg-white flex-1 min-h-[220px]">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
              Token Timeline
            </h3>

            <div className="relative border-l-2 border-slate-100 ml-3.5 pl-5 space-y-4">
              {timelinePatients.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tickets called yet today</p>
              ) : (
                timelinePatients.map((p, idx) => (
                  <div key={p.id} className="relative">
                    {/* Timeline Node indicator */}
                    <span className={`absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 ${
                      p.status === 'called' ? 'border-[#0066CC]' : 'border-slate-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        p.status === 'called' ? 'bg-[#0066CC] animate-pulse' : 'bg-slate-350'
                      }`} />
                    </span>

                    <div className="flex justify-between items-center gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-650 bg-slate-100 px-1.5 py-0.25 rounded text-[9px]">
                            {p.id}
                          </span>
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[120px] block">{p.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                          Called at {new Date(p.calledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                        {p.status === 'called' ? 'Called' : 'Consulted'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Card 3 — Find Your Place (QR/Check-in Card) */}
          <Card hoverable={false} className="bg-white text-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Self Check-in Portal</h3>
            
            <div className="flex justify-center p-2.5 bg-white border border-slate-150 rounded-2xl w-fit mx-auto shadow-sm">
              <QRCodeSVG 
                value={window.location.origin + '/checkin'} 
                size={90} 
                bgColor="#ffffff" 
                fgColor="#0F172A" 
                level="L" 
              />
            </div>

            <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-3">City Care Hospital</p>
            <p className="text-[11px] text-slate-550 max-w-xs mx-auto mt-1 leading-normal">
              Scan this code to get your token number and track your queue position directly from your mobile device.
            </p>
          </Card>

        </div>

      </div>

    </div>
  );
}

// Format consultation started at HH:MM
const formatConsultationTime = (timestamp) => {
  if (!timestamp) return 'Awaiting Details';
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default WaitingRoomView;
