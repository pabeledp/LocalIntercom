export interface Peer {
  id: string;
  name: string;
  avatar: string;
  os: string;
  ip: string;
  port: number;
  lastSeen: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  port: number;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  timestamp: number;
  isSelf?: boolean;
  fileInfo?: {
    fileId: string;
    fileName: string;
    fileSize: number;
  };
}

export interface TransferProgress {
  id: string;
  fileName: string;
  fileSize: number;
  transferredBytes: number;
  progressPercent: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'transferring' | 'paused' | 'completed' | 'failed';
  direction: 'upload' | 'download';
  peerId: string;
}

declare global {
  interface Window {
    electronAPI: {
      getProfile: () => Promise<UserProfile>;
      saveProfile: (profile: Partial<UserProfile>) => Promise<UserProfile>;
      setExpanded: (expanded: boolean) => void;
      dragWindow: (delta: { deltaX: number; deltaY: number }) => void;
      snapEdge: () => void;
      sendSignaling: (params: { ip: string; port: number; message: any }) => Promise<{ success: boolean; error?: string }>;

      // Giant File Streaming (Dual-Engine)
      selectFileDialog: () => Promise<{ fileId: string; fileName: string; fileSize: number } | null>;
      registerFile: (filePath: string) => Promise<{ fileId: string; fileName: string; fileSize: number }>;
      startFileDownload: (params: { targetIp: string; fileId: string; fileName: string; totalSize: number; peerId: string }) => Promise<{ success: boolean }>;
      cancelFileTransfer: (fileId: string) => Promise<{ success: boolean }>;

      onPeersUpdated: (callback: (peers: Peer[]) => void) => () => void;
      onSignalingMessage: (callback: (message: any) => void) => () => void;
      onFileTransferProgress: (callback: (progress: TransferProgress) => void) => () => void;
    };
  }
}
