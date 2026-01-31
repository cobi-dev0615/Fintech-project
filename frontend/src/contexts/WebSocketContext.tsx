import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketMessage {
  type: string;
  message?: string;
  timestamp?: string;
  [key: string]: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketContextType {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (handler: MessageHandler) => () => void;
  send: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Singleton WebSocket manager - maintains one connection across the app
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private token: string | null = null;
  private userId: string | null = null;
  private userRole: string | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
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
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'ws://localhost:5000/ws';
    }
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      const protocol = origin.startsWith('https') ? 'wss' : 'ws';
      // Use origin as base, Nginx handles /ws -> 5000
      // For production, use the same origin to avoid CORS/SSL issues
      return `${protocol}://${hostname}/ws`;
    } catch {
      return 'ws://localhost:5000/ws';
    }
  }

  connect(userId: string, userRole: string) {
    // Connect for admin, consultant, and customer (for real-time messaging)
    const allowedRoles = ['admin', 'consultant', 'customer'];
    if (!allowedRoles.includes(userRole)) {
      return;
    }

    // If already connected or connecting, don't reconnect
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      // Update user info if connection exists
      this.userId = userId;
      this.userRole = userRole;
      return;
    }

    // Get token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('No auth token found for WebSocket connection');
      return;
    }

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
      // Log connection attempts in development, or if this is a retry
      if (process.env.NODE_ENV === 'development' || this.reconnectAttempts > 0) {
        console.log('Connecting to WebSocket:', wsUrlWithToken.replace(/\?token=[^&]+/, '?token=***'));
      }
      
      this.ws = new WebSocket(wsUrlWithToken);
      
      this.ws.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket connected successfully');
        }
        this.connected = true;
        this.reconnectAttempts = 0;
        if (this.setConnected) {
          this.setConnected(true);
        }
        
        // Authenticate with user info
        if (this.userId && this.userRole) {
          this.ws?.send(JSON.stringify({
            type: 'authenticate',
            userId: this.userId,
            role: this.userRole,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'authenticated') {
            if (process.env.NODE_ENV === 'development') {
              console.log('WebSocket authenticated');
            }
          } else {
            this.lastMessage = message;
            if (this.setLastMessage) {
              this.setLastMessage(message);
            }
            // Notify all subscribers
            this.handlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('Error in WebSocket message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Log error details for debugging (especially in development)
        if (process.env.NODE_ENV === 'development') {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL:', this.url);
          console.error('Connection state:', this.ws?.readyState);
        }
        this.connected = false;
        if (this.setConnected) {
          this.setConnected(false);
        }
      };

      this.ws.onclose = (event) => {
        // Log connection close details for debugging
        const errorInfo = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          url: this.url,
        };
        
        // Error code meanings:
        // 1000 = Normal Closure
        // 1006 = Abnormal Closure (often 504 Gateway Timeout from nginx)
        // 1008 = Policy Violation (authentication failed)
        // 1011 = Internal Server Error
        
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket disconnected:', errorInfo);
        } else if (event.code !== 1006 && event.code !== 1000) {
          // In production, only log non-common errors
          console.warn('WebSocket disconnected:', errorInfo);
        }
        
        this.connected = false;
        this.ws = null;
        if (this.setConnected) {
          this.setConnected(false);
        }

        // Only reconnect if not intentionally closed and we haven't exceeded max attempts
        // 1006 = Abnormal Closure (often 504 Gateway Timeout), still try to reconnect
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3); // Exponential backoff, max 3x
          
          if (process.env.NODE_ENV === 'development' || (event.code !== 1006 && this.reconnectAttempts <= 2)) {
            console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          }
          
          this.reconnectTimeout = setTimeout(() => {
            this.doConnect();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(
            'WebSocket: Max reconnection attempts reached. ' +
            'This is likely due to nginx/proxy configuration. ' +
            'Please ensure the /ws location block in nginx has the correct WebSocket proxy settings. ' +
            'See WEBSOCKET_NGINX_CONFIG.md for configuration details.'
          );
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      console.error('WebSocket URL:', this.url);
      this.connected = false;
      if (this.setConnected) {
        this.setConnected(false);
      }
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
    if (this.setConnected) {
      this.setConnected(false);
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent:', message);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getLastMessage(): WebSocketMessage | null {
    return this.lastMessage;
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Set state callbacks in manager
  useEffect(() => {
    wsManager.setStateCallbacks(setConnected, setLastMessage);
  }, []);

  // Connect/disconnect based on user authentication
  useEffect(() => {
    if (user && user.id && user.role) {
      wsManager.connect(user.id, user.role);
    } else {
      wsManager.disconnect();
    }

    // Cleanup on unmount or user change
    return () => {
      // Don't disconnect here - we want to keep connection alive during navigation
      // Only disconnect when user logs out
      if (!user || !user.id) {
        wsManager.disconnect();
      }
    };
  }, [user?.id, user?.role]);

  const subscribe = useCallback((handler: MessageHandler) => {
    return wsManager.subscribe(handler);
  }, []);

  const send = useCallback((message: any) => {
    wsManager.send(message);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: WebSocketContextType = useMemo(() => ({
    connected,
    lastMessage,
    subscribe,
    send,
  }), [connected, lastMessage, subscribe, send]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(handler?: MessageHandler) {
  const context = useContext(WebSocketContext);
  
  // Provide a default context if not available (shouldn't happen, but defensive)
  if (!context) {
    console.warn('useWebSocket called outside WebSocketProvider, returning default context');
    return {
      connected: false,
      lastMessage: null,
      subscribe: () => () => {},
      send: () => {},
    };
  }

  // Subscribe to messages if handler provided
  useEffect(() => {
    if (handler && context) {
      return context.subscribe(handler);
    }
  }, [context, handler]);

  return context;
}
