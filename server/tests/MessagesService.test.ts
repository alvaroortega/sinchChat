import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import MessagesService from "../services/MessagesService.ts";

jest.mock("ioredis", () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      publish: jest.fn().mockResolvedValue(1)
    }))
  };
});

const dbMock = mockClient(DynamoDBClient);
const messageService = new MessagesService();

describe("MssagesService", () => {
  let redisPublisherMock: jest.SpyInstance;
  beforeEach(() => {
    redisPublisherMock = jest.spyOn(messageService.redisPublisher, 'publish');
  });

  afterEach(() => {
    redisPublisherMock.mockClear();
    dbMock.reset();
    jest.clearAllMocks();
  })

  const mockMessage = "Hello, world!";
  const mockUserName = "TestUser";

  test("createMessage calls in PutItemCommand DynamoDB and publish event in Redis", async () => {
    dbMock.on(PutItemCommand).resolves({});
    redisPublisherMock.mockResolvedValueOnce(1);

    const response = await messageService.createMessage(mockMessage, mockUserName);

    expect(response.message).toBe(mockMessage);
    expect(response.createdAt).toBeDefined();

    expect(dbMock.calls()).toHaveLength(1);
    expect(dbMock.calls()[0].args[0]).toBeInstanceOf(PutItemCommand);

    expect(redisPublisherMock).toHaveBeenCalledWith(
      "new_message_created",
      expect.stringContaining(mockMessage)
    );
  });

  test("createMessage to throw an error when trying to create an empty message", async () => {
    await expect(messageService.createMessage("", mockUserName))
      .rejects.toThrow("Comment field cannot be empty");
  });

  test("fetch messages from DynamoDB", async () => {
    dbMock.on(QueryCommand).resolves({
      Items: [
        { UserName: { S: mockUserName }, Message: { S: mockMessage }, CreatedAt: { S: "2025-03-09T17:22:28.676Z" } }
      ]
    });

    dbMock.on(ScanCommand).resolves({ Count: 1 });

    const response = await messageService.fetchMessages();

    expect(response.messages).toHaveLength(1);
    expect(response.messages[0].message).toBe(mockMessage);
    expect(response.totalMessages).toBe(1);
  });

  test("fetchMesages with pagination", async () => {
    const lastEvaluatedKey = { CreatedAt: { S: "2025-03-09T17:22:28.676Z" } };

    dbMock.on(QueryCommand).resolves({
      Items: [
        { UserName: { S: mockUserName }, Message: { S: mockMessage }, CreatedAt: { S: "2025-03-09T17:22:28.676Z" } }
      ],
      LastEvaluatedKey: lastEvaluatedKey
    });

    dbMock.on(ScanCommand).resolves({ Count: 2 });

    const response = await messageService.fetchMessages(10, lastEvaluatedKey);

    expect(response.messages).toHaveLength(1);
    expect(response.lastEvaluatedKey).toEqual(lastEvaluatedKey);
  });
});
