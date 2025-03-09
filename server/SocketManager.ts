import WebSocket from "ws";


class SocketManager {
  private static instance: SocketManager;
  private localSockets: Map<string, WebSocket>;

  private constructor() {
    this.localSockets = new Map();
  }

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public addUser(username: string, ws: WebSocket) {
    this.localSockets.set(username, ws);
  }

  public removeUser(username: string) {
    this.localSockets.delete(username);
  }

  public getUserSocket(username: string): WebSocket | undefined {
    return this.localSockets.get(username);
  }

  public getActiveUserNames(): IterableIterator<string> {
    return this.localSockets.keys();
  }
}

export default SocketManager.getInstance();
