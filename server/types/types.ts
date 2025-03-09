import { AttributeValue } from "@aws-sdk/client-dynamodb";


interface Message {
  userName: string;
  message: string;
  createdAt: string
};


export interface Messages {
  messages: Message[];
  lastEvaluatedKey: Record<string, AttributeValue> | null;
};

export interface NewMessageEvent {
  createdAt: string;
  message: string;
  userName: string;
};
