"use client";

import { io } from "socket.io-client";

const isBrowser = typeof window !== "undefined";

// Your backend configuration
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const NAMESPACE = "/notifications";

let socket = null;

export const getSocket = (token) => {
  if (!isBrowser) return null;
  
  // Return existing socket if already connected
  if (socket && socket.connected) {
    return socket;
  }

  // Create new socket connection
  socket = io(`${SOCKET_URL}${NAMESPACE}`, {
    auth: {
      token: token, // JWT token from your auth system
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};