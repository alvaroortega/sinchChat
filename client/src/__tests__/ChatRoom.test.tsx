import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatRoom from "../pages/ChatRoom";
import { WSContext } from "../App";

describe("ChatRoom Component", () => {
  let mockSendMessage: jest.Mock = jest.fn();
  let mockHandleLogout: jest.Mock = jest.fn();

  afterEach(() => {
    mockSendMessage.mockClear();
    mockHandleLogout.mockClear();
  });

  const mockContextValue = {
    messages: {
      messages: [
        { userName: "TestUser", message: "Hello!", createdAt: "2025-03-09T17:22:28.676Z" }
      ],
      lastEvaluatedKey: null,
      totalMessages: 1
    },
    sendMessage: mockSendMessage,
    userName: "TestUser",
    setUserName: jest.fn(),
    error: null,
    socketError: false,
    setSocketError: jest.fn(),
    userLoggedIn: true,
  };

  const renderWithContext = () => {
    return render(
      <WSContext.Provider value={mockContextValue}>
        <ChatRoom />
      </WSContext.Provider>
    );
  };

  test("renders chat room correctly", () => {
    renderWithContext();

    expect(screen.getByText("Chat Room")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  test("sends NEW_MESSAGE message to the server when clicking the send button", async () => {
    renderWithContext();

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByRole("button", { name: /Send/i });

    await userEvent.type(input, "New Message");
    await userEvent.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith({
      command: "NEW_MESSAGE",
      payload: { message: "New Message" }
    });
  });

  test("send a SIGN_OUT message to the server when clicking logout button", async () => {
    renderWithContext();

    const logoutButton = screen.getByRole("button", { name: /Logout/i });

    await userEvent.click(logoutButton);

    expect(mockSendMessage).toHaveBeenCalledWith({
      command: "SIGN_OUT"
    });
  });
});
