'use client';

import { soundFx } from '@/lib/audio';
import { User, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

export function UserChip() {
  const [userName, setUserName] = useState<string>('Bidding Session');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('pulse_bidder_name');
      if (storedName) {
        setUserName(storedName);
      }
      setIsMuted(soundFx.getMutedState());
    }
  }, []);

  const handleToggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleSound}
        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs transition-colors"
        title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
      </button>

      <div className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700">
        <User className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-semibold">{userName}</span>
      </div>
    </div>
  );
}
