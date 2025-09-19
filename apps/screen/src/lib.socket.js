import { io } from "socket.io-client";
export function connectSocket(ns, token) {
    const url = import.meta.env.VITE_REALTIME_URL;
    const socket = io(url + ns, { auth: { token } });
    return socket;
}
