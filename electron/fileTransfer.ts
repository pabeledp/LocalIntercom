import fs from 'fs';
import http from 'http';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

export class HeavyFileTransferService {
  private port: number;
  private server: http.Server | null = null;
  private saveDir: string;
  private onProgress: (progress: TransferProgress) => void;

  private offeredFiles: Map<string, { filePath: string; fileName: string; fileSize: number }> = new Map();
  private activeTransfers: Map<string, TransferProgress> = new Map();
  private activeClients: Map<string, http.ClientRequest> = new Map();

  constructor(port: number, saveDir: string, onProgress: (progress: TransferProgress) => void) {
    this.port = port;
    this.saveDir = saveDir;
    this.onProgress = onProgress;

    if (!fs.existsSync(this.saveDir)) {
      try {
        fs.mkdirSync(this.saveDir, { recursive: true });
      } catch (e) {
        console.error('Failed to create download directory:', e);
      }
    }
  }

  public start() {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      if (req.method === 'GET' && url.pathname.startsWith('/download/')) {
        const fileId = url.pathname.replace('/download/', '');
        const fileInfo = this.offeredFiles.get(fileId);

        if (!fileInfo || !fs.existsSync(fileInfo.filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found or expired');
          return;
        }

        const range = req.headers.range;
        const totalSize = fileInfo.fileSize;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunkSize = end - start + 1;

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`
          });

          const fileStream = fs.createReadStream(fileInfo.filePath, { start, end, highWaterMark: 8 * 1024 * 1024 });
          fileStream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': totalSize,
            'Accept-Ranges': 'bytes',
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`
          });

          const fileStream = fs.createReadStream(fileInfo.filePath, { highWaterMark: 8 * 1024 * 1024 });
          fileStream.pipe(res);
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Gracefully handle EADDRINUSE without crashing the app!
    this.server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[FileEngine] Port ${this.port} is busy, retrying on next port...`);
        this.port += 1;
        this.server?.listen(this.port);
      } else {
        console.error('[FileEngine] Server error:', err);
      }
    });

    this.server.listen(this.port, () => {
      console.log(`[FileEngine] Heavy file transfer server listening on port ${this.port}`);
    });
  }

  public getPort(): number {
    return this.port;
  }

  public registerFileForTransfer(filePath: string): { fileId: string; fileName: string; fileSize: number } {
    const stats = fs.statSync(filePath);
    const fileId = uuidv4();
    const fileName = path.basename(filePath);
    this.offeredFiles.set(fileId, { filePath, fileName, fileSize: stats.size });
    return { fileId, fileName, fileSize: stats.size };
  }

  public startDownload(
    targetIp: string,
    targetPort: number,
    fileId: string,
    fileName: string,
    totalSize: number,
    peerId: string
  ) {
    const localFilePath = path.join(this.saveDir, fileName);
    let startByte = 0;

    if (fs.existsSync(localFilePath)) {
      const stats = fs.statSync(localFilePath);
      if (stats.size < totalSize) {
        startByte = stats.size;
      } else if (stats.size === totalSize) {
        return;
      }
    }

    const headers: Record<string, string> = {};
    if (startByte > 0) {
      headers['Range'] = `bytes=${startByte}-`;
    }

    const options = {
      hostname: targetIp,
      port: targetPort,
      path: `/download/${fileId}`,
      method: 'GET',
      headers
    };

    let transferred = startByte;
    let lastBytes = transferred;
    let lastTime = Date.now();

    const progress: TransferProgress = {
      id: fileId,
      fileName,
      fileSize: totalSize,
      transferredBytes: transferred,
      progressPercent: Math.round((transferred / totalSize) * 100),
      speedMbps: 0,
      etaSeconds: 0,
      status: 'transferring',
      direction: 'download',
      peerId
    };

    this.activeTransfers.set(fileId, progress);
    this.onProgress(progress);

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200 && res.statusCode !== 206) {
        progress.status = 'failed';
        this.onProgress(progress);
        return;
      }

      const fileStream = fs.createWriteStream(localFilePath, {
        flags: startByte > 0 ? 'a' : 'w',
        highWaterMark: 8 * 1024 * 1024
      });

      const speedTimer = setInterval(() => {
        const now = Date.now();
        const durationSec = (now - lastTime) / 1000;
        if (durationSec > 0.5) {
          const deltaBytes = transferred - lastBytes;
          const speedBytesPerSec = deltaBytes / durationSec;
          progress.speedMbps = Math.round((speedBytesPerSec * 8) / (1024 * 1024));
          const remainingBytes = totalSize - transferred;
          progress.etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;
          progress.transferredBytes = transferred;
          progress.progressPercent = Math.min(100, Math.round((transferred / totalSize) * 100));

          lastBytes = transferred;
          lastTime = now;
          this.onProgress(progress);
        }
      }, 500);

      res.on('data', (chunk) => {
        transferred += chunk.length;
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        clearInterval(speedTimer);
        progress.transferredBytes = totalSize;
        progress.progressPercent = 100;
        progress.status = 'completed';
        progress.speedMbps = 0;
        progress.etaSeconds = 0;
        this.onProgress(progress);
        this.activeClients.delete(fileId);
      });

      res.on('error', () => {
        clearInterval(speedTimer);
        progress.status = 'failed';
        this.onProgress(progress);
        this.activeClients.delete(fileId);
      });
    });

    req.on('error', () => {
      progress.status = 'failed';
      this.onProgress(progress);
      this.activeClients.delete(fileId);
    });

    this.activeClients.set(fileId, req);
    req.end();
  }

  public cancelTransfer(fileId: string) {
    const client = this.activeClients.get(fileId);
    if (client) {
      client.destroy();
      this.activeClients.delete(fileId);
    }
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.status = 'paused';
      this.onProgress(transfer);
    }
  }

  public stop() {
    for (const client of this.activeClients.values()) {
      client.destroy();
    }
    this.activeClients.clear();
    if (this.server) {
      try { this.server.close(); } catch (e) {}
      this.server = null;
    }
  }
}
