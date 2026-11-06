import { useState, useRef, useCallback } from 'react';
import { Peer } from '../types';

export function useWebRTC(currentProfile: { id: string; name: string }) {
  const [isCalling, setIsCalling] = useState(false);
  const [activeCallPeer, setActiveCallPeer] = useState<Peer | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);

  const initRemoteAudio = () => {
    if (!remoteAudio.current) {
      const audio = new Audio();
      audio.autoplay = true;
      remoteAudio.current = audio;
    }
  };

  const createPeerConnection = (targetPeer: Peer) => {
    const pc = new RTCPeerConnection({
      iceServers: [] // Zero-cloud: Local LAN host candidates only
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        window.electronAPI.sendSignaling({
          ip: targetPeer.ip,
          port: targetPeer.port,
          message: {
            type: 'ice-candidate',
            fromId: currentProfile.id,
            fromName: currentProfile.name,
            data: event.candidate
          }
        });
      }
    };

    pc.ontrack = (event) => {
      initRemoteAudio();
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async (peer: Peer) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;

      const pc = createPeerConnection(peer);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await window.electronAPI.sendSignaling({
        ip: peer.ip,
        port: peer.port,
        message: {
          type: 'call-offer',
          fromId: currentProfile.id,
          fromName: currentProfile.name,
          data: offer
        }
      });

      setActiveCallPeer(peer);
      setIsCalling(true);
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  const handleOffer = async (fromPeer: Peer, offer: RTCSessionDescriptionInit) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;

      const pc = createPeerConnection(fromPeer);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await window.electronAPI.sendSignaling({
        ip: fromPeer.ip,
        port: fromPeer.port,
        message: {
          type: 'call-answer',
          fromId: currentProfile.id,
          fromName: currentProfile.name,
          data: answer
        }
      });

      setActiveCallPeer(fromPeer);
      setIsCalling(true);
    } catch (err) {
      console.error('Failed to answer call:', err);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnection.current) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ice candidate:', e);
      }
    }
  };

  const endCall = useCallback((notifyPeer = true) => {
    if (activeCallPeer && notifyPeer) {
      window.electronAPI.sendSignaling({
        ip: activeCallPeer.ip,
        port: activeCallPeer.port,
        message: {
          type: 'call-end',
          fromId: currentProfile.id,
          fromName: currentProfile.name
        }
      });
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }

    setIsCalling(false);
    setActiveCallPeer(null);
  }, [activeCallPeer, currentProfile]);

  return {
    isCalling,
    activeCallPeer,
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    endCall
  };
}
