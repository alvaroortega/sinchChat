import React, { useState, useContext } from "react";
import { WSContext } from "../App";

const Login: React.FC = () => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error("There has been an error loading the context of the application");
  }

  const { setUserName } = context;

  const [error, setError] = useState<string | null>(null);
  const [userHandle, setUserHandle] = useState<string>("");

  const handleLogin = () => {
    if (!userHandle.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    setUserName(userHandle);
  };

  return (
    <div>
      <h2>Please, enter your username:</h2>
      <input
        type="text"
        value={userHandle}
        onChange={(e) => setUserHandle(e.target.value)}
        placeholder="Your username"
      />
      <button onClick={handleLogin}>Login</button>
      {error && <p className="error--input">{error}</p>}
    </div>
  );
}


export default Login;