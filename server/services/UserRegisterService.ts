import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { accessKeyId, secretAccessKey } from "../config/keys.ts";

export default class UserRegisterService {
  private tableName = "Users";
  public dbClient: DynamoDBClient;

  constructor() {
    this.dbClient = new DynamoDBClient({
      region: "us-east-1",
      endpoint: "http://localhost:8000", // This must be changed to AWS url for production code
      credentials: { accessKeyId, secretAccessKey }, // Credentials need to be changed in production
    });
  }

  async registerUser(userName: string, sessionId: string) {
    if (!userName) {
      throw new Error("Username is required");
    }

    const params = new PutItemCommand({
      TableName: this.tableName,
      Item: {
        UserName: { S: userName },
        SessionId: { S: sessionId },
        CreatedAt: { S: `${Date.now()}` }
      }
    });

    await this.dbClient.send(params);
  }

  async getUsername(sessionId: string): Promise<string | null> {
    const params = new QueryCommand({
      TableName: this.tableName,
      IndexName: "GSI_SessionLookup",
      KeyConditionExpression: "SessionId = :sessionId",
      ExpressionAttributeValues: {
        ":sessionId": { S: sessionId }
      }
    });

    const result = await this.dbClient.send(params);

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].UserName.S ?? null;
    } else {
      console.log(`No user found for the session ${sessionId}`);
      return null;
    }
  }

  async deleteUser(sessionId: string) {
    const userName = await this.getUsername(sessionId);

    if (!userName) {
      console.error("User not found");
      return;
    }

    const params = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        UserName: { S: userName }
      }
    });

    await this.dbClient.send(params);
  }
}
