import React, { useState, useEffect, useRef } from 'react';
import { Peer, ChatMessage, UserProfile, TransferProgress } from '../types';
import {
  Send,
  Phone,
  Mic,
  MicOff,
  Paperclip,
  ArrowDown,
  Camera,
  Edit2,
  Check,
  MessageSquare,
  Settings,
  X
} from 'lucide-react';

interface Props {
  profile: UserProfile;
  peers: Peer[];
  activeChatPeer: Peer | null;
  messages: ChatMessage[];
  isCalling: boolean;
  incomingCallPeer: Peer | null;
  activeTransfer: TransferProgress | null;
  onUpdateProfile: (name: string, avatar: string) => void;
  onSelectPeer: (peer: Peer | null) => void;
  onSendMessage: (text: string) => void;
  onSendFile: () => void;
  onStartCall: (peer: Peer) => void;
  onAcceptCall: () => void;
  onEndCall: () => void;
  onCancelTransfer: (fileId: string) => void;
  onStartDownload: (fileInfo: { fileId: string; fileName: string; fileSize: number }) => void;
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const PopoverPanel: React.FC<Props> = ({
  profile,
  peers,
  activeChatPeer,
  messages,
  isCalling,
  incomingCallPeer,
  activeTransfer,
  onUpdateProfile,
  onSelectPeer,
  onSendMessage,
  onSendFile,
  onStartCall,
  onAcceptCall,
  onEndCall,
  onCancelTransfer,
  onStartDownload,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isSelfChat = activeChatPeer === null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onUpdateProfile(profile.name, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onUpdateProfile(editName.trim(), profile.avatar);
      setIsEditingProfile(false);
    }
  };

  return (
    <div className="w-full h-full liquid-glass-panel rounded-2xl flex flex-col text-white/95 overflow-hidden shadow-2xl relative">
      {/* Top Left Close Icon Bar */}
      <div className="h-10 px-3.5 border-b border-white/10 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Close / Minimize button at TOP-LEFT */}
          <button
            onClick={onClose}
            title="Close / Hide"
            className="w-6 h-6 rounded-full liquid-control flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold tracking-wide text-white/80">
            {isSelfChat ? 'Personal Notes' : activeChatPeer?.name || 'Local Intercom'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{peers.length} active</span>
        </div>
      </div>

      {/* Heavy File Transfer Status (Liquid Aesthetic) */}
      {activeTransfer && (
        <div className="px-3.5 py-2 bg-white/5 border-b border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="truncate max-w-[230px] font-medium text-white/90">{activeTransfer.fileName}</span>
            <span className="text-white/70 font-mono text-[10px]">{activeTransfer.progressPercent}%</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-200 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ width: `${activeTransfer.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-white/50 font-mono">
            <span>{formatBytes(activeTransfer.transferredBytes)} / {formatBytes(activeTransfer.fileSize)}</span>
            <span>{activeTransfer.speedMbps} Mbps</span>
            {activeTransfer.status === 'transferring' ? (
              <button
                onClick={() => onCancelTransfer(activeTransfer.id)}
                className="text-white/70 hover:text-white"
              >
                Pause
              </button>
            ) : (
              <span className="text-white/90">Completed</span>
            )}
          </div>
        </div>
      )}

      {/* Incoming Call Dialog */}
      {incomingCallPeer && !isCalling && (
        <div className="px-3.5 py-2.5 bg-white/10 border-b border-white/10 flex items-center justify-between">
          <div className="text-xs text-white/90">
            <span className="font-semibold">{incomingCallPeer.name}</span> is calling...
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onAcceptCall}
              className="px-2.5 py-1 liquid-control rounded-lg text-[11px] font-medium text-white"
            >
              Answer
            </button>
            <button
              onClick={onEndCall}
              className="px-2.5 py-1 liquid-control rounded-lg text-[11px] text-white/60"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Active Call Controls */}
      {isCalling && (
        <div className="px-3.5 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Voice Call Live</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 liquid-control rounded-md text-white/80"
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onEndCall}
              className="px-2.5 py-0.5 liquid-control rounded-md text-[11px] text-white/90"
            >
              End
            </button>
          </div>
        </div>
      )}

      {/* Main Body: Left Sidebar + Right Feed */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-40 border-r border-white/10 flex flex-col justify-between p-2">
          {/* Peers List */}
          <div className="overflow-y-auto space-y-0.5 flex-1">
            <button
              onClick={() => onSelectPeer(null)}
              className={`w-full text-left px-2 py-1.5 rounded-xl flex items-center gap-2 transition ${
                isSelfChat
                  ? 'liquid-control text-white font-medium'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-white/80">
                <MessageSquare className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">Note to Self</div>
              </div>
            </button>

            <div className="text-[9px] font-semibold tracking-wider uppercase text-white/30 px-1.5 pt-2 pb-1">
              Peers ({peers.length})
            </div>

            {peers.length === 0 ? (
              <div className="text-[10px] text-white/30 p-2 text-center">
                Scanning Wi-Fi...
              </div>
            ) : (
              peers.map((peer) => (
                <button
                  key={peer.id}
                  onClick={() => onSelectPeer(peer)}
                  className={`w-full text-left px-2 py-1.5 rounded-xl flex items-center gap-2 transition ${
                    activeChatPeer?.id === peer.id
                      ? 'liquid-control text-white font-medium'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/80">
                    {peer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{peer.name}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* BOTTOM-LEFT Profile & Settings Bar (As requested!) */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {/* Avatar Click to Change */}
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Change Photo"
                className="relative w-7 h-7 rounded-full liquid-lens-bubble flex items-center justify-center cursor-pointer overflow-hidden group flex-shrink-0"
              >
                {profile.avatar && profile.avatar.startsWith('data:image') ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-white">
                    {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'U'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Camera className="w-3 h-3 text-white/90" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Inline Name Edit */}
              {isEditingProfile ? (
                <div className="flex items-center gap-1 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-16 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-0.5 text-white/80 hover:text-white">
                    <Check className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-white/90 truncate">{profile.name}</span>
                    <button
                      onClick={() => {
                        setEditName(profile.name);
                        setIsEditingProfile(true);
                      }}
                      title="Edit Name"
                      className="text-white/40 hover:text-white/80"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Settings className="w-3.5 h-3.5 text-white/40 hover:text-white/80 cursor-pointer" />
          </div>
        </div>

        {/* Right Feed & Chat Area */}
        <div className="flex-1 flex flex-col justify-between bg-black/10">
          <div className="h-8 px-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/70">
              {isSelfChat ? 'Your Private Space' : activeChatPeer?.ip}
            </span>
            <div className="flex gap-1">
              {!isSelfChat && (
                <>
                  <button
                    onClick={onSendFile}
                    title="Send file (up to 80GB)"
                    className="p-1 liquid-control rounded-md text-white/70 hover:text-white"
                  >
                    <Paperclip className="w-3 h-3" />
                  </button>
                  {!isCalling && activeChatPeer && (
                    <button
                      onClick={() => onStartCall(activeChatPeer)}
                      className="px-2 py-0.5 liquid-control rounded-md text-[10px] text-white/90 hover:text-white"
                    >
                      Call
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/30 text-[11px]">
                {isSelfChat ? 'Send yourself notes, links, or drop giant files' : 'No messages yet'}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-xl break-words ${
                      m.isSelf
                        ? 'liquid-control text-white rounded-br-none border-white/30'
                        : 'bg-white/5 text-white/85 rounded-bl-none border border-white/10'
                    }`}
                  >
                    <div>{m.text}</div>
                    {m.fileInfo && !m.isSelf && (
                      <button
                        onClick={() => onStartDownload(m.fileInfo!)}
                        className="mt-1.5 w-full py-1 px-2 liquid-control rounded-md text-[10px] text-white font-medium flex items-center justify-center gap-1"
                      >
                        <ArrowDown className="w-3 h-3" /> Download ({formatBytes(m.fileInfo.fileSize)})
                      </button>
                    )}
                  </div>
                  <span className="text-[8px] text-white/30 mt-0.5 px-1 font-mono">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="p-2 border-t border-white/10 flex gap-1.5">
            <input
              type="text"
              placeholder={isSelfChat ? 'Note to self...' : 'Message...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-1.5 liquid-control rounded-xl text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
