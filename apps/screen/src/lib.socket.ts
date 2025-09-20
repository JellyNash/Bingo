import { io, Socket } from "socket.io-client";

export interface ServerToClientEvents {
  "state:update": (data: { connected: boolean; ns: string; role?: string; room: string }) => void;
  "draw:next": (data: { seq: number; value: number }) => void;
  "claim:result": (data: any) => void;
  "media:cue": (data: {
    type: 'number' | 'bingo' | 'stinger' | 'intro' | 'music:start' | 'music:stop' | 'music:toggle';
    number?: number;
  }) => void;
}

export interface ClientToServerEvents {}

export function connectSocket(ns: "/screen", token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const url = import.meta.env.VITE_REALTIME_URL as string;
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url + ns, { auth: { token } });
  return socket;
}