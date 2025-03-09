import { DynamoDBClient, AttributeValue } from "@aws-sdk/client-dynamodb";
import { Redis } from "ioredis";
import {
  PutItemCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { accessKeyId, secretAccessKey } from "../config/keys.ts";
import type { Messages, NewMessageEvent } from "../types/types.ts";

const PARTITION_KEY = "conversation";

export default class DiscussionsService {
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

  async createMessage(message: string, userName: string): Promise<string> {
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

    return message;
  }

  async fetchMessages(
    limit: number = 50,
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

    return {
      messages: result.Items?.map(item => ({
        userName: item.UserName.S ?? "",
        message: item.Message.S ?? "",
        createdAt: item.CreatedAt.S ?? ""
      })) || [],
      lastEvaluatedKey: result.LastEvaluatedKey || null,
    };
  }

  async disconnectRedis() {
    await this.redisPublisher.quit();
  }
}
