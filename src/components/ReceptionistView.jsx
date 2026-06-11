import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  initializeQueue, 
  addPatient, 
  callNextToken, 
  setAvgTime, 
  subscribeToQueue, 
  completePatient, 
  cancelPatient, 
  resetQueueData,
  subscribeToConnectionStatus
} from '../firebase';
import { 
  UserPlus, 
  Play, 
  X, 
  RotateCcw, 
  Clock, 
  Users, 
  Activity, 
  CheckCircle, 
  Sliders, 
  UserCheck,
  AlertCircle,
  Download,
  Copy,
  User,
  Check,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Button, 
  Card, 
  Badge, 
  TokenBadge, 
  useToast 
} from './ui';

// Header Clock component that ticks independently
const HeaderClock = React.memo(() => {
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
const PatientCard = React.memo(({ patient, index, now, currentAvgTime, isExiting, isJustAdded, onCancel, getLabelBadgeVariant, formatWaitTime }) => {
  const estimatedWaitVal = index * (currentAvgTime || 10);
  const waitDurationMins = Math.max(0, Math.floor((now - patient.addedAt) / 60000));

  return (
    <div 
      style={{ animationDelay: `${index * 50}ms` }}
      className={`p-4 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden transition-all ${
        isExiting ? 'patient-card-exit' : 'animate-spring-in'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-3">
        <TokenBadge 
          token={patient.id} 
          variant={index === 0 ? 'called' : 'waiting'} 
          size="sm" 
          className={`shrink-0 ${isJustAdded ? 'animate-bounce-in' : ''}`} 
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
        <Button
          onClick={() => onCancel(patient.id)}
          variant="ghost"
          size="sm"
          className="p-2 text-slate-450 hover:text-rose-600 rounded-lg"
          title="Remove Patient"
          aria-label={`Cancel token ${patient.id} for ${patient.name}`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

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

function ReceptionistView() {
  const [queueData, setQueueData] = useState({
    currentToken: 0,
    avgConsultationTime: 10,
    lastTokenIssued: 0,
    patients: {}
  });

  const [isConnected, setIsConnected] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [patientLabel, setPatientLabel] = useState('Walk-in');
  const [loading, setLoading] = useState(true);
  
  // Call Next Patient States
  const [pulseButton, setPulseButton] = useState(false);

  // Consultation Time States
  const pacingOptions = [5, 10, 15, 20, 30];
  const [selectedPacing, setSelectedPacing] = useState(10); // 5, 10, 15, 20, 30, custom
  const [customTime, setCustomTime] = useState(10);
  const [isSaved, setIsSaved] = useState(false);

  // Reset Queue State
  const [resetState, setResetState] = useState('idle'); // idle, confirm
  const resetTimeoutRef = useRef(null);

  // Sharing States
  const [copied, setCopied] = useState(false);

  // Live clock tick for waiting duration calculation (every 15 seconds)
  const [now, setNow] = useState(Date.now());

  // Accessibility States
  const [highContrast, setHighContrast] = useState(document.body.classList.contains('high-contrast'));

  // Animation helpers: exiting card IDs, newly added badge IDs
  const [exitingPatients, setExitingPatients] = useState([]);
  const [justAddedTokenId, setJustAddedTokenId] = useState(null);

  // Stat flash highlights helper states
  const [seenFlash, setSeenFlash] = useState(false);
  const [waitFlash, setWaitFlash] = useState(false);
  const [waitingFlash, setWaitingFlash] = useState(false);

  const toast = useToast();
  const inputRef = useRef(null);

  // Set page title on mount
  useEffect(() => {
    document.title = "Receptionist — Queue Cure";
  }, []);

  // Subscribe to Realtime Updates
  useEffect(() => {
    initializeQueue();
    
    const unsubscribeQueue = subscribeToQueue((data) => {
      setQueueData(data);
      if (data.avgConsultationTime) {
        if (pacingOptions.includes(data.avgConsultationTime)) {
          setSelectedPacing(data.avgConsultationTime);
        } else {
          setSelectedPacing('custom');
          setCustomTime(data.avgConsultationTime);
        }
      }
    });

    const unsubscribeConn = subscribeToConnectionStatus((status) => {
      setIsConnected(status);
    });

    // Clock tick every 15 seconds for live wait times
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => {
      unsubscribeQueue();
      unsubscribeConn();
      clearInterval(timer);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  // Manage skeleton loader duration
  useEffect(() => {
    if (queueData.currentToken !== undefined) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 700); // 700ms shimmer loader
      return () => clearTimeout(timer);
    }
  }, [queueData.currentToken]);

  // Form Auto-focus on mount
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  // Fetch waiting patients, sorted by token number ascending
  const getWaitingPatients = () => {
    const patients = queueData.patients || {};
    return Object.entries(patients)
      .map(([key, val]) => ({ id: key, ...val }))
      .filter((p) => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  };

  const waitingList = getWaitingPatients();
  const nextPatientInLine = waitingList.length > 0 ? waitingList[0] : null;

  // Active Pacing Calculation
  const currentAvgTime = selectedPacing === 'custom' ? Number(customTime) : Number(selectedPacing);

  // Stats Calculations
  const allPatientsArray = Object.entries(queueData.patients || {}).map(([key, val]) => ({ id: key, ...val }));
  const patientsSeenCount = allPatientsArray.filter(p => p.status === 'completed').length;
  
  // Calculate Avg Actual Wait Time of completed/called patients from timestamps
  const calledOrCompletedPatients = allPatientsArray.filter(
    p => (p.status === 'called' || p.status === 'completed') && p.calledAt && p.addedAt
  );
  const avgActualWaitMinutes = calledOrCompletedPatients.length > 0
    ? Math.round(
        calledOrCompletedPatients.reduce((sum, p) => sum + (p.calledAt - p.addedAt), 0) / 
        calledOrCompletedPatients.length / 60000
      )
    : 0;

  // Count up hook bindings
  const animatedSeen = useCountUp(patientsSeenCount);
  const animatedWait = useCountUp(avgActualWaitMinutes);
  const animatedWaiting = useCountUp(waitingList.length);

  // Track state changes to trigger yellow flash highlight micro-interactions
  const prevSeenRef = useRef(patientsSeenCount);
  const prevWaitRef = useRef(avgActualWaitMinutes);
  const prevWaitingRef = useRef(waitingList.length);

  useEffect(() => {
    if (patientsSeenCount !== prevSeenRef.current) {
      setSeenFlash(true);
      const t = setTimeout(() => setSeenFlash(false), 800);
      prevSeenRef.current = patientsSeenCount;
      return () => clearTimeout(t);
    }
  }, [patientsSeenCount]);

  useEffect(() => {
    if (avgActualWaitMinutes !== prevWaitRef.current) {
      setWaitFlash(true);
      const t = setTimeout(() => setWaitFlash(false), 800);
      prevWaitRef.current = avgActualWaitMinutes;
      return () => clearTimeout(t);
    }
  }, [avgActualWaitMinutes]);

  useEffect(() => {
    if (waitingList.length !== prevWaitingRef.current) {
      setWaitingFlash(true);
      const t = setTimeout(() => setWaitingFlash(false), 800);
      prevWaitingRef.current = waitingList.length;
      return () => clearTimeout(t);
    }
  }, [waitingList.length]);

  // Debounced Consultation Time Setter
  const debounceTimeoutRef = useRef(null);
  const savePacingDebounced = useCallback((mins) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setIsSaved(false);
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const validatedMins = Math.max(1, Math.min(120, Number(mins) || 10));
        await setAvgTime(validatedMins);
        setIsSaved(true);
        toast.success(`Pacing auto-saved: ${validatedMins} mins`);
        setTimeout(() => setIsSaved(false), 1500);
      } catch (err) {
        console.error(err);
        toast.error("Failed to auto-save pacing.");
      }
    }, 500);
  }, [toast]);

  // Sync Pacing Segment Selection Changes
  const handlePacingSegmentChange = useCallback((val) => {
    setSelectedPacing(val);
    if (val !== 'custom') {
      savePacingDebounced(val);
    }
  }, [savePacingDebounced]);

  // Custom Time Input Change Handler
  const handleCustomTimeChange = useCallback((e) => {
    const val = e.target.value;
    setCustomTime(val);
    savePacingDebounced(val);
  }, [savePacingDebounced]);

  // Register New Patient
  const handleAddPatientSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Please enter a patient name.");
      return;
    }
    
    try {
      const name = patientName.trim();
      const tokenKey = await addPatient(name, patientLabel);
      setPatientName('');
      setPatientLabel('Walk-in'); // Reset label chip selection
      setJustAddedTokenId(tokenKey); // Trigger bounce animation
      toast.success(`Token ${tokenKey} issued to ${name}`);
      
      setTimeout(() => setJustAddedTokenId(null), 3000);

      // Return focus to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to issue token.");
    }
  }, [patientName, patientLabel, toast]);

  // Call Patient Action confirmed
  const confirmCallNext = useCallback(async () => {
    try {
      const called = await callNextToken();
      if (called) {
        toast.info(`Now Serving: ${called.id} (${called.name})`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch call.");
    }
  }, [toast]);

  // Trigger dispatching for the next patient
  const handleCallNextClick = useCallback(() => {
    const list = getWaitingPatients();
    if (list.length === 0) return;

    // Pulse animation before actual call next updates
    setPulseButton(true);
    setTimeout(() => {
      setPulseButton(false);
      confirmCallNext();
    }, 200);
  }, [queueData.patients, confirmCallNext]);

  // Complete consultation visit
  const handleComplete = useCallback(async (tokenKey) => {
    try {
      await completePatient(tokenKey);
      toast.success(`Token ${tokenKey} consultation completed`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete consultation");
    }
  }, [toast]);

  // Cancel Patient ticket (with state exit delay for smooth sliding collapse)
  const handleCancel = useCallback(async (tokenKey) => {
    setExitingPatients(prev => [...prev, tokenKey]);
    setTimeout(async () => {
      try {
        await cancelPatient(tokenKey);
        setExitingPatients(prev => prev.filter(id => id !== tokenKey));
      } catch (err) {
        console.error(err);
        toast.error("Failed to cancel ticket");
      }
    }, 300); // wait for 300ms exit collapse transition
  }, [toast]);

  // Reset all queue numbers (Double Confirmation Inline)
  const handleResetClick = useCallback(() => {
    if (resetState === 'confirm') {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      setResetState('idle');
      resetQueueData();
      toast.success("Queue has been successfully reset.");
    } else {
      setResetState('confirm');
      resetTimeoutRef.current = setTimeout(() => {
        setResetState('idle');
      }, 3000); // Revert to idle after 3 seconds
    }
  }, [resetState, toast]);

  // Toggle Accessibility High Contrast Mode
  const toggleHighContrast = useCallback(() => {
    const active = document.body.classList.toggle('high-contrast');
    setHighContrast(active);
  }, []);

  // Copy Waiting Room Link
  const handleCopyLink = useCallback(() => {
    const shareUrl = window.location.origin + '/waiting-room';
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        toast.success("Waiting Room link copied!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to copy link.");
      });
  }, [toast]);

  // Queue Health Calculation
  const totalWaitTimeEstimate = waitingList.length * (currentAvgTime || 10);
  const getQueueHealth = (time) => {
    if (time < 15) return { label: 'Short Wait', color: 'bg-[#00A86B]', width: '25%' };
    if (time <= 30) return { label: 'Moderate Wait', color: 'bg-[#F59E0B]', width: '60%' };
    return { label: 'Long Wait', color: 'bg-[#DC2626]', width: '100%' };
  };
  const queueHealth = getQueueHealth(totalWaitTimeEstimate);

  // Queue Triage Load calculations for thin load bar
  const queueLoadCount = waitingList.length;
  const loadProgressPercent = Math.min(100, (queueLoadCount / 15) * 100);
  const getLoadBarColor = (count) => {
    if (count < 5) return 'bg-[#00A86B]'; // green
    if (count <= 10) return 'bg-[#F59E0B]'; // yellow
    return 'bg-[#DC2626]'; // red
  };
  const loadBarColor = getLoadBarColor(queueLoadCount);

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
          {/* Left Column Skeleton */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-shimmer" />
              <div className="h-10 w-full bg-slate-100 rounded-xl animate-shimmer" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-100 rounded-full animate-shimmer" />
                <div className="h-6 w-20 bg-slate-100 rounded-full animate-shimmer" />
                <div className="h-6 w-20 bg-slate-100 rounded-full animate-shimmer" />
              </div>
              <div className="h-10 w-full bg-slate-200 rounded-xl animate-shimmer" />
            </Card>

            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-36 bg-slate-200 rounded animate-shimmer" />
              <div className="h-20 w-full bg-slate-100 rounded-xl animate-shimmer" />
              <div className="h-10 w-full bg-slate-200 rounded-xl animate-shimmer" />
            </Card>

            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-shimmer" />
              <div className="h-8 w-full bg-slate-100 rounded-xl animate-shimmer" />
              <div className="h-10 w-full bg-slate-200 rounded-xl animate-shimmer" />
            </Card>
          </div>

          {/* Center Column Skeleton */}
          <div className="lg:col-span-4">
            <Card padding="p-5" className="space-y-6 h-full min-h-[500px]">
              <div className="flex justify-between border-b pb-3.5">
                <div className="h-5 w-36 bg-slate-200 rounded animate-shimmer" />
                <div className="h-5 w-20 bg-slate-200 rounded animate-shimmer" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-slate-200 rounded animate-shimmer" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-28 bg-slate-200 rounded animate-shimmer" />
                        <div className="h-3 w-36 bg-slate-100 rounded animate-shimmer" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-slate-250 rounded-full animate-shimmer" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column Skeleton */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-40 bg-slate-200 rounded animate-shimmer" />
              <div className="space-y-3">
                <div className="h-12 w-full bg-slate-100 rounded-xl animate-shimmer" />
                <div className="h-12 w-full bg-slate-100 rounded-xl animate-shimmer" />
                <div className="h-12 w-full bg-slate-100 rounded-xl animate-shimmer" />
              </div>
            </Card>

            <Card padding="p-5" className="space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-shimmer" />
              <div className="space-y-3">
                <div className="h-8 w-full bg-slate-100 rounded-bg animate-shimmer" />
                <div className="h-8 w-full bg-slate-100 rounded animate-shimmer" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // MAIN VIEW
  // -----------------------------------------------------------------
  return (
    <div className="flex-1 bg-[#F0F4F8] text-slate-800 font-sans min-h-screen flex flex-col relative pb-16 shifting-gradient-bg">
      
      {/* Screen Reader Announcements polite alert */}
      <div className="sr-only" aria-live="polite" id="receptionist-announcer">
        {`Waiting list updated. There are now ${waitingList.length} patients waiting in the queue.`}
      </div>

      {/* CSS Keyframe Animations Injection */}
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
        @keyframes cardExitLeft {
          0% { transform: translateX(0); opacity: 1; max-height: 100px; margin-bottom: 12px; padding: 16px; border-width: 1px; }
          50% { transform: translateX(-100px); opacity: 0; max-height: 100px; margin-bottom: 12px; padding: 16px; border-width: 1px; }
          100% { transform: translateX(-100px); opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; border-width: 0; overflow: hidden; }
        }
        .patient-card-exit {
          animation: cardExitLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes buttonPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pulse-button {
          animation: buttonPulse 0.2s ease-in-out;
        }
        @keyframes yellowHighlight {
          0% { background-color: rgba(254, 240, 138, 0.65); }
          100% { background-color: transparent; }
        }
        .animate-stat-flash {
          animation: yellowHighlight 0.8s ease-out forwards;
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* 1. Header Navigation Bar (Rebuilt with live status & Reset Day) */}
      <div className="shrink-0 z-20 shadow-sm bg-white border-b border-slate-200">
        <header className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left: Brand logo */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0066CC]/10 text-[#0066CC] p-2 rounded-lg">
              <Activity className="w-5 h-5 animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-md font-extrabold text-slate-900 font-heading">Queue Cure</span>
                <Badge variant={isConnected ? 'success' : 'danger'} pulse={isConnected} size="sm">
                  {isConnected ? 'LIVE' : 'DISCONNECTED'}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Receptionist Panel</p>
            </div>
          </div>

          {/* Center: Live Status Pill */}
          <div className="flex items-center">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm ${
              waitingFlash ? 'animate-stat-flash border-amber-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="h-2 w-2 rounded-full bg-[#00A86B] animate-ping" />
              <span>{waitingList.length} patients waiting</span>
            </span>
          </div>

          {/* Right: Time & Reset Day Action */}
          <div className="flex items-center gap-4">
            {/* Accessibility High Contrast toggle */}
            <Button
              onClick={toggleHighContrast}
              variant="outline"
              size="sm"
              icon={Eye}
              className="bg-white border-slate-200 text-slate-600 font-bold shadow-sm"
              title="Toggle High Contrast Mode"
              aria-label="Toggle High Contrast Mode"
            />

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <HeaderClock />
            </div>

            <Button
              onClick={handleResetClick}
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              className={`font-bold py-2 px-3 border transition-all ${
                resetState === 'confirm'
                  ? 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 hover:border-rose-200'
              }`}
              title="Reset Day: clears all waiting tickets and stats"
              aria-label={resetState === 'confirm' ? "Confirm Reset Day" : "Reset Queue and Day Stats"}
            >
              {resetState === 'confirm' ? 'Confirm Reset?' : 'Reset Day'}
            </Button>
          </div>
        </header>

        {/* Thin Queue Load Capacity Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 relative" title={`Queue capacity: ${queueLoadCount} waiting`}>
          <div 
            className={`h-full ${loadBarColor} transition-all duration-500 shadow-inner`} 
            style={{ width: `${loadProgressPercent}%` }} 
          />
        </div>
      </div>

      {/* Subtle Background Watermark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <svg className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] text-slate-500 opacity-[0.03] transform rotate-[15deg]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
        </svg>
      </div>

      {/* 2. Three-column Grid Layout (Responsive: 1-col < 768px, 2-col 768px-1280px, 3-col > 1280px) */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 min-h-0 relative z-10">
        
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="flex flex-col gap-6">
          
          {/* Card 1: Add Patient Form (with floating label input) */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-[#0066CC]" />
              Patient Registration
            </h3>

            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <div className="relative mt-2">
                  <input
                    ref={inputRef}
                    type="text"
                    id="patientName"
                    placeholder=" " // Required for peer-placeholder-shown
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="peer w-full bg-slate-50 border border-slate-250 focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] focus:ring-opacity-50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder-transparent focus:shadow-[0_0_8px_rgba(0,102,204,0.20)]"
                    aria-label="Patient full name"
                    required
                  />
                  <User className="absolute left-3.5 top-[15px] text-slate-400 w-4 h-4 peer-focus:text-[#0066CC] transition-colors" />
                  <label 
                    htmlFor="patientName"
                    className="absolute left-10 top-3 text-sm text-slate-400 font-medium transition-all pointer-events-none
                               peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400
                               peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-[10px] peer-focus:text-[#0066CC] peer-focus:bg-white peer-focus:px-1.5 peer-focus:font-bold
                               peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-[#0066CC] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:font-bold"
                  >
                    Patient Name
                  </label>
                </div>
              </div>

              {/* Quick Add Chips */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Triage Label
                </span>
                <div className="flex flex-wrap gap-1.5 animate-spring-in">
                  {['Walk-in', 'Appointment', 'Follow-up'].map((label) => {
                    const isActive = patientLabel === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPatientLabel(label)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          isActive 
                            ? 'bg-[#0066CC] text-white border-transparent shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        aria-label={`Select triage label: ${label}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2 py-2.5 font-bold"
                icon={UserPlus}
                aria-label="Register patient and issue token"
              >
                Issue Token
              </Button>
            </form>
          </Card>

          {/* Card 2: Call Next Patient (with button pulse) */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Play className="w-4.5 h-4.5 text-[#00A86B]" />
              Call Next Patient
            </h3>
            <p className="text-[11px] text-slate-550 mb-4">Call the next waiting token in line for triage.</p>

            {/* Preview Box */}
            <div className="mb-4">
              {nextPatientInLine ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Next In Queue</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{nextPatientInLine.name}</p>
                    <Badge variant={getLabelBadgeVariant(nextPatientInLine.label)} size="sm" className="mt-1">
                      {nextPatientInLine.label || 'Walk-in'}
                    </Badge>
                  </div>
                  <TokenBadge token={nextPatientInLine.id} variant="waiting" size="sm" className="shrink-0" />
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs italic">
                  No patients waiting in queue
                </div>
              )}
            </div>

            {/* Call Next Button (with pulse animation class) */}
            <Button
              onClick={handleCallNextClick}
              disabled={waitingList.length === 0}
              variant="success"
              className={`w-full text-white py-2.5 font-bold ${
                pulseButton ? 'animate-pulse-button' : ''
              }`}
              icon={Play}
              title={waitingList.length === 0 ? "Queue is empty" : "Call next patient"}
              aria-label="Call Next Patient"
            >
              Call Next →
            </Button>
          </Card>

          {/* Card 3: Consultation Time Pacing */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-slate-600" />
              Consultation Time
            </h3>
            <p className="text-[11px] text-slate-550 mb-4">Avg. time per patient</p>

            <div className="space-y-4">
              {/* Segmented Button Controls */}
              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 animate-spring-in">
                {pacingOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handlePacingSegmentChange(opt)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedPacing === opt 
                        ? 'bg-white text-[#0066CC] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    aria-label={`Set consultation pacing to ${opt} minutes`}
                  >
                    {opt}m
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePacingSegmentChange('custom')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedPacing === 'custom' 
                      ? 'bg-white text-[#0066CC] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  aria-label="Set custom consultation pacing"
                >
                  Custom
                </button>
              </div>

              {/* Custom Time Selector */}
              {selectedPacing === 'custom' && (
                <div className="flex items-center gap-3 animate-spring-in">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={customTime}
                    onChange={handleCustomTimeChange}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-855 font-mono font-bold outline-none focus:border-[#0066CC]"
                    placeholder="Mins"
                    aria-label="Enter custom consultation time in minutes"
                  />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider shrink-0">minutes</span>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full bg-slate-50/50 text-slate-550 py-2 border-slate-200 cursor-default hover:bg-slate-50/50 hover:translate-y-0"
                icon={isSaved ? Check : CheckCircle}
                disabled={true}
                aria-label="Pacing auto-saves automatically"
              >
                {isSaved ? 'Auto-Saved' : 'Auto-Saving on change...'}
              </Button>
            </div>
          </Card>

        </div>

        {/* ==================== CENTER COLUMN ==================== */}
        <div className="flex flex-col gap-6">
          
          <Card hoverable={false} className="bg-white flex flex-col min-h-[550px] h-full">
            
            {/* Header Area */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-slate-800">Waiting Queue</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono transition-colors ${
                  waitingFlash ? 'animate-stat-flash text-[#0066CC]' : 'bg-[#0066CC]/10 text-[#0066CC]'
                }`}>
                  {animatedWaiting}
                </span>
              </div>
            </div>

            {/* Live Queue list with custom scrollbar */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px] custom-scrollbar">
              {waitingList.length === 0 ? (
                /* Empty state chairs SVG */
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4 mt-16 animate-spring-in">
                  <svg className="w-24 h-24 text-slate-300 mx-auto" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    {/* Chair 1 */}
                    <path d="M14 18h10v12H14zM12 30h14M16 30v10M22 30v10" />
                    {/* Chair 2 */}
                    <path d="M38 18h10v12H38zM36 30h14M40 30v10M46 30v10" />
                    {/* Beam supporting chairs */}
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
                /* Patient Cards (with spring enter and stateful exit collapse) */
                waitingList.map((patient, index) => {
                  const isExiting = exitingPatients.includes(patient.id);
                  const isJustAdded = patient.id === justAddedTokenId;
                  
                  return (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      index={index}
                      now={now}
                      currentAvgTime={currentAvgTime}
                      isExiting={isExiting}
                      isJustAdded={isJustAdded}
                      onCancel={handleCancel}
                      getLabelBadgeVariant={getLabelBadgeVariant}
                      formatWaitTime={formatWaitTime}
                    />
                  );
                })
              )}
            </div>

          </Card>

        </div>

        {/* ==================== RIGHT COLUMN (Spans 2 cols on md, grid of 3 cards horizontally; stacks vertically on xl) ==================== */}
        <div className="md:col-span-2 xl:col-span-1 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-6">
          
          {/* Card 1: Today's Stats Card (with yellow stats flashes) */}
          <Card hoverable={false} className="bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Activity className="w-4.5 h-4.5 text-[#0066CC]" />
              Today's Queue Analytics
            </h3>

            <div className="space-y-4">
              {/* Row 1: Patients Seen */}
              <div className={`flex justify-between items-baseline p-3 rounded-xl border border-slate-100 transition-colors duration-300 ${
                seenFlash ? 'animate-stat-flash' : 'bg-slate-50/50'
              }`}>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patients Discharged</p>
                  <p className="text-2xl font-black text-slate-800 font-mono mt-0.5">{animatedSeen}</p>
                </div>
                <span className="inline-flex items-center text-[10px] font-black text-[#00A86B] bg-[#00A86B]/10 px-2 py-0.5 rounded-full gap-0.5 shadow-sm">
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                  +12%
                </span>
              </div>

              {/* Row 2: Average Actual Wait */}
              <div className={`flex justify-between items-baseline p-3 rounded-xl border border-slate-100 transition-colors duration-300 ${
                waitFlash ? 'animate-stat-flash' : 'bg-slate-50/50'
              }`}>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Actual Wait Time</p>
                  <p className="text-2xl font-black text-[#0066CC] font-mono mt-0.5">
                    {animatedWait > 0 ? `${animatedWait}m` : 'N/A'}
                  </p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">Calculated live</span>
              </div>

              {/* Row 3: Health Progress Bar */}
              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Queue Congestion</span>
                  <span className="font-bold text-slate-700">{queueHealth.label}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${queueHealth.color} transition-all duration-500`} style={{ width: queueHealth.width }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Event Timeline */}
          <Card hoverable={false} className="bg-white flex-1 min-h-[220px]">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
              Queue Timeline
            </h3>

            <div className="relative border-l-2 border-slate-100 ml-3.5 pl-5 space-y-4">
              {timelinePatients.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No patients called yet today</p>
              ) : (
                timelinePatients.map((p, idx) => (
                  <div key={p.id} className="relative">
                    {/* Circle Node indicator */}
                    <span className={`absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 ${
                      p.status === 'called' ? 'border-[#0066CC]' : 'border-slate-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        p.status === 'called' ? 'bg-[#0066CC] animate-pulse' : 'bg-slate-350'
                      }`} />
                    </span>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-650 bg-slate-100 px-1.5 py-0.25 rounded text-[9px]">
                            {p.id}
                          </span>
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[120px] block">{p.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                          {new Date(p.calledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      {/* Complete/Cancel inline handlers for the actively called patient */}
                      {p.status === 'called' ? (
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleComplete(p.id)}
                            variant="success"
                            size="sm"
                            className="text-[9px] py-1 px-2.5 rounded-md font-extrabold text-white shrink-0"
                            aria-label={`Mark consultation completed for token ${p.id}`}
                          >
                            Complete
                          </Button>
                          <Button
                            onClick={() => handleCancel(p.id)}
                            variant="outline"
                            size="sm"
                            className="text-[9px] py-1 px-2.5 rounded-md bg-white border border-slate-200 text-rose-600 hover:text-rose-700 hover:border-rose-350 shrink-0"
                            aria-label={`Cancel called token ${p.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold self-start sm:self-center">Consulted</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Card 3: Share QR Cast Portal */}
          <Card hoverable={false} className="bg-white text-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Share Waiting Board</h3>
            
            <div className="flex justify-center p-2.5 bg-white border border-slate-150 rounded-2xl w-fit mx-auto shadow-sm">
              <QRCodeSVG 
                value={window.location.origin + '/checkin'} 
                size={90} 
                bgColor="#ffffff" 
                fgColor="#0F172A" 
                level="L" 
              />
            </div>

            <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-3">Scan to Cast</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 mb-4 leading-normal">
              Patients can scan this to check in to the queue and watch progress on their mobile device.
            </p>

            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 border-slate-200"
              icon={copied ? Check : Copy}
              aria-label="Copy portal checkin link to clipboard"
            >
              {copied ? 'Link Copied!' : 'Copy Portal URL'}
            </Button>
          </Card>

        </div>

      </div>

    </div>
  );
}

export default ReceptionistView;
