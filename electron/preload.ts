// Preload script - must be CommonJS compatible
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProfile: () => ipcRenderer.invoke('get-profile'),
  saveProfile: (profile: any) => ipcRenderer.invoke('save-profile', profile),
  setExpanded: (expanded: boolean) => ipcRenderer.send('set-expanded', expanded),
  dragWindow: (delta: { deltaX: number; deltaY: number }) => ipcRenderer.send('window-drag', delta),
  snapEdge: () => ipcRenderer.send('window-snap-edge'),
  sendSignaling: (params: { ip: string; port: number; message: any }) => ipcRenderer.invoke('send-signaling', params),

  // File Transfer APIs
  selectFileDialog: () => ipcRenderer.invoke('select-file-dialog'),
  registerFile: (filePath: string) => ipcRenderer.invoke('register-file', filePath),
  startFileDownload: (params: { targetIp: string; fileId: string; fileName: string; totalSize: number; peerId: string }) =>
    ipcRenderer.invoke('start-file-download', params),
  cancelFileTransfer: (fileId: string) => ipcRenderer.invoke('cancel-file-transfer', fileId),

  onPeersUpdated: (callback: (peers: any[]) => void) => {
    const subscription = (_: any, peers: any[]) => callback(peers);
    ipcRenderer.on('peers-updated', subscription);
    return () => ipcRenderer.removeListener('peers-updated', subscription);
  },
  onSignalingMessage: (callback: (message: any) => void) => {
    const subscription = (_: any, msg: any) => callback(msg);
    ipcRenderer.on('signaling-message', subscription);
    return () => ipcRenderer.removeListener('signaling-message', subscription);
  },
  onFileTransferProgress: (callback: (progress: any) => void) => {
    const subscription = (_: any, prog: any) => callback(prog);
    ipcRenderer.on('file-transfer-progress', subscription);
    return () => ipcRenderer.removeListener('file-transfer-progress', subscription);
  }
});
