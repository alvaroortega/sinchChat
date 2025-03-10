import { DynamoDBClient, AttributeValue } from "@aws-sdk/client-dynamodb";
import { Redis } from "ioredis";
import {
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  Select
} from "@aws-sdk/client-dynamodb";
import { accessKeyId, secretAccessKey } from "../config/keys.ts";
import type { Messages, NewMessageEvent } from "../types/types.ts";

const PARTITION_KEY = "conversation";

export default class MessageService {
  private tableName = "Messages";
  public dbClient: DynamoDBClient;
  public redisPublisher: Redis;

  constructor() {
    this.dbClient = new DynamoDBClient({
      region: "us-east-1",
      endpoint: "http://localhost:8000", // This must be changed to AWS url for production code
      credentials: { accessKeyId, secretAccessKey }, // Credentials need to be changed in production
    });
    this.redisPublisher = new Redis({ host: "localhost", port: 6379 });
  }

  async createMessage(message: string, userName: string): Promise<{ message: string; createdAt: string; }> {
    if (!message.length) {
      throw new Error("Comment field cannot be empty");
    }

    const now = new Date().toISOString();

    const params = new PutItemCommand({
      TableName: this.tableName,
      Item: {
        PartitionKey: { S: PARTITION_KEY },
        Message: { S: message },
        CreatedAt: { S: now },
        UserName: { S: userName }
      }
    });

    await this.dbClient.send(params);

    const event: NewMessageEvent = { createdAt: now, message, userName };
    await this.redisPublisher.publish("new_message_created", JSON.stringify(event));
    console.log("Published new_message_created event");

    return { message, createdAt: now };
  }

  async fetchMessages(
    limit: number = 20,
    lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined
  ): Promise<Messages> {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: "PartitionKey = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: PARTITION_KEY },
      },

      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const command = new QueryCommand(params);
    const result = await this.dbClient.send(command);

    const countParams = {
      TableName: this.tableName,
      Select: Select.COUNT,
    };

    const countCommand = new ScanCommand(countParams);
    const countResult = await this.dbClient.send(countCommand);
    const totalMessages = countResult.Count || 0;

    return {
      messages: result.Items?.map(item => ({
        userName: item.UserName.S ?? "",
        message: item.Message.S ?? "",
        createdAt: item.CreatedAt.S ?? ""
      })) || [],
      lastEvaluatedKey: result.LastEvaluatedKey || null,
      totalMessages
    };
  }

  async disconnectRedis() {
    await this.redisPublisher.quit();
  }
}
