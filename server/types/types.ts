import { AttributeValue } from "@aws-sdk/client-dynamodb";


export interface Message {
  userName: string;
  message: string;
  createdAt: string
};


export interface Messages {
  messages: Message[];
  lastEvaluatedKey: Record<string, AttributeValue> | null;
  totalMessages: number;
};

export interface NewMessageEvent {
  createdAt: string;
  message: string;
  userName: string;
};
