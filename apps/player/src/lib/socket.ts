import { io, Socket } from 'socket.io-client';

export interface DrawNextEvent {
  seq: number;
  value: number;
}

export interface StateUpdateEvent {
  status: string;
  drawnNumbers: number[];
  winners: Array<{
    playerId: string;
    nickname: string;
    rank: number;
    pattern: string;
  }>;
}

export interface ClaimResultEvent {
  playerId: string;
  nickname: string;
  result: 'approved' | 'denied';
  rank?: number;
  pattern?: string;
  penalty?: {
    strikes: number;
    cooldownMs?: number;
  };
}

export interface PlayerPenaltyEvent {
  strikes: number;
  cooldownMs: number;
}

export interface MediaCueEvent {
  kind: 'number' | 'intro' | 'bingo';
}

export interface ServerToClientEvents {
  'draw:next': (data: DrawNextEvent) => void;
  'state:update': (data: StateUpdateEvent) => void;
  'claim:result': (data: ClaimResultEvent) => void;
  'player:penalty': (data: PlayerPenaltyEvent) => void;
  'media:cue': (data: MediaCueEvent) => void;
}

export interface ClientToServerEvents {}

class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private token: string | null = null;
  private url: string = import.meta.env.VITE_REALTIME_URL || 'http://localhost:4000';

  connect(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket?.connected && this.token === token) {
      return this.socket;
    }

    this.disconnect();
    this.token = token;

    this.socket = io(`${this.url}/player`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();