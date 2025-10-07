import { io, Socket } from "socket.io-client";

export interface ServerToClientEvents {
  "state:update": (data: any) => void;
  "draw:next": (data: { seq?: number; value: number; letter?: string }) => void;
  "claim:result": (data: any) => void;
  "media:cue": (data: { type: string; packId?: string; cueKey?: string; volume?: number; fadeInMs?: number }) => void;
  "player:join": (data: { player: any; totalCount?: number }) => void;
  "player:leave": (data: { playerId: string; totalCount?: number }) => void;
}

export interface ClientToServerEvents {}

export function connectSocket(ns: "/screen", token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const url = import.meta.env.VITE_REALTIME_URL as string;
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url + ns, { auth: { token } });
  return socket;
}
