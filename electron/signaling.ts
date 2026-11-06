import { WebSocketServer, WebSocket } from 'ws';

export interface SignalingMessage {
  type: 'chat' | 'call-offer' | 'call-answer' | 'call-reject' | 'call-end' | 'ice-candidate';
  fromId: string;
  fromName: string;
  targetId?: string;
  data?: any;
}

export class SignalingService {
  private wss: WebSocketServer | null = null;
  private port = 41235;
  private onMessageCallback: (msg: SignalingMessage) => void;

  constructor(port: number, onMessage: (msg: SignalingMessage) => void) {
    this.port = port;
    this.onMessageCallback = onMessage;
  }

  public start() {
    this.tryListen(this.port);
  }

  private tryListen(targetPort: number) {
    try {
      this.wss = new WebSocketServer({ port: targetPort });

      this.wss.on('connection', (ws) => {
        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString()) as SignalingMessage;
            this.onMessageCallback(msg);
          } catch (e) {
            console.error('Invalid signaling message', e);
          }
        });
      });

      this.wss.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Signaling] Port ${targetPort} is in use, retrying on ${targetPort + 1}`);
          this.port = targetPort + 1;
          this.tryListen(this.port);
        } else {
          console.error('WebSocket server error:', err);
        }
      });
    } catch (e) {
      this.port = targetPort + 1;
      this.tryListen(this.port);
    }
  }

  public getPort(): number {
    return this.port;
  }

  public sendMessage(targetIp: string, targetPort: number, msg: SignalingMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${targetIp}:${targetPort}`;
      const client = new WebSocket(url);

      const timer = setTimeout(() => {
        client.terminate();
        reject(new Error('Connection timeout'));
      }, 4000);

      client.on('open', () => {
        client.send(JSON.stringify(msg), () => {
          clearTimeout(timer);
          client.close();
          resolve();
        });
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  public stop() {
    if (this.wss) {
      try { this.wss.close(); } catch (e) {}
      this.wss = null;
    }
  }
}
