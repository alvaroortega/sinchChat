import WebSocket, { WebSocketServer } from "ws";
import { Redis } from "ioredis";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import socketManager from "./SocketManager.ts";
import UserRegisterService from "./services/UserRegisterService.ts"
import MessagesService from "./services/MessagesService.ts";
import type { NewMessageEvent } from "./types/types.ts";

interface UserPayload {
  userName?: string;
}

interface NewMessagePayload {
  message: string;
  lastEvaluatedKey?: string;
}

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });
console.log(`WebSocket server listening on port ${PORT}`);

const userRegService = new UserRegisterService();
const messService = new MessagesService();

const redisSubscriber = new Redis({ host: "localhost", port: 6379 });

async function handleUserRegistration(ws: WebSocket, command: string, payload: UserPayload) {
  const { userName = "" } = payload;
  switch (command) {
    case "SIGN_IN":
      try {
        await userRegService.registerUser(ws, userName);
        await socketManager.addUser(userName, ws);
        const newestMessages = await messService.fetchMessages();
        ws.send(`${newestMessages}\n`);
      } catch (error) {
        ws.send(`ERROR: ${error}\n`);
      }
      break;
    case "SIGN_OUT":
      const user = await userRegService.getUsername(ws);
      if (!user) {
        ws.send("ERROR: User does not exists\n");
      } else {
        await userRegService.deleteUser(ws);
        await socketManager.removeUser(user);
        ws.send(`${user} logged out\n`);
      }
      break;
    default:
      ws.send("ERROR: Unknown command\n");
  }
}

async function handleDiscussionsCommands(ws: WebSocket, command: string, payload: NewMessagePayload) {
  const { message } = payload
  switch (command) {
    case "NEW_MESSAGE":
      try {
        const userName = await userRegService.getUsername(ws);

        if (!userName) {
          ws.send("ERROR: User must be authenticated\n");
          return;
        }

        await messService.createMessage(message, userName);
        ws.send("Message created\n");
      } catch (error) {
        ws.send(`ERROR: ${error}\n`);
      }
      break;

    case "GET_MORE_MESSAGES":
      try {
        let lastKey: Record<string, AttributeValue> | undefined = undefined;
        if (payload.lastEvaluatedKey) {
          lastKey = JSON.parse(Buffer.from(payload.lastEvaluatedKey, "base64").toString());
        }

        const nextBatch = await messService.fetchMessages(50, lastKey);
        ws.send(JSON.stringify({
          type: "message_history",
          messages: nextBatch.messages,
          lastEvaluatedKey: nextBatch.lastEvaluatedKey
            ? Buffer.from(JSON.stringify(nextBatch.lastEvaluatedKey)).toString("base64")
            : null
        }));

      } catch (error) {
        ws.send(`ERROR: ${error}\n`);
      }
      break;
    default:
      ws.send("ERROR: Unknown command\n");
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
        ws.send(JSON.stringify({ type: "error", message: "invalid command" }));
      }
    } catch (error) {
      console.error("Invalid message format:", error);
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
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
      for (const userName of activeUserNamesIterator) {
        const ws = socketManager.getUserSocket(userName);
        if (ws) {
          ws.send(`DISCUSSION_UPDATED|${JSON.stringify({ createdAt, message, userName })}\n`);
        } else {
          console.error(`No active socket for user ${userName}`);
        }
      }
    } catch (error) {
      console.error("Error processing new_message_created event:", error);
    }
  }
});
