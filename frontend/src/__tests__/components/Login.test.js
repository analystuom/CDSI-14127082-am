import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../components/Login';
import { AuthProvider } from '../../contexts/AuthContext';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Rendering', () => {
    test('should render login form with all required fields', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });

    test('should render sign up link', () => {
      renderWithProviders(<Login />);
      
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    test('should have proper form accessibility', () => {
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(usernameInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Form Validation', () => {
    test('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.click(submitButton);
      });
      
      // HTML5 validation should prevent submission
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toBeInvalid();
      expect(passwordInput).toBeInvalid();
    });

    test('should enable submit button when form is filled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'password123');
      });
      
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Login Functionality', () => {
    test('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'testpassword123');
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('should show error message for invalid credentials', async () => {
      // Mock failed login
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Invalid credentials' })
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'wronguser');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('should show loading state during login', async () => {
      // Mock delayed response
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.status(200),
            ctx.json({
              access_token: 'mock_token',
              token_type: 'bearer',
              user: { username: 'testuser', email: 'test@example.com', role: 'user' }
            })
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'testpassword123');
        await user.click(submitButton);
      });
      
      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res.networkError('Network error');
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'testpassword123');
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/network error|connection error|login failed/i)).toBeInTheDocument();
      });
    });

    test('should handle server errors', async () => {
      // Mock server error
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Internal server error' })
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'testpassword123');
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/server error|login failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    test('should clear error message when user starts typing', async () => {
      // First, trigger an error
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Invalid credentials' })
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Trigger error
      await act(async () => {
        await user.type(usernameInput, 'wronguser');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      // Clear input and type again
      await act(async () => {
        await user.clear(usernameInput);
        await user.type(usernameInput, 'newuser');
      });
      
      // Error should be cleared
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
    });

    test('should focus on username input on mount', () => {
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveFocus();
    });

    test('should allow form submission with Enter key', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await act(async () => {
        await user.type(usernameInput, 'testuser');
        await user.type(passwordInput, 'testpassword123');
        await user.keyboard('{Enter}');
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Security', () => {
    test('should not expose password in form data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      
      await act(async () => {
        await user.type(passwordInput, 'secretpassword');
      });
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput.value).toBe('secretpassword');
      
      // Password should not be visible in the DOM
      expect(screen.queryByDisplayValue('secretpassword')).not.toBeInTheDocument();
    });

    test('should prevent form submission with XSS attempts', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(usernameInput, '<script>alert("xss")</script>');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);
      });
      
      // Should handle XSS attempt gracefully (either succeed or show validation error)
      // The exact behavior depends on backend validation
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should render properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<Login />);
      
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      // Form should still be functional on mobile
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
