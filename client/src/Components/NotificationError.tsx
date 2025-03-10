import React, { useContext, useEffect } from "react";
import { notification } from "antd";
import { WSContext } from "../App";

const NotificationError: React.FC = () => {
  const context = useContext(WSContext);
  const [api, contextHolder] = notification.useNotification();

  if (!context) {
    throw new Error("There has been an error loading the context of the application");
  }

  const { error } = context;

  const showNotificationError = (description: string) => {
    api.error({
      message: "Chat Room",
      description,
    });
  };

  useEffect(() => {
    if (error) {
      showNotificationError(error)
    }
  }, [error]);

  return (
    <>
      {contextHolder}
    </>
  )
};


export default NotificationError;