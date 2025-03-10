import React, { useContext } from "react";
import { Button, Result } from "antd";
import { WSContext } from "../App";

const ErrorPage: React.FC = () => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error("There has been an error loading the context of the application");
  }

  const { setSocketError } = context;

  return (
    <Result
      status="error"
      title="WebSocket Connection Error"
      subTitle="Something went wrong. Please check your internet connection or try again later."
      extra={[
        <Button key="goToLoginBtn" color="green" variant="outlined" onClick={() => setSocketError(false)}>Go to Login</Button>,
      ]}
    />
  );
};

export default ErrorPage;
