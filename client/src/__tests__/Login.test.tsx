import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../pages/Login";
import { WSContext } from "../App";
import { UseWebSocketParams } from "../hooks/useWebSocket";

describe("Login Component", () => {
  const mockSetUserName: jest.Mock = jest.fn();

  const mockContextValue: UseWebSocketParams = {
    messages: null,
    sendMessage: jest.fn(),
    userName: "",
    setUserName: mockSetUserName,
    error: null,
    socketError: false,
    setSocketError: jest.fn(),
    userLoggedIn: false,
  };

  afterEach(() => {
    mockSetUserName.mockClear();
  });

  const renderWithContext = () => {
    return render(
      <WSContext.Provider value={mockContextValue}>
        <Login />
      </WSContext.Provider>
    );
  };

  test("renders login page correctly", () => {
    renderWithContext();

    expect(screen.getByText("Please, enter your username:")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Please enter userName")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  test("shows error when trying to log in with an empty username", async () => {
    renderWithContext();

    const loginButton = screen.getByRole("button", { name: /Login/i });

    await userEvent.click(loginButton);

    expect(screen.getByText("Username cannot be empty.")).toBeInTheDocument();
    expect(mockSetUserName).not.toHaveBeenCalled();
  });

  test("calls setUserName when login is successful", async () => {
    renderWithContext();

    const input = screen.getByPlaceholderText("Please enter userName");
    const loginButton = screen.getByRole("button", { name: /Login/i });

    await userEvent.type(input, "TestUser");
    await userEvent.click(loginButton);

    expect(mockSetUserName).toHaveBeenCalledWith("TestUser");
  });
});
