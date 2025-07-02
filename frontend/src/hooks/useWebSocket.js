import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (sessionId) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`🔌 Connecting to WebSocket for session: ${sessionId}`);
    
    // Connect to WebSocket
    socketRef.current = new WebSocket(`wss://pingforge.onrender.com/ws/${sessionId}`);
    
    socketRef.current.onopen = () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    };

    socketRef.current.onmessage = (event) => {
      console.log('📨 WebSocket message received:', event.data);
      try {
        const newRequest = JSON.parse(event.data);
        setMessages(prev => [newRequest, ...prev]);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socketRef.current.onclose = () => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected');
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sessionId]);

  return { messages, isConnected };
};