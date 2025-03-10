export interface Message {
  userName: string;
  message: string;
  createdAt: string
};


export interface Messages {
  messages: Message[];
  lastEvaluatedKey: string | null;
  totalMessages: number;
};

interface RegisterMessagePayload {
  userName?: string;
}

interface MessagePayload {
  message?: string;
  lastEvaluatedKey?: string;
}

export interface WebSocketData {
  command: string;
  payload?: RegisterMessagePayload | MessagePayload
}