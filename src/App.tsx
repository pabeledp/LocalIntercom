import React, { useState, useEffect } from 'react';
import { UserProfile, Peer, ChatMessage, TransferProgress } from './types';
import { Onboarding } from './components/Onboarding';
import { FloatingBubble } from './components/FloatingBubble';
import { PopoverPanel } from './components/PopoverPanel';
import { useWebRTC } from './hooks/useWebRTC';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [activeChatPeer, setActiveChatPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [incomingCallPeer, setIncomingCallPeer] = useState<Peer | null>(null);
  const [pendingOffer, setPendingOffer] = useState<any>(null);
  const [activeTransfer, setActiveTransfer] = useState<TransferProgress | null>(null);

  // WebRTC Audio Intercom
  const {
    isCalling,
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    endCall
  } = useWebRTC(profile || { id: '', name: '' });

  useEffect(() => {
    window.electronAPI.getProfile().then((data) => {
      setProfile(data);
      if (!data.name) {
        setIsExpanded(true);
        window.electronAPI.setExpanded(true);
      }
    });

    const unsubPeers = window.electronAPI.onPeersUpdated((updatedPeers) => {
      setPeers(updatedPeers);
    });

    const unsubSignaling = window.electronAPI.onSignalingMessage((msg) => {
      if (msg.type === 'chat') {
        const newMsg: ChatMessage = {
          id: uuidv4(),
          fromId: msg.fromId,
          fromName: msg.fromName,
          text: msg.data.text,
          timestamp: Date.now(),
          isSelf: false,
          fileInfo: msg.data.fileInfo
        };

        setMessages((prev) => ({
          ...prev,
          [msg.fromId]: [...(prev[msg.fromId] || []), newMsg]
        }));
      } else if (msg.type === 'call-offer') {
        setIncomingCallPeer({
          id: msg.fromId,
          name: msg.fromName,
          avatar: 'avatar-1',
          os: 'unknown',
          ip: msg.data.ip || '',
          port: msg.data.port || 41235,
          lastSeen: Date.now()
        });
        setPendingOffer(msg.data);
        setIsExpanded(true);
        window.electronAPI.setExpanded(true);
      } else if (msg.type === 'call-answer') {
        handleAnswer(msg.data);
      } else if (msg.type === 'ice-candidate') {
        handleIceCandidate(msg.data);
      } else if (msg.type === 'call-end') {
        endCall(false);
        setIncomingCallPeer(null);
      }
    });

    const unsubFile = window.electronAPI.onFileTransferProgress((progress) => {
      setActiveTransfer(progress);
      if (progress.status === 'completed' || progress.status === 'failed') {
        setTimeout(() => {
          setActiveTransfer((curr) => (curr?.id === progress.id ? null : curr));
        }, 5000);
      }
    });

    return () => {
      unsubPeers();
      unsubSignaling();
      unsubFile();
    };
  }, []);

  const handleToggleExpand = (expand: boolean) => {
    setIsExpanded(expand);
    window.electronAPI.setExpanded(expand);
  };

  const handleUpdateProfile = async (name: string, avatar: string) => {
    const updated = await window.electronAPI.saveProfile({ name, avatar });
    setProfile(updated);
  };

  const handleSendMessage = async (text: string) => {
    if (!profile) return;

    const targetKey = activeChatPeer ? activeChatPeer.id : 'self';

    const newMsg: ChatMessage = {
      id: uuidv4(),
      fromId: profile.id,
      fromName: profile.name,
      text,
      timestamp: Date.now(),
      isSelf: true
    };

    setMessages((prev) => ({
      ...prev,
      [targetKey]: [...(prev[targetKey] || []), newMsg]
    }));

    if (activeChatPeer) {
      await window.electronAPI.sendSignaling({
        ip: activeChatPeer.ip,
        port: activeChatPeer.port,
        message: {
          type: 'chat',
          fromId: profile.id,
          fromName: profile.name,
          data: { text }
        }
      });
    }
  };

  const handleSendFile = async () => {
    if (!activeChatPeer || !profile) return;
    const fileInfo = await window.electronAPI.selectFileDialog();
    if (fileInfo) {
      handleSendMessage(`Offered file: ${fileInfo.fileName}`);
      await window.electronAPI.sendSignaling({
        ip: activeChatPeer.ip,
        port: activeChatPeer.port,
        message: {
          type: 'chat',
          fromId: profile.id,
          fromName: profile.name,
          data: {
            text: `Offered file: ${fileInfo.fileName}`,
            fileInfo
          }
        }
      });
    }
  };

  const handleStartDownload = (fileInfo: { fileId: string; fileName: string; fileSize: number }) => {
    if (!activeChatPeer) return;
    window.electronAPI.startFileDownload({
      targetIp: activeChatPeer.ip,
      fileId: fileInfo.fileId,
      fileName: fileInfo.fileName,
      totalSize: fileInfo.fileSize,
      peerId: activeChatPeer.id
    });
  };

  const handleCancelTransfer = (fileId: string) => {
    window.electronAPI.cancelFileTransfer(fileId);
  };

  const handleAcceptCall = () => {
    if (incomingCallPeer && pendingOffer) {
      handleOffer(incomingCallPeer, pendingOffer);
      setIncomingCallPeer(null);
      setPendingOffer(null);
    }
  };

  const handleEndCall = () => {
    endCall(true);
    setIncomingCallPeer(null);
    setPendingOffer(null);
  };

  if (!profile) return null;

  if (!profile.name) {
    return (
      <div className="w-full h-full p-2">
        <Onboarding
          onComplete={(updated) => {
            setProfile(updated);
            handleToggleExpand(false);
          }}
        />
      </div>
    );
  }

  const activeMessages = activeChatPeer ? messages[activeChatPeer.id] || [] : messages['self'] || [];

  return (
    <div className="w-full h-full p-1.5 flex items-center justify-center">
      {isExpanded ? (
        <PopoverPanel
          profile={profile}
          peers={peers}
          activeChatPeer={activeChatPeer}
          messages={activeMessages}
          isCalling={isCalling}
          incomingCallPeer={incomingCallPeer}
          activeTransfer={activeTransfer}
          onUpdateProfile={handleUpdateProfile}
          onSelectPeer={(p) => setActiveChatPeer(p)}
          onSendMessage={handleSendMessage}
          onSendFile={handleSendFile}
          onStartCall={(p) => startCall(p)}
          onAcceptCall={handleAcceptCall}
          onEndCall={handleEndCall}
          onCancelTransfer={handleCancelTransfer}
          onStartDownload={handleStartDownload}
          onClose={() => handleToggleExpand(false)}
        />
      ) : (
        <FloatingBubble
          profile={profile}
          unreadCount={0}
          isCalling={isCalling || !!incomingCallPeer}
          activePeersCount={peers.length}
          activeTransfer={activeTransfer}
          onOpen={() => handleToggleExpand(true)}
        />
      )}
    </div>
  );
}
