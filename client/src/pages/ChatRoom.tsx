import React, { useContext, useEffect, useRef, useState } from "react";
import { Button, Card, Input, List, Typography, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { WSContext } from "../App";
import { Message } from "../types/types";
import NotificationError from "../Components/NotificationError";

const { Text } = Typography;

const ChatRoom: React.FC = () => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error("There has been an error loading the context of the application");
  }

  const { userName, messages, sendMessage } = context;
  const [input, setInput] = useState("");
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const scrollableDivRef = useRef<HTMLDivElement | null>(null);
  const prevHeightRef = useRef<number>(0);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage({ command: "NEW_MESSAGE", payload: { message: input } });
      setInput("");

      setTimeout(() => {
        if (scrollableDivRef.current) {
          scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const handleLogout = () => {
    sendMessage({ command: "SIGN_OUT" })
  };

  const loadMore = () => {
    if (scrollableDivRef.current) {
      prevHeightRef.current = scrollableDivRef.current.scrollHeight;
    }
    setLoadingOlderMessages(true);
    sendMessage({ command: "GET_MORE_MESSAGES", payload: { lastEvaluatedKey: messages?.lastEvaluatedKey || undefined } })
  };

  useEffect(() => {
    if (scrollableDivRef.current) {
      const messagesDiv = scrollableDivRef.current;

      if (loadingOlderMessages) {
        messagesDiv.scrollTop = 0;
        setLoadingOlderMessages(false);
      } else {
        const scrollDifference = messagesDiv.scrollHeight - prevHeightRef.current;
        messagesDiv.scrollTop += scrollDifference;
      }
    }
  }, [messages?.messages?.length]);

  const handleScroll = () => {
    if (scrollableDivRef.current && messages?.messages.length! < messages?.totalMessages!) {
      setShowLoadMore(scrollableDivRef.current.scrollTop === 0);
    }
  };

  const isMessageFromUser = (msg: Message): boolean => msg.userName === userName;

  return (
    <div className="chatContainer--div">
      <NotificationError />
      <Button
        className="logout--button"
        color="green"
        variant="outlined"
        onClick={handleLogout}
      >
        Logout
      </Button>
      <Card
        title="Chat Room"
        className="messages--card">
        <div
          ref={scrollableDivRef}
          data-testid="messagesContent--div"
          id="messagesContent--div"
          className="messagesContent--div"
          onScroll={handleScroll}
        >
          {showLoadMore && messages?.lastEvaluatedKey && (
            <Button
              color="green"
              variant="dashed"
              onClick={loadMore}
              className="loadMore--button"
            >
              Load More Messages
            </Button>
          )}
          <List
            dataSource={messages?.messages}
            renderItem={(msg) => (
              <List.Item
                className={classNames({
                  "messagesItem--user1": isMessageFromUser(msg),
                  "messagesItem--user2": !isMessageFromUser(msg),
                })}
              >
                <Card
                  className={classNames({
                    "messageCard--user1": isMessageFromUser(msg),
                    "messageCard--user2": !isMessageFromUser(msg)
                  })}
                >
                  <List.Item.Meta
                    avatar={<Avatar className="message--avatar" icon={<UserOutlined />} />}
                    title={
                      <Text
                        className={classNames({
                          "avatarTitle--user1": isMessageFromUser(msg),
                          "avatarTitle--user2": !isMessageFromUser(msg)
                        })}
                        strong
                      >
                        {msg.userName}
                      </Text>
                    }
                    description={msg.message}
                  />
                  <Text
                    type="secondary"
                    className="messagesDateText"
                  >
                    {new Date(msg.createdAt).toLocaleString()}
                  </Text>
                </Card>
              </List.Item>
            )}
          />
        </div>
        <div className="inputContainer--div">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <Button color="green" variant="outlined" onClick={handleSend}>Send</Button>
        </div>
      </Card>
    </div>
  );
}

export default ChatRoom;