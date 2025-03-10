import React, { useState, useContext } from "react";
import { Button, Card, Input } from "antd";
import { UserOutlined } from '@ant-design/icons';
import { WSContext } from "../App";
import NotificationError from "../Components/NotificationError";

const Login: React.FC = () => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error("There has been an error loading the context of the application");
  }

  const { setUserName } = context;

  const [validationError, setValidationError] = useState<string | null>(null);
  const [userHandle, setUserHandle] = useState<string>("");

  const handleLogin = () => {
    if (!userHandle.trim()) {
      setValidationError("Username cannot be empty.");
      return;
    }
    setUserName(userHandle);
  };

  return (
    <Card className="loginContainer--card">
      <h2>Please, enter your username:</h2>
      <NotificationError />
      <div className="inputContainer--div">
        <Input
          placeholder="Please enter userName"
          prefix={<UserOutlined />}
          value={userHandle}
          onChange={(e) => setUserHandle(e.target.value)}
        />
        <Button variant="outlined" color="green" onClick={handleLogin}>Login</Button>
      </div>
      {validationError && <p className="error--input">{validationError}</p>}
    </Card>
  );
}


export default Login;