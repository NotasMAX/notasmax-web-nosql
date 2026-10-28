import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ value: { user: null, loading: false } }));
vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => auth.value,
}));
vi.mock('./components/Layout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('./pages/LoginPage', () => ({ default: () => <p>Login test page</p> }));
vi.mock('./pages/Home', () => ({ default: () => <p>Home test page</p> }));
vi.mock('./pages/AlunoListar', () => ({ default: () => <p>Student list test page</p> }));

import App from './App.jsx';

beforeEach(() => {
  auth.value = { user: null, loading: false };
  window.history.replaceState({}, '', '/Login');
});
afterEach(cleanup);

describe('App route guards', () => {
  it('shows the guest login route', () => {
    render(<App />);
    expect(screen.getByText('Login test page')).toBeInTheDocument();
  });

  it('redirects an authenticated user away from the guest login route', async () => {
    auth.value = { user: { tipo_usuario: 'administrador' }, loading: false };
    window.history.replaceState({}, '', '/Login');
    render(<App />);
    expect(await screen.findByText('Home test page')).toBeInTheDocument();
  });

  it('shows loading until session lookup completes', () => {
    auth.value = { user: null, loading: true };
    window.history.replaceState({}, '', '/Alunos');
    render(<App />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('redirects guests to login from an administrative route', async () => {
    window.history.replaceState({}, '', '/Alunos');
    render(<App />);
    expect(await screen.findByText('Login test page')).toBeInTheDocument();
  });

  it('denies authenticated non-administrators', () => {
    auth.value = { user: { tipo_usuario: 'professor' }, loading: false };
    window.history.replaceState({}, '', '/Alunos');
    render(<App />);
    expect(screen.getByText('Acesso negado.')).toBeInTheDocument();
  });

  it('renders the protected route for an administrator', () => {
    auth.value = { user: { tipo_usuario: 'administrador' }, loading: false };
    window.history.replaceState({}, '', '/Alunos');
    render(<App />);
    expect(screen.getByText('Student list test page')).toBeInTheDocument();
  });
});
