import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../hooks/useWebSocket";

describe("useWebSocket Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // ✅ Clear previous test mocks
  });

  test("initialize with default values", () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.messages).toBeNull();
    expect(result.current.userName).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.socketError).toBe(false);
    expect(result.current.userLoggedIn).toBe(false);
  });

  test("a WebSocket connection is established when userName is set", () => {
    const { result, rerender } = renderHook(() => useWebSocket());

    act(() => {
      result.current.setUserName("TestUser");
    });

    rerender();

    expect(WebSocket).toHaveBeenCalledTimes(1);
    expect(WebSocket).toHaveBeenCalledWith("ws://127.0.0.1:8080");
  });

  test("user is logged in after SIGNED_IN is received", async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(() => {
      result.current.setUserName("TestUser");
    });

    const mockWsInstance = (WebSocket as unknown as jest.Mock).mock.instances[0];

    await act(() => {
      mockWsInstance.triggerMessageEvent({
        type: "SIGNED_IN",
        data: { messages: [], lastEvaluatedKey: null, totalMessages: 0 }
      })
    });

    expect(result.current.userLoggedIn).toBe(true);
    expect(result.current.messages).toEqual({
      messages: [],
      lastEvaluatedKey: null,
      totalMessages: 0
    });
  });

  test("a new message is added to the list when receiving NEW_MESSAGE_CREATED", async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      result.current.setUserName("TestUser");
    });

    const mockWsInstance = (WebSocket as unknown as jest.Mock).mock.instances[0];

    expect(mockWsInstance.triggerMessageEvent).toBeDefined();

    await act(() => {
      mockWsInstance.triggerMessageEvent({
        type: "NEW_MESSAGE_CREATED",
        data: { userName: "TestUser", message: "Hello!", createdAt: "2025-03-09T17:22:28.676Z" }
      });
    });

    expect(result.current.messages?.messages).toEqual([
      { userName: "TestUser", message: "Hello!", createdAt: "2025-03-09T17:22:28.676Z" }
    ]);
  });

  test("an error is set when an ERROR message is received", async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(() => {
      result.current.setUserName("TestUser");
    });

    const mockWsInstance = (WebSocket as unknown as jest.Mock).mock.instances[0];

    await act(() => {
      mockWsInstance.triggerMessageEvent({
        type: "ERROR",
        message: "Something went wrong"
      });
    });

    expect(result.current.error).toBe("Something went wrong");
  });

  test("WebSocket errors are handled", async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(() => {
      result.current.setUserName("TestUser");
    });

    const mockWsInstance = (WebSocket as unknown as jest.Mock).mock.instances[0];

    await act(() => {
      mockWsInstance.onerror(ErrorEvent);
    });

    expect(result.current.userName).toBe("");
    expect(result.current.userLoggedIn).toBe(false);
    expect(result.current.socketError).toBe(true);
  });
});
