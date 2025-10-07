import { io, Socket } from "socket.io-client";

export interface ServerToClientEvents {
  "state:update": (data: any) => void;
  "draw:next": (data: { seq?: number; value: number }) => void;
  "claim:result": (data: {
    nickname?: string;
    pattern?: string;
    result?: 'approved' | 'denied';
    win?: boolean;
    cardId?: number;
    claimId?: number;
  }) => void;
  "media:cue": (data: { type: string; packId?: string; cueKey?: string; volume?: number; fadeInMs?: number }) => void;
  "player:join": (data: { player: any; totalCount?: number }) => void;
  "player:leave": (data: { playerId: string; totalCount?: number }) => void;
}

export interface ClientToServerEvents {}

export function connectConsole(ns: "/console", token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const url = import.meta.env.VITE_REALTIME_URL as string;
  return io(url + ns, { auth: { token } });
}
