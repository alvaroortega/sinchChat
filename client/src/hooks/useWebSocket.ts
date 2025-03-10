import { useEffect, useState, useCallback, useRef } from "react";
import { WebSocketData, Messages } from "../types/types";

const WS_URL = "ws://127.0.0.1:8080"; // This should be a configurable URL on deployment

export interface UseWebSocketParams {
  messages: Messages | null;
  sendMessage: (message: WebSocketData) => void;
  userName: string;
  setUserName: (userName: string) => void;
  error: string | null;
  socketError: boolean;
  setSocketError: (socketError: boolean) => void;
  userLoggedIn: boolean;
};

export function useWebSocket(): UseWebSocketParams {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [userName, setUserName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [socketError, setSocketError] = useState<boolean>(false)
  const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false)

  const messagesRef = useRef<Messages | null>(null);

  const sendMessage = useCallback((message: WebSocketData) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!userName) {
      return;
    }

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      socket.send(JSON.stringify({ command: "SIGN_IN", payload: { userName } }));
    };

    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "SIGNED_IN":
          setUserLoggedIn(true);
          setMessages({
            lastEvaluatedKey: data.data.lastEvaluatedKey,
            messages: data.data.messages,
            totalMessages: data.data.totalMessages
          });
          break;
        case "SIGNED_OUT":
          setUserName("");
          break;
        case "NEW_MESSAGE_CREATED":
          setMessages({
            lastEvaluatedKey: messagesRef.current?.lastEvaluatedKey || null,
            messages: [...(messagesRef.current?.messages || []), data.data],
            totalMessages: (messagesRef.current?.totalMessages || 0) + 1
          });
          break;
        case "MESSAGE_HISTORY":
          setMessages({
            lastEvaluatedKey: data.lastEvaluatedKey,
            messages: [...data.messages, ...(messagesRef.current?.messages || [])],
            totalMessages: data.totalMessages
          });
          break;
        case "DISCUSSION_UPDATED":
          setMessages({
            lastEvaluatedKey: messagesRef.current?.lastEvaluatedKey || null,
            messages: [...(messagesRef.current?.messages || []), data.data],
            totalMessages: (messagesRef.current?.totalMessages || 0) + 1
          });
          break;
        case "ERROR":
          setError(data.message);
          break;
      }
    };

    socket.onerror = () => {
      setUserName("");
      setUserLoggedIn(false);
      setSocketError(true)
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [userName]);

  return {
    messages,
    sendMessage,
    userName,
    setUserName,
    error,
    socketError,
    setSocketError,
    userLoggedIn
  };
}
