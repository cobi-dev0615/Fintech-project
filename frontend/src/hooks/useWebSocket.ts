import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  message?: string;
  timestamp?: string;
  [key: string]: any;
}

export function useWebSocket(url: string, onMessage?: (message: WebSocketMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!user || user.role !== 'admin') {
      return; // Only connect for admin users
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found for WebSocket connection');
        return;
      }

      // Get WebSocket URL based on current origin
      const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrlWithToken = `${wsUrl}?token=${token}`;
      
      const ws = new WebSocket(wsUrlWithToken);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        
        // Authenticate with user info
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id,
          role: user.role,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'authenticated') {
            console.log('WebSocket authenticated');
          } else if (message.type === 'metrics_updated' || message.type === 'metrics_refresh') {
            setLastMessage(message);
            if (onMessage) {
              onMessage(message);
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Attempt to reconnect after 3 seconds
        if (user && user.role === 'admin') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, user, onMessage]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, connect]);

  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    connected,
    lastMessage,
    send,
  };
}

