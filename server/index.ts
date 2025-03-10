import WebSocket, { WebSocketServer } from "ws";
import { Redis } from "ioredis";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import socketManager from "./SocketManager.ts";
import UserRegisterService from "./services/UserRegisterService.ts"
import MessagesService from "./services/MessagesService.ts";
import type { Message, NewMessageEvent } from "./types/types.ts";

interface UserPayload {
  userName?: string;
}

interface DiscussionPayload {
  message?: string;
  lastEvaluatedKey?: string;
}

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });
console.log(`WebSocket server listening on port ${PORT}`);

const userRegService = new UserRegisterService();
const messService = new MessagesService();

const redisSubscriber = new Redis({ host: "localhost", port: 6379 });

const sortMessages = (messages: Message[]): Message[] => {
  return messages.slice().sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

async function handleUserRegistration(ws: WebSocket, command: string, payload: UserPayload) {
  switch (command) {
    case "SIGN_IN":
      try {
        const { userName = "" } = payload;
        await userRegService.registerUser(ws, userName);
        await socketManager.addUser(userName, ws);
        const newestMessages = await messService.fetchMessages(10);
        ws.send(JSON.stringify({
          type: "SIGNED_IN",
          data: {
            ...newestMessages,
            lastEvaluatedKey: JSON.stringify(newestMessages.lastEvaluatedKey),
            messages: sortMessages(newestMessages.messages)
          }
        }))
      } catch (error) {
        ws.send(JSON.stringify({
          type: "ERROR",
          mesage: error.message
        }));
      }
      break;
    case "SIGN_OUT":
      const user = await userRegService.getUsername(ws);
      if (!user) {
        ws.send(JSON.stringify({
          type: "ERROR",
          mesage: "User does not exists"
        }));
      } else {
        try {
          await userRegService.deleteUser(ws);
          await socketManager.removeUser(user);
          ws.send(JSON.stringify({
            type: "SIGNED_OUT",
            message: `${user} logged out`
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: "ERROR",
            message: `${user} could not be logged out properly`
          }));
        }
      }
      break;
    default:
      ws.send(JSON.stringify({
        type: "ERROR",
        mesage: "Unknown command"
      }));
  }
}

async function handleDiscussionsCommands(ws: WebSocket, command: string, payload: DiscussionPayload) {
  switch (command) {
    case "NEW_MESSAGE":
      try {
        const { message = "" } = payload
        const userName = await userRegService.getUsername(ws);

        if (!userName) {
          ws.send(JSON.stringify({
            type: "ERROR",
            mesage: "User must be authenticated"
          }));
          return;
        }

        const { createdAt } = await messService.createMessage(message, userName);
        ws.send(JSON.stringify({
          type: "NEW_MESSAGE_CREATED",
          data: {
            message, userName, createdAt
          }
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "ERROR",
          mesage: error.message
        }));
      }
      break;

    case "GET_MORE_MESSAGES":
      try {
        let lastKey: Record<string, AttributeValue> | undefined = undefined;
        if (payload.lastEvaluatedKey) {
          lastKey = JSON.parse(payload.lastEvaluatedKey);
        }

        const nextBatch = await messService.fetchMessages(10, lastKey);
        ws.send(JSON.stringify({
          type: "MESSAGE_HISTORY",
          messages: sortMessages(nextBatch.messages),
          lastEvaluatedKey: nextBatch.lastEvaluatedKey
            ? JSON.stringify(nextBatch.lastEvaluatedKey)
            : null,
          totalMessages: nextBatch.totalMessages
        }));

      } catch (error) {
        ws.send(JSON.stringify({
          type: "ERROR",
          mesage: error.message
        }));
      }
      break;
    default:
      ws.send(JSON.stringify({
        type: "ERROR",
        mesage: "Unknown command"
      }));
  }
}

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", async data => {
    try {
      const parsedData = JSON.parse(data);
      const { command, payload } = parsedData;

      if (["SIGN_IN", "SIGN_OUT"].includes(command)) {
        await handleUserRegistration(ws, command, payload);
      } else if (["NEW_MESSAGE", "GET_MORE_MESSAGES"].includes(command)) {
        await handleDiscussionsCommands(ws, command, payload);
      } else {
        ws.send(JSON.stringify({
          type: "ERROR",
          mesage: "Invalid command"
        }));
      }
    } catch (error) {
      console.error("Invalid message format:", error);
      ws.send(JSON.stringify({
        type: "ERROR",
        message: "Invalid message format"
      }));
    }
  });

  ws.on("close", async () => {
    console.log("Client disconnected");
    await userRegService.deleteUser(ws);
  });

  ws.on("error", async err => {
    console.error(`WebSocket error: ${err.message}`);
    await userRegService.deleteUser(ws);
  });
})

export async function closeServer() {
  wss.close();
  await redisSubscriber.quit();
  await messService.disconnectRedis();
}

process.on("SIGTERM", async () => {
  await closeServer()
});

redisSubscriber.subscribe("new_message_created", (err, count) => {
  if (err) {
    console.error("Error subscribing to new_message_created channel:", err);
  } else {
    console.log(`Subscribed to new_message_created channel (${count} subscriptions)`);
  }
});

redisSubscriber.on("message", (channel: string, data: string) => {
  if (channel === "new_message_created") {
    try {
      const { createdAt, message, userName } = JSON.parse(data) as NewMessageEvent;
      const activeUserNamesIterator = socketManager.getActiveUserNames();
      for (const user of activeUserNamesIterator) {
        if (user !== userName) {
          const ws = socketManager.getUserSocket(user);
          if (ws) {
            ws.send(JSON.stringify({
              type: "DISCUSSION_UPDATED",
              data: { createdAt, message, userName }
            }));
          } else {
            console.error(`No active socket for user ${userName}`);
          }
        }
      }
    } catch (error) {
      console.error("Error processing new_message_created event:", error);
    }
  }
});
