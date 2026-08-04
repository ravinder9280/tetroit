import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

/** Returns a lazily-created singleton socket connection. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(userId: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit("join", userId);
  }
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
