import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Test component to use the AuthContext
const TestComponent = () => {
  const {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin,
    getAuthHeaders
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.username : 'No User'}</div>
      <div data-testid="token">{token || 'No Token'}</div>
      <div data-testid="authenticated">{isAuthenticated() ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="admin">{isAdmin() ? 'Admin' : 'Not Admin'}</div>
      
      <button 
        data-testid="login-btn" 
        onClick={() => login('testuser', 'testpassword123')}
      >
        Login
      </button>
      
      <button 
        data-testid="register-btn" 
        onClick={() => register({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          role: 'user'
        })}
      >
        Register
      </button>
      
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      
      <div data-testid="auth-headers">
        {JSON.stringify(getAuthHeaders())}
      </div>
    </div>
  );
};

const renderWithAuthProvider = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any existing tokens
    delete window.localStorage.token;
  });

  describe('Initial State', () => {
    test('should have correct initial state when no token exists', async () => {
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('token')).toHaveTextContent('No Token');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('admin')).toHaveTextContent('Not Admin');
    });

    test('should load user when valid token exists in localStorage', async () => {
      // Set up a valid token in localStorage
      localStorage.setItem('token', 'mock_access_token_123');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('token')).toHaveTextContent('mock_access_token_123');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });
  });

  describe('Login Functionality', () => {
    test('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('login-btn'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
      
      // Check that token is stored in localStorage
      expect(localStorage.getItem('token')).toBe('mock_access_token_123');
    });

    test('should handle login failure with invalid credentials', async () => {
      // Mock failed login response
      server.use(
        rest.post('/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Invalid credentials' })
          );
        })
      );

      const user = userEvent.setup();
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('login-btn'));
      });
      
      // Should remain unauthenticated
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Registration Functionality', () => {
    test('should register successfully with valid data', async () => {
      const user = userEvent.setup();
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('register-btn'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('newuser');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
      
      expect(localStorage.getItem('token')).toBe('mock_access_token_123');
    });

    test('should handle registration failure', async () => {
      // Mock failed registration response
      server.use(
        rest.post('/auth/register', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ detail: 'Username already exists' })
          );
        })
      );

      const user = userEvent.setup();
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('register-btn'));
      });
      
      // Should remain unauthenticated
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    });
  });

  describe('Logout Functionality', () => {
    test('should logout successfully and clear user data', async () => {
      // Start with authenticated user
      localStorage.setItem('token', 'mock_access_token_123');
      
      const user = userEvent.setup();
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('logout-btn'));
      });
      
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('token')).toHaveTextContent('No Token');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Role-based Access', () => {
    test('should correctly identify admin users', async () => {
      // Mock admin user response
      server.use(
        rest.get('/auth/me', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              id: 'admin_user_id',
              username: 'adminuser',
              email: 'admin@example.com',
              role: 'admin',
              created_at: new Date().toISOString(),
              is_active: true
            })
          );
        })
      );

      localStorage.setItem('token', 'mock_admin_token');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('adminuser');
        expect(screen.getByTestId('admin')).toHaveTextContent('Admin');
      });
    });

    test('should correctly identify regular users', async () => {
      localStorage.setItem('token', 'mock_access_token_123');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
        expect(screen.getByTestId('admin')).toHaveTextContent('Not Admin');
      });
    });
  });

  describe('Auth Headers', () => {
    test('should provide correct auth headers when authenticated', async () => {
      localStorage.setItem('token', 'mock_access_token_123');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        const headersText = screen.getByTestId('auth-headers').textContent;
        const headers = JSON.parse(headersText);
        
        expect(headers).toEqual({
          'Authorization': 'Bearer mock_access_token_123',
          'Content-Type': 'application/json'
        });
      });
    });

    test('should provide default headers when not authenticated', async () => {
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      const headersText = screen.getByTestId('auth-headers').textContent;
      const headers = JSON.parse(headersText);
      
      expect(headers).toEqual({
        'Content-Type': 'application/json'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors during authentication', async () => {
      // Mock network error
      server.use(
        rest.get('/auth/me', (req, res, ctx) => {
          return res.networkError('Network error');
        })
      );

      localStorage.setItem('token', 'mock_access_token_123');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
      
      // Token should be cleared on error
      expect(localStorage.getItem('token')).toBeNull();
    });

    test('should handle invalid token response', async () => {
      // Mock invalid token response
      server.use(
        rest.get('/auth/me', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Invalid token' })
          );
        })
      );

      localStorage.setItem('token', 'invalid_token');
      
      renderWithAuthProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
      
      // Token should be cleared
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Context Usage', () => {
    test('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
