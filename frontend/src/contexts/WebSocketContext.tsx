import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketMessage {
  type: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketContextType {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (handler: MessageHandler) => () => void;
  send: (message: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private token: string | null = null;
  private userId: string | null = null;
  private userRole: string | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isIntentionallyClosed = false;

  private connected = false;
  private lastMessage: WebSocketMessage | null = null;
  private setConnected: ((connected: boolean) => void) | null = null;
  private setLastMessage: ((message: WebSocketMessage | null) => void) | null = null;

  setStateCallbacks(setConnected: (connected: boolean) => void, setLastMessage: (message: WebSocketMessage | null) => void) {
    this.setConnected = setConnected;
    this.setLastMessage = setLastMessage;
  }

  private getWebSocketUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'ws://localhost:5000/ws';
    }
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      const protocol = origin.startsWith('https') ? 'wss' : 'ws';
      return `${protocol}://${hostname}/ws`;
    } catch {
      return 'ws://localhost:5000/ws';
    }
  }

  connect(userId: string, userRole: string) {
    const allowedRoles = ['admin', 'consultant', 'customer'];
    if (!allowedRoles.includes(userRole)) return;

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.userId = userId;
      this.userRole = userRole;
      return;
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    this.token = token;
    this.userId = userId;
    this.userRole = userRole;
    this.url = this.getWebSocketUrl();
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  private doConnect() {
    if (!this.url || !this.token) return;

    try {
      const wsUrlWithToken = `${this.url}?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrlWithToken);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.setConnected?.(true);
        if (this.userId && this.userRole) {
          this.ws?.send(JSON.stringify({ type: 'authenticate', userId: this.userId, role: this.userRole }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type !== 'authenticated') {
            this.lastMessage = message;
            this.setLastMessage?.(message);
            this.handlers.forEach((handler) => {
              try {
                handler(message);
              } catch (err) {
                console.error('Error in WebSocket message handler:', err);
              }
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = () => {
        this.connected = false;
        this.setConnected?.(false);
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        this.ws = null;
        this.setConnected?.(false);

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3);
          this.reconnectTimeout = setTimeout(() => this.doConnect(), delay);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      this.connected = false;
      this.setConnected?.(false);
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
    this.setConnected?.(false);
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  getLastMessage(): WebSocketMessage | null {
    return this.lastMessage;
  }
}

const wsManager = new WebSocketManager();

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    wsManager.setStateCallbacks(setConnected, setLastMessage);
  }, []);

  useEffect(() => {
    if (user?.id && user?.role) {
      wsManager.connect(user.id, user.role);
    } else {
      wsManager.disconnect();
    }
    return () => {
      if (!user?.id) wsManager.disconnect();
    };
  }, [user?.id, user?.role]);

  const subscribe = useCallback((handler: MessageHandler) => wsManager.subscribe(handler), []);
  const send = useCallback((message: unknown) => wsManager.send(message), []);

  const contextValue = useMemo(
    () => ({ connected, lastMessage, subscribe, send }),
    [connected, lastMessage, subscribe, send]
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(handler?: MessageHandler) {
  const context = useContext(WebSocketContext);

  if (!context) {
    return {
      connected: false,
      lastMessage: null,
      subscribe: () => () => {},
      send: () => {},
    };
  }

  useEffect(() => {
    if (handler && context) {
      return context.subscribe(handler);
    }
  }, [context, handler]);

  return context;
}
