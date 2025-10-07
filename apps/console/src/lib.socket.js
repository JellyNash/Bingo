import { io } from "socket.io-client";
export function connectConsole(ns, token) {
    const url = import.meta.env.VITE_REALTIME_URL;
    return io(url + ns, { auth: { token } });
}
