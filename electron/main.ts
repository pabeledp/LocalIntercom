import { app, BrowserWindow, ipcMain, screen, globalShortcut, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DiscoveryService, Peer } from './discovery';
import { SignalingService, SignalingMessage } from './signaling';
import { ConfigStore } from './store';
import { HeavyFileTransferService, TransferProgress } from './fileTransfer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.join(__dirname, '../dist');
process.env.DIST = DIST_PATH;

let win: BrowserWindow | null = null;
let discoveryService: DiscoveryService | null = null;
let signalingService: SignalingService | null = null;
let configStore: ConfigStore | null = null;
let fileTransferService: HeavyFileTransferService | null = null;

const BUBBLE_SIZE = { width: 72, height: 72 };
const EXPANDED_SIZE = { width: 420, height: 600 };
const FILE_PORT = 41236;

function createWindow() {
  configStore = new ConfigStore();
  const profile = configStore.getProfile();

  // If user hasn't set up name, open expanded setup. If already set, open bubble!
  const isSetupNeeded = !profile.name;
  const initialWidth = isSetupNeeded ? EXPANDED_SIZE.width : BUBBLE_SIZE.width;
  const initialHeight = isSetupNeeded ? EXPANDED_SIZE.height : BUBBLE_SIZE.height;

  win = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Always float on top of every full-screen app & desktop on macOS
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  win.setPosition(screenWidth - initialWidth - 40, 120);

  const indexPath = path.join(DIST_PATH, 'index.html');
  win.loadFile(indexPath);

  win.show();
  win.focus();

  // File Transfer Engine with auto-port fallback
  const downloadDir = path.join(app.getPath('downloads'), 'IntercomTransfers');
  fileTransferService = new HeavyFileTransferService(FILE_PORT, downloadDir, (progress: TransferProgress) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('file-transfer-progress', progress);
    }
  });
  fileTransferService.start();

  // UDP Peer Discovery
  discoveryService = new DiscoveryService((peers: Peer[]) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('peers-updated', peers);
    }
  });

  // Local Signaling & Chat with auto-port fallback
  signalingService = new SignalingService(profile.port, (msg: SignalingMessage) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('signaling-message', msg);
    }
  });

  if (profile.name) {
    discoveryService.setProfile(profile);
    discoveryService.start();
    signalingService.start();
  }

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}

// IPC Handlers
ipcMain.handle('get-profile', () => configStore?.getProfile());

ipcMain.handle('save-profile', (_, profileData) => {
  if (configStore) {
    configStore.save(profileData);
    const updated = configStore.getProfile();
    discoveryService?.setProfile(updated);
    discoveryService?.start();
    signalingService?.start();
    return updated;
  }
});

ipcMain.on('set-expanded', (_, expanded: boolean) => {
  if (!win) return;
  const currentBounds = win.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  if (expanded) {
    let newX = currentBounds.x;
    let newY = currentBounds.y;

    if (newX + EXPANDED_SIZE.width > screenWidth) {
      newX = screenWidth - EXPANDED_SIZE.width - 20;
    }
    if (newY + EXPANDED_SIZE.height > screenHeight) {
      newY = screenHeight - EXPANDED_SIZE.height - 20;
    }
    win.setBounds({ x: Math.max(10, newX), y: Math.max(10, newY), width: EXPANDED_SIZE.width, height: EXPANDED_SIZE.height }, true);
  } else {
    const midX = currentBounds.x + BUBBLE_SIZE.width / 2;
    const snapX = midX > screenWidth / 2 ? screenWidth - BUBBLE_SIZE.width - 15 : 15;
    win.setBounds({ x: snapX, y: currentBounds.y, width: BUBBLE_SIZE.width, height: BUBBLE_SIZE.height }, true);
  }
});

ipcMain.on('window-drag', (_, { deltaX, deltaY }) => {
  if (!win) return;
  const pos = win.getPosition();
  win.setPosition(pos[0] + deltaX, pos[1] + deltaY);
});

ipcMain.on('window-snap-edge', () => {
  if (!win) return;
  const bounds = win.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const snapX = bounds.x + bounds.width / 2 > screenWidth / 2 
    ? screenWidth - bounds.width - 15 
    : 15;

  win.setPosition(snapX, bounds.y, true);
});

ipcMain.handle('send-signaling', async (_, { ip, port, message }) => {
  if (signalingService) {
    try {
      await signalingService.sendMessage(ip, port, message);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Signaling service not active' };
});

ipcMain.handle('select-file-dialog', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: 'Select Large File (up to 80GB)'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return fileTransferService?.registerFileForTransfer(filePath);
});

ipcMain.handle('register-file', (_, filePath: string) => {
  return fileTransferService?.registerFileForTransfer(filePath);
});

ipcMain.handle('start-file-download', (_, { targetIp, fileId, fileName, totalSize, peerId }) => {
  fileTransferService?.startDownload(targetIp, FILE_PORT, fileId, fileName, totalSize, peerId);
  return { success: true };
});

ipcMain.handle('cancel-file-transfer', (_, fileId: string) => {
  fileTransferService?.cancelTransfer(fileId);
  return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  discoveryService?.stop();
  signalingService?.stop();
  fileTransferService?.stop();
});
