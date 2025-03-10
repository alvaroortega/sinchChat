import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import RegisterUserService from "../services/UserRegisterService.ts";

// jest.mock("@aws-sdk/client-dynamodb", () => {
//   const originalModule = jest.requireActual("@aws-sdk/client-dynamodb");
//   return {
//     ...originalModule,
//     DynamoDBClient: jest.fn().mockImplementation(() => ({
//       send: jest.fn(),
//     })),
//     PutItemCommand: jest.fn().mockImplementation((input) => ({ input })),
//     QueryCommand: jest.fn().mockImplementation((input) => ({ input })),
//     DeleteItemCommand: jest.fn().mockImplementation((input) => ({ input }))
//   };
// });

describe("RegisterUserService", () => {
  let service: RegisterUserService;
  const dbMock = mockClient(DynamoDBClient);
  const mockSessionId = "127.0.0.1:8080";
  const mockUserName = "TestUser";

  // let mockSend: jest.SpyInstance;

  beforeEach(() => {
    service = new RegisterUserService();
    // mockSend = jest.spyOn(service.dbClient, "send");
  });

  afterEach(() => {
    // mockSend.mockClear();
    dbMock.reset();
  })

  test("user should register correctly in DynamoDB", async () => {
    dbMock.on(PutItemCommand).resolves({});

    await expect(service.registerUser(mockUserName, mockSessionId)).resolves.toBeUndefined();

    expect(dbMock.calls()).toHaveLength(1);
    expect(dbMock.calls()[0].args[0]).toBeInstanceOf(PutItemCommand);
    const receivedCommand = dbMock.calls()[0].args[0] as PutItemCommand;
    expect(receivedCommand.input).toEqual({
      TableName: "Users",
      Item: {
        UserName: { S: mockUserName },
        SessionId: { S: mockSessionId },
        CreatedAt: expect.objectContaining({ S: expect.any(String) })
      }
    });
  });

  test("getUsername should return a username for a given sessionId", async () => {
    dbMock.on(QueryCommand).resolves({
      Items: [{ UserName: { S: mockUserName } }],
    });

    const username = await service.getUsername(mockSessionId);
    expect(username).toBe(mockUserName);
  });

  test("getUsername queries the DB with the expected params", async () => {
    dbMock.on(QueryCommand).resolves({
      Items: [{ UserName: { S: mockUserName } }],
    });

    const username = await service.getUsername(mockSessionId);
    expect(dbMock.calls()).toHaveLength(1);
    expect(dbMock.calls()[0].args[0]).toBeInstanceOf(QueryCommand);
    const receivedCommand = dbMock.calls()[0].args[0] as QueryCommand;
    expect(receivedCommand.input).toEqual({
      TableName: "Users",
      IndexName: "GSI_SessionLookup",
      KeyConditionExpression: "SessionId = :sessionId",
      ExpressionAttributeValues: {
        ":sessionId": {
          S: mockSessionId,
        }
      }
    });
  });

  test("getUsername should return null if no user exists for a session", async () => {
    dbMock.on(QueryCommand).resolves({ Items: [] });

    const username = await service.getUsername(mockSessionId);
    expect(username).toBeNull();
  });

  test("deleteUser calls DeleteItemCommand if userName is found", async () => {
    dbMock.on(QueryCommand).resolves({
      Items: [{ UserName: { S: mockUserName } }],
    });

    dbMock.on(DeleteItemCommand).resolves({});

    await expect(service.deleteUser(mockSessionId)).resolves.toBeUndefined();

    expect(dbMock.calls()).toHaveLength(2);
    expect(dbMock.calls()[1].args[0]).toBeInstanceOf(DeleteItemCommand);
  });

  test("should not DeleteItemCommand if userName is not found", async () => {
    dbMock.on(QueryCommand).resolves({ Items: [] });

    await expect(service.deleteUser(mockSessionId)).resolves.toBeUndefined();

    expect(dbMock.calls()).toHaveLength(1);
  });
});
