import { io, Socket } from "socket.io-client";

export interface ServerToClientEvents {
  "state:update": (data: any) => void;
  "draw:next": (data: { seq: number; value: number }) => void;
  "claim:result": (data: {
    nickname?: string;
    pattern?: string;
    result?: 'approved' | 'denied';
    win?: boolean;
    cardId?: number;
    claimId?: number
  }) => void;
}

export interface ClientToServerEvents {}

export function connectConsole(ns: "/console", token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const url = import.meta.env.VITE_REALTIME_URL as string;
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url + ns, { auth: { token } });
  return socket;
}