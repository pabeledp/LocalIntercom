import dgram from 'dgram';
import { networkInterfaces } from 'os';

export interface Peer {
  id: string;
  name: string;
  avatar: string;
  os: string;
  ip: string;
  port: number;
  lastSeen: number;
}

export class DiscoveryService {
  private socket: dgram.Socket | null = null;
  private broadcastPort = 41234;
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private peers: Map<string, Peer> = new Map();
  private onPeersUpdate: (peers: Peer[]) => void;

  private userProfile = {
    id: '',
    name: '',
    avatar: 'avatar-1',
    port: 41235
  };

  constructor(onPeersUpdate: (peers: Peer[]) => void) {
    this.onPeersUpdate = onPeersUpdate;
  }

  public setProfile(profile: { id: string; name: string; avatar: string; port: number }) {
    this.userProfile = profile;
  }

  public start() {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', (err) => {
      console.error('UDP Socket error:', err);
    });

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.id === this.userProfile.id) return; // Ignore self

        const peer: Peer = {
          id: data.id,
          name: data.name,
          avatar: data.avatar || 'avatar-1',
          os: data.os || 'unknown',
          ip: rinfo.address,
          port: data.port,
          lastSeen: Date.now()
        };

        this.peers.set(peer.id, peer);
        this.emitPeers();
      } catch (e) {
        // Ignore invalid packets
      }
    });

    this.socket.bind(this.broadcastPort, () => {
      if (this.socket) {
        this.socket.setBroadcast(true);
      }
    });

    // Send broadcast heartbeats every 3 seconds
    this.intervalId = setInterval(() => {
      this.sendBroadcast();
    }, 3000);

    // Prune stale peers every 5 seconds (timeout after 10s)
    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > 10000) {
          this.peers.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.emitPeers();
      }
    }, 5000);
  }

  private sendBroadcast() {
    if (!this.socket || !this.userProfile.id) return;

    const payload = JSON.stringify({
      id: this.userProfile.id,
      name: this.userProfile.name,
      avatar: this.userProfile.avatar,
      os: process.platform,
      port: this.userProfile.port
    });

    const msg = Buffer.from(payload);
    // Broadcast to global subnet
    this.socket.send(msg, 0, msg.length, this.broadcastPort, '255.255.255.255', (err) => {
      if (err) {
        // fallback to local interfaces broadcast if needed
      }
    });
  }

  private emitPeers() {
    this.onPeersUpdate(Array.from(this.peers.values()));
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
    if (this.socket) {
      try { this.socket.close(); } catch (e) {}
      this.socket = null;
    }
  }
}
