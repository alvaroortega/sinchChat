import "@testing-library/jest-dom";
import { jest } from "@jest/globals";


Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockWebSocket = jest.fn().mockImplementation(function (this: any) {
  let eventListeners: Record<string, Function[]> = {};

  this.send = jest.fn();
  this.close = jest.fn();
  this.readyState = WebSocket.OPEN;
  this.onmessage = null;

  this.addEventListener = jest.fn((event: string, callback: EventListener) => {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
  });

  this.removeEventListener = jest.fn((event: string, callback: EventListener) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
    }
  });

  this.triggerMessageEvent = (data: any) => {
    const event = new MessageEvent("message", { data: JSON.stringify(data) });

    if (typeof this.onmessage === "function") {
      this.onmessage(event);
    }

    if (eventListeners["message"]) {
      eventListeners["message"].forEach(callback => callback(event));
    }
  };
});

Object.defineProperty(globalThis, "WebSocket", {
  writable: true,
  value: mockWebSocket,
});
