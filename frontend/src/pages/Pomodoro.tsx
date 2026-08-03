import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Settings, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/supabaseClient';

type Mode = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroStats {
  sessionsToday: number;
  totalFocusMinutes: number;
}

// Palette (from the moodboard): light blue, teal, deep navy, gold, orange
const PALETTE = {
  bg: '#182B45',       // deep navy background
  panel: '#2E6E8E',    // teal panel tint (used at low opacity)
  gold: '#F2A93B',     // headings / highlights
  orange: '#E2692B',   // primary accent / active states
  cream: '#F5EEDD',    // main text
  outline: '#122036',  // ink outline
  lightBlue: '#8ECAE6', // light blue accent (ring track / secondary)
  furBlue: '#2C6E90',  // fox body
  furBlueLight: '#3E86AC', // fox ear outer
  earInner: '#E2692B', // orange inner ear
  cheek: '#F5EEDD',    // cream muzzle/chest patch
};

const FoxMascot = ({ mode, isActive }: { mode: Mode; isActive: boolean }) => {
  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center transition-transform duration-500 ease-in-out">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl overflow-visible">
        {/* Outer ears */}
        <path d="M45 100 Q38 38 76 64 Z" fill={PALETTE.furBlueLight} stroke={PALETTE.outline} strokeWidth="3" strokeLinejoin="round" />
        <path d="M155 100 Q162 38 124 64 Z" fill={PALETTE.furBlueLight} stroke={PALETTE.outline} strokeWidth="3" strokeLinejoin="round" />
        {/* Inner ears */}
        <path d="M53 93 Q49 55 71 70 Z" fill={PALETTE.earInner} />
        <path d="M147 93 Q151 55 129 70 Z" fill={PALETTE.earInner} />

        {/* Head/body base */}
        <path d="M50 120 Q100 172 150 120 Q160 80 100 60 Q40 80 50 120 Z" fill={PALETTE.furBlue} stroke={PALETTE.outline} strokeWidth="3" strokeLinejoin="round" />

        {/* Cream cheek/chest patch */}
        <path d="M50 120 Q100 132 100 162 Q100 132 150 120 Q100 172 50 120 Z" fill={PALETTE.cheek} stroke={PALETTE.outline} strokeWidth="2" strokeLinejoin="round" />

        {/* Head fur tuft, like the reference art */}
        <path d="M92 62 Q98 50 104 62 Q108 54 112 64" stroke={PALETTE.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="100" cy="160" rx="6" ry="5" fill={PALETTE.outline} />

        {/* Expressions */}
        {mode === 'focus' && isActive && (
          <g>
            <circle cx="80" cy="113" r="8" fill={PALETTE.outline} />
            <circle cx="120" cy="113" r="8" fill={PALETTE.outline} />
            <circle cx="82.5" cy="110" r="2" fill="#FFFFFF" />
            <circle cx="122.5" cy="110" r="2" fill="#FFFFFF" />
            <path d="M85 130 Q100 145 115 130" stroke={PALETTE.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M70 100 Q80 95 90 100" stroke={PALETTE.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M110 100 Q120 95 130 100" stroke={PALETTE.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}
        {mode === 'focus' && !isActive && (
          <g>
            <path d="M73 115 Q80 110 87 115" stroke={PALETTE.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M113 115 Q120 110 127 115" stroke={PALETTE.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M92 135 Q100 140 108 135" stroke={PALETTE.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}
        {(mode === 'shortBreak' || mode === 'longBreak') && (
          <g>
            <path d="M73 118 Q80 113 87 118" stroke={PALETTE.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M113 118 Q120 113 127 118" stroke={PALETTE.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
            {isActive ? (
              <ellipse cx="100" cy="135" rx="6" ry="10" fill={PALETTE.outline} className="animate-pulse" /> // Yawning
            ) : (
              <path d="M92 135 Q100 140 108 135" stroke={PALETTE.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
            {isActive && (
              <text x="135" y="85" fontSize="24" fill={PALETTE.gold} className="animate-bounce font-bold">Z</text>
            )}
            {isActive && (
              <text x="150" y="65" fontSize="16" fill={PALETTE.gold} className="animate-bounce delay-150 font-bold">z</text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};

export default function Pomodoro() {
  const { user } = useAuth();
  
  const [mode, setMode] = useState<Mode>('focus');
  const [isActive, setIsActive] = useState(false);
  
  const [settings, setSettings] = useState({
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  });
  
  const [timeLeft, setTimeLeft] = useState(settings.focus);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<PomodoroStats>({ sessionsToday: 0, totalFocusMinutes: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const modeDurations = {
    focus: settings.focus,
    shortBreak: settings.shortBreak,
    longBreak: settings.longBreak,
  };

  const handleModeComplete = useCallback(async () => {
    setIsActive(false);
    if (soundEnabled) {
      // Play a simple beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 500);
    }

    if (mode === 'focus' && user) {
      setSessionsCompleted(prev => prev + 1);
      const focusMins = Math.round(settings.focus / 60);
      setStats(s => ({ 
        sessionsToday: s.sessionsToday + 1, 
        totalFocusMinutes: s.totalFocusMinutes + focusMins 
      }));
      
      try {
        if (sessionId) {
          await fetch(`${API_URL}/pomodoro/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, sessionId, duration: focusMins })
          });
        }
      } catch (err) {
        console.error("Failed to save pomodoro session", err);
      }
      setSessionId(null);
    }

    // Auto transition logic
    if (mode === 'focus') {
      if ((sessionsCompleted + 1) % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      switchMode('focus');
    }
  }, [mode, sessionsCompleted, soundEnabled, settings.focus, user, sessionId]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleModeComplete();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, handleModeComplete]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(modeDurations[newMode]);
    setIsActive(false);
  };

  const toggleTimer = async () => {
    if (!isActive && mode === 'focus' && !sessionId && user) {
      try {
        const res = await fetch(`${API_URL}/pomodoro/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, mode: 'focus' })
        });
        const data = await res.json();
        if (data.sessionId) setSessionId(data.sessionId);
      } catch (err) {
        console.error("Failed to start session", err);
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modeDurations[mode]);
    setSessionId(null);
  };

  const skipTimer = () => {
    handleModeComplete();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((modeDurations[mode] - timeLeft) / modeDurations[mode]) * 100;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#182B45] text-[#F5EEDD] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      
      {/* Top Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-display font-bold text-[#F2A93B]">Focus Forest</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-[#2E6E8E] bg-opacity-40 rounded-xl hover:bg-opacity-60 transition"
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-[#2E6E8E] bg-opacity-40 rounded-xl hover:bg-opacity-60 transition flex items-center gap-2"
          >
            <Settings size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 w-full max-w-4xl items-center lg:items-start justify-center">
        
        {/* Timer Main Area */}
        <div className="flex flex-col items-center relative">
          
          {/* Modes */}
          <div className="flex gap-4 mb-8 bg-[#2E6E8E] bg-opacity-30 p-2 rounded-2xl backdrop-blur-sm">
            {(['focus', 'shortBreak', 'longBreak'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  mode === m 
                    ? 'bg-[#E2692B] text-white shadow-lg' 
                    : 'text-[#F5EEDD] hover:bg-[#2E6E8E] hover:bg-opacity-50'
                }`}
              >
                {m === 'focus' ? 'Focus' : m === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </button>
            ))}
          </div>

          {/* Timer Ring & Fox */}
          <div className="relative w-80 h-80 flex flex-col items-center justify-center mb-8">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="160" cy="160" r={radius}
                fill="none" stroke="#8ECAE6" strokeWidth="12" strokeOpacity="0.25"
              />
              <circle
                cx="160" cy="160" r={radius}
                fill="none" stroke="#E2692B" strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            
            <div className="z-10 mt-[-40px]">
              <FoxMascot mode={mode} isActive={isActive} />
            </div>
            
            <div className="absolute bottom-10 z-10 text-center w-full">
              <span className={`text-6xl font-bold font-display tracking-wider ${isActive && mode === 'focus' ? 'animate-pulse' : ''} text-[#F5EEDD]`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button 
              onClick={resetTimer}
              className="p-4 rounded-2xl bg-[#2E6E8E] bg-opacity-30 hover:bg-opacity-50 transition text-[#F5EEDD]"
            >
              <RotateCcw size={28} />
            </button>
            
            <button 
              onClick={toggleTimer}
              className="w-24 h-24 rounded-full bg-[#E2692B] hover:bg-[#F2A93B] text-white flex items-center justify-center shadow-[0_0_20px_rgba(226,105,43,0.4)] transition-all transform hover:scale-105"
            >
              {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
            </button>
            
            <button 
              onClick={skipTimer}
              className="p-4 rounded-2xl bg-[#2E6E8E] bg-opacity-30 hover:bg-opacity-50 transition text-[#F5EEDD]"
            >
              <SkipForward size={28} />
            </button>
          </div>

          {/* Session Progress */}
          <div className="mt-12 flex gap-3">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-500 ${
                  i < (sessionsCompleted % 4) 
                    ? 'bg-[#E2692B] scale-110 shadow-[0_0_10px_rgba(226,105,43,0.8)]' 
                    : i === (sessionsCompleted % 4) && mode === 'focus' && isActive
                      ? 'bg-[#F2A93B] animate-pulse scale-110'
                      : 'bg-[#2E6E8E] opacity-50'
                }`}
              />
            ))}
          </div>

        </div>

        {/* Side Panel: Stats & Settings */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Stats Card */}
          <div className="bg-[#2E6E8E] bg-opacity-20 backdrop-blur-md rounded-3xl p-6 border border-[#2E6E8E] border-opacity-50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#F2A93B]">
              <BarChart2 /> Daily Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#182B45] bg-opacity-50 p-4 rounded-2xl text-center">
                <div className="text-3xl font-bold text-[#E2692B] mb-1">{stats.sessionsToday}</div>
                <div className="text-sm opacity-80">Sessions</div>
              </div>
              <div className="bg-[#182B45] bg-opacity-50 p-4 rounded-2xl text-center">
                <div className="text-3xl font-bold text-[#E2692B] mb-1">{stats.totalFocusMinutes}</div>
                <div className="text-sm opacity-80">Focus Mins</div>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          {showSettings && (
            <div className="bg-[#2E6E8E] bg-opacity-20 backdrop-blur-md rounded-3xl p-6 border border-[#2E6E8E] border-opacity-50 transition-all">
              <h3 className="text-xl font-bold mb-6 text-[#F2A93B]">Timer Settings</h3>
              
              <div className="flex flex-col gap-5">
                {[
                  { label: 'Focus', key: 'focus', max: 60 },
                  { label: 'Short Break', key: 'shortBreak', max: 30 },
                  { label: 'Long Break', key: 'longBreak', max: 60 }
                ].map(setting => (
                  <div key={setting.key} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-semibold opacity-90">
                      <span>{setting.label}</span>
                      <span className="text-[#E2692B]">
                        {Math.floor(settings[setting.key as keyof typeof settings] / 60)} min
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max={setting.max} 
                      value={Math.floor(settings[setting.key as keyof typeof settings] / 60)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) * 60;
                        setSettings(s => ({ ...s, [setting.key]: val }));
                        if (mode === setting.key && !isActive) {
                          setTimeLeft(val);
                        }
                      }}
                      className="w-full accent-[#E2692B] h-2 bg-[#182B45] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}