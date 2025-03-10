import { createContext } from 'react';
import './App.css';
import { useWebSocket, UseWebSocketParams } from './hooks/useWebSocket';
import Login from './pages/Login';
import ChatRoom from './pages/ChatRoom';
import ErrorPage from './pages/ErrorPage';


export const WSContext = createContext<UseWebSocketParams | null>(null);

const App: React.FC = () => {
  const {
    sendMessage,
    messages,
    userName,
    setUserName,
    error,
    socketError,
    setSocketError,
    userLoggedIn
  } = useWebSocket();

  return (
    <WSContext.Provider value={{ sendMessage, messages, userName, setUserName, error, socketError, setSocketError, userLoggedIn }}>
      {socketError ? <ErrorPage />
        :
        (userLoggedIn ? <ChatRoom /> : <Login />)
      }
    </WSContext.Provider>
  );
}

export default App
