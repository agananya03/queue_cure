import React, { useState, useEffect, useRef } from 'react';
import { addPatient, subscribeToQueue, subscribeToConnectionStatus } from '../firebase';
import { 
  User, 
  Activity, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Home,
  Check,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, TokenBadge, useToast } from './ui';

function PatientCheckIn() {
  const [queueData, setQueueData] = useState({
    currentToken: 0,
    avgConsultationTime: 10,
    lastTokenIssued: 0,
    patients: {}
  });

  const [name, setName] = useState('');
  const [myTokenId, setMyTokenId] = useState(localStorage.getItem('qc_patient_token') || null);
  const [isConnected, setIsConnected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highContrast, setHighContrast] = useState(document.body.classList.contains('high-contrast'));

  const toast = useToast();
  const inputRef = useRef(null);

  // Subscribe to real-time database updates
  useEffect(() => {
    document.title = "Self Check-in — Queue Cure";

    const unsubscribeQueue = subscribeToQueue((data) => {
      setQueueData(data);
    });

    const unsubscribeConn = subscribeToConnectionStatus((status) => {
      setIsConnected(status);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeConn();
    };
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (!myTokenId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [myTokenId]);

  // Handle high contrast mode toggle
  const toggleHighContrast = () => {
    const active = document.body.classList.toggle('high-contrast');
    setHighContrast(active);
    toast.info(`High Contrast Mode ${active ? 'Enabled' : 'Disabled'}`);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name to check in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const patientName = name.trim();
      // Patient Self-Check-in defaults to 'Walk-in' label
      const token = await addPatient(patientName, 'Walk-in');
      localStorage.setItem('qc_patient_token', token);
      setMyTokenId(token);
      toast.success(`Check-in successful! Your token is ${token}`);
    } catch (err) {
      console.error(err);
      toast.error("Check-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckInAnother = () => {
    localStorage.removeItem('qc_patient_token');
    setMyTokenId(null);
    setName('');
  };

  // Find my patient details in database
  const getMyPatientDetails = () => {
    if (!myTokenId) return null;
    return queueData.patients?.[myTokenId] || null;
  };

  const myPatient = getMyPatientDetails();
  const avgTime = queueData.avgConsultationTime || 10;

  // Calculate my real-time position in the waiting list
  const getQueuePosition = () => {
    if (!myTokenId || !myPatient || myPatient.status !== 'waiting') return 0;
    
    const waitingPatients = Object.entries(queueData.patients || {})
      .map(([key, val]) => ({ id: key, ...val }))
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
      
    const idx = waitingPatients.findIndex(p => p.id === myTokenId);
    return idx !== -1 ? idx + 1 : 0;
  };

  const myPosition = getQueuePosition();
  const estimatedWait = myPosition > 0 ? (myPosition - 1) * avgTime : 0;

  // Render Check-in Form (Step 1)
  const renderForm = () => (
    <Card hoverable={false} className="bg-white max-w-[420px] w-full shadow-2xl p-6 md:p-8 animate-spring-in border border-slate-200">
      <div className="text-center mb-6">
        <div className="bg-[#0066CC]/10 text-[#0066CC] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#0066CC]/10">
          <Activity className="w-6 h-6 animate-pulse-slow" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 font-heading">Self Check-in</h2>
        <p className="text-xs text-slate-500 mt-1">Enter your details to generate your triage queue token.</p>
      </div>

      <form onSubmit={handleCheckIn} className="space-y-4">
        <div>
          <div className="relative mt-2">
            <input
              ref={inputRef}
              type="text"
              id="patientNameInput"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="peer w-full bg-slate-50 border border-slate-250 focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder-transparent focus:shadow-[0_0_8px_rgba(0,102,204,0.20)]"
              aria-label="Enter your full name"
              required
            />
            <User className="absolute left-3.5 top-[15px] text-slate-400 w-4 h-4 peer-focus:text-[#0066CC] transition-colors" />
            <label 
              htmlFor="patientNameInput"
              className="absolute left-10 top-3 text-sm text-slate-400 font-medium transition-all pointer-events-none
                         peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400
                         peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-[10px] peer-focus:text-[#0066CC] peer-focus:bg-white peer-focus:px-1.5 peer-focus:font-bold
                         peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-[#0066CC] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:font-bold"
            >
              Your Full Name
            </label>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 text-sm font-bold mt-2"
          loading={isSubmitting}
          aria-label="Check in and get token"
        >
          Get My Token
        </Button>
      </form>
      
      <div className="text-center mt-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0066CC] transition-colors font-semibold" aria-label="Go back to Home Page">
          <Home className="w-3.5 h-3.5" />
          <span>Back to Portal Home</span>
        </Link>
      </div>
    </Card>
  );

  // Render Queue Triage Details (Step 2)
  const renderDetails = () => {
    // If the database has loaded, but our token was cleared/reset on the server
    if (Object.keys(queueData.patients || {}).length > 0 && !myPatient) {
      return (
        <Card hoverable={false} className="bg-white max-w-[420px] w-full shadow-2xl p-6 text-center animate-spring-in border border-slate-200">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce-slow" />
          <h3 className="text-md font-bold text-slate-800">Token Expired or Reset</h3>
          <p className="text-xs text-slate-500 mt-2">
            Your triage token is no longer active in the clinical queue system. Please check-in again.
          </p>
          <Button onClick={handleCheckInAnother} variant="primary" className="w-full mt-6 py-2.5" aria-label="Check in again">
            Register New Token
          </Button>
        </Card>
      );
    }

    if (!myPatient) {
      // Loading State
      return (
        <Card hoverable={false} className="bg-white max-w-[420px] w-full shadow-2xl p-8 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-[#0066CC] animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-semibold animate-pulse">Retrieving your queue position...</p>
        </Card>
      );
    }

    const { status } = myPatient;

    return (
      <Card hoverable={false} className="bg-white max-w-[420px] w-full shadow-2xl p-6 md:p-8 animate-spring-in border border-slate-200 text-center relative overflow-hidden">
        
        {/* Subtle border indicator top colored by status */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          status === 'called' ? 'bg-[#00D4AA]' :
          status === 'completed' ? 'bg-[#00A86B]' :
          status === 'cancelled' ? 'bg-[#DC2626]' : 'bg-[#0066CC]'
        }`} />

        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">
          Your Issued Token
        </span>

        {/* Large Token Code */}
        <TokenBadge 
          token={myTokenId} 
          variant={
            status === 'called' ? 'current' :
            status === 'completed' ? 'done' :
            status === 'cancelled' ? 'waiting' : 'waiting'
          } 
          size="xl" 
          className={`mx-auto mb-4 ${status === 'called' ? 'animate-bounce-in shadow-xl shadow-[#00D4AA]/20' : ''}`} 
        />

        <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
          {myPatient.name}
        </h3>

        {/* Dynamic status-specific layout */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-150 text-xs text-slate-600 space-y-4">
          
          {status === 'waiting' && (
            <div aria-live="polite">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wide">
                  <Users className="w-4 h-4 text-[#0066CC]" />
                  Queue Position
                </span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  {myPosition === 1 ? 'Next in line!' : `#${myPosition}`}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Estimated Wait
                </span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  {myPosition === 1 ? 'Less than 1 min' : `${estimatedWait} mins`}
                </span>
              </div>
            </div>
          )}

          {status === 'called' && (
            <div aria-live="assertive" className="py-2 text-center">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/25 px-3 py-1 rounded-full uppercase tracking-wider mb-3 animate-pulse">
                🟢 Active Call
              </span>
              <p className="text-sm font-black text-slate-800">Please proceed to the consultation room!</p>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Your number is currently being called on the main screen. Please present your token.
              </p>
            </div>
          )}

          {status === 'completed' && (
            <div className="py-2 text-center text-[#00A86B]">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-800">Visit Completed</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Thank you for choosing City Care Hospital. We hope you have a great day.
              </p>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="py-2 text-center text-[#DC2626]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-black text-slate-800">Ticket Cancelled</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Your ticket was removed. Please check-in again or consult the reception counter.
              </p>
            </div>
          )}

        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleCheckInAnother} 
            variant="outline" 
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 py-2.5 text-xs font-bold"
            aria-label="Register a different patient"
          >
            Check-in Another
          </Button>

          <Link to="/" className="flex-1" aria-label="Go to Home Portal">
            <Button variant="ghost" className="w-full py-2.5 text-xs text-slate-500 font-bold border border-transparent hover:border-slate-200">
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex-1 bg-[#F0F4F8] text-slate-800 font-sans min-h-screen flex flex-col relative pb-16 justify-center items-center px-4 shifting-gradient-bg">
      {/* CSS Shifting Gradient */}
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
          0% { transform: scale(0.9) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-spring-in {
          animation: cardSpringInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Floating Accessibility Settings Pill */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={toggleHighContrast}
          variant="outline"
          size="sm"
          icon={Eye}
          className="bg-white/80 backdrop-blur border-slate-200 text-slate-600 font-bold shadow-sm"
          title="Toggle High Contrast Mode"
          aria-label="Toggle High Contrast Mode"
        />
      </div>

      {/* Connection Indicator status */}
      <div className="absolute top-4 left-4">
        <Badge variant={isConnected ? 'success' : 'danger'} pulse={isConnected}>
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </Badge>
      </div>

      {/* Main card switch */}
      {!myTokenId ? renderForm() : renderDetails()}

    </div>
  );
}

export default PatientCheckIn;
