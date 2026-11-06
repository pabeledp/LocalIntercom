import React, { useState } from 'react';
import { UserProfile } from '../types';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const saved = await window.electronAPI.saveProfile({
      name: name.trim(),
      avatar: 'avatar-1',
    });
    onComplete(saved);
  };

  return (
    <div className="w-full h-full mac-glass rounded-2xl p-6 flex flex-col justify-between text-white/90 select-none shadow-2xl">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">
          Local Wi-Fi Intercom
        </div>
        <h2 className="text-xl font-medium tracking-tight text-white">Setup Profile</h2>
        <p className="text-xs text-white/50 mt-1">
          Enter your name to automatically appear on other devices connected to this Wi-Fi network.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1.5">
              Your Name / Machine Label
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Studio Mac"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full mt-4 py-2 px-3 mac-control hover:bg-white/15 disabled:opacity-30 text-white font-medium text-xs rounded-xl transition cursor-pointer"
          >
            Continue
          </button>
        </form>
      </div>

      <div className="text-center text-[10px] text-white/30">
        Peer-to-Peer • Zero Cloud Servers • Offline Ready
      </div>
    </div>
  );
};
