import React, { useRef } from 'react';
import { UserProfile, TransferProgress } from '../types';
import { PhoneCall, ArrowDown } from 'lucide-react';

interface Props {
  profile: UserProfile;
  unreadCount: number;
  isCalling: boolean;
  activePeersCount: number;
  activeTransfer: TransferProgress | null;
  onOpen: () => void;
}

export const FloatingBubble: React.FC<Props> = ({
  profile,
  unreadCount,
  isCalling,
  activePeersCount,
  activeTransfer,
  onOpen,
}) => {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.screenX, y: e.screenY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = moveEvent.screenX - dragStart.current.x;
      const deltaY = moveEvent.screenY - dragStart.current.y;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved.current = true;
      }

      window.electronAPI.dragWindow({ deltaX, deltaY });
      dragStart.current = { x: moveEvent.screenX, y: moveEvent.screenY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.electronAPI.snapEdge();

      if (!hasMoved.current) {
        onOpen();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = activeTransfer ? activeTransfer.progressPercent : 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing p-0 m-0 select-none relative bg-transparent"
    >
      {/* File Transfer Circular Ring */}
      {activeTransfer && activeTransfer.status === 'transferring' && (
        <svg className="absolute w-[68px] h-[68px] -rotate-90 pointer-events-none">
          <circle
            cx="34"
            cy="34"
            r={radius}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2.5"
            fill="transparent"
          />
          <circle
            cx="34"
            cy="34"
            r={radius}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-200"
            fill="transparent"
          />
        </svg>
      )}

      {/* 3D Convex Curved Liquid Lens Bubble (Exact as Apple Reference) */}
      <div
        className={`relative w-[62px] h-[62px] rounded-full liquid-lens-bubble flex items-center justify-center text-white/95 overflow-hidden transition-all duration-300 active:scale-95 ${
          isCalling ? 'ring-2 ring-white animate-pulse' : ''
        }`}
      >
        {/* Specular curved reflection glint on top-left of glass */}
        <div className="absolute top-1 left-2.5 w-7 h-3 rounded-full bg-gradient-to-b from-white/80 to-transparent rotate-[-15deg] pointer-events-none filter blur-[0.5px]" />

        {isCalling ? (
          <PhoneCall className="w-5 h-5 animate-bounce text-white drop-shadow-md z-10" />
        ) : activeTransfer && activeTransfer.status === 'transferring' ? (
          <div className="flex flex-col items-center z-10">
            <ArrowDown className="w-3.5 h-3.5 animate-bounce text-white drop-shadow" />
            <span className="text-[9px] font-bold text-white drop-shadow">{progressPercent}%</span>
          </div>
        ) : profile.avatar && profile.avatar.startsWith('data:image') ? (
          <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
        ) : (
          <span className="text-xs font-bold tracking-widest uppercase text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] z-10">
            {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'ME'}
          </span>
        )}

        {/* Online peers count badge */}
        {activePeersCount > 0 && (
          <div
            title={`${activePeersCount} peers online`}
            className="absolute bottom-0 right-0 min-w-[15px] h-3.5 px-1 bg-white/25 backdrop-blur-md text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white/30 shadow-sm z-20"
          >
            {activePeersCount}
          </div>
        )}

        {/* Unread indicator badge */}
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white text-black text-[7px] font-bold rounded-full flex items-center justify-center shadow-md z-20" />
        )}
      </div>
    </div>
  );
};
