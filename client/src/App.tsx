import { createContext } from 'react';
import './App.css';
import { useWebSocket, UseWebSocketParams } from './hooks/useWebSocket';
import Login from './pages/Login';
import ChatRoom from './pages/ChatRoom';
import ErrorPage from './pages/ErrorPage';


export const WSContext = createContext<UseWebSocketParams | null>(null);

const App: React.FC = () => {
  const { sendMessage, messages, userName, setUserName, error, socketError, setSocketError } = useWebSocket();

  return (
    <WSContext.Provider value={{ sendMessage, messages, userName, setUserName, error, socketError, setSocketError }}>
      {socketError ? <ErrorPage />
        :
        (userName === "" ? <Login /> : <ChatRoom />)
      }
    </WSContext.Provider>
  );
}

export default App
