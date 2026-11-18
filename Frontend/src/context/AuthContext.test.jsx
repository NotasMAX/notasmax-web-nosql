import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authApi = vi.hoisted(() => ({
  getProfile: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../api/auth', () => authApi);

import { AuthProvider, useAuth } from './AuthContext.jsx';

function Probe() {
  const { user, loading, loginUser, logoutUser, refreshUser } = useAuth();
  return (
    <section>
      <output data-testid="loading">{String(loading)}</output>
      <output data-testid="user">{user?.nome ?? 'none'}</output>
      <button onClick={() => loginUser('a@b.test', 'pw')}>login</button>
      <button onClick={async () => { try { await logoutUser(); } catch { /* keep the test harness mounted */ } }}>logout</button>
      <button onClick={() => refreshUser()}>refresh</button>
    </section>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.getProfile.mockResolvedValue({ usuario: { nome: 'Ana' } });
});

describe('AuthProvider', () => {
  it('loads the current profile and completes the loading state', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('treats an unauthenticated profile as a guest without logging an expected 401', async () => {
    const error = { response: { status: 401 } };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApi.getProfile.mockRejectedValueOnce(error);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(log).not.toHaveBeenCalled();
  });

  it('logs unexpected profile failures and clears the current user', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApi.getProfile.mockRejectedValueOnce(new Error('offline'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(log).toHaveBeenCalledWith('Erro ao buscar perfil:', expect.any(Error));
  });

  it('handles successful, incomplete, and failed login results', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Ana');
    authApi.login.mockResolvedValueOnce({ usuario: { nome: 'Bia' } });
    await act(async () => screen.getByText('login').click());
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith('a@b.test', 'pw'));
    expect(screen.getByTestId('user')).toHaveTextContent('Bia');

    authApi.login.mockResolvedValueOnce({ message: 'Credenciais inválidas' });
    await act(async () => screen.getByText('login').click());
    expect(screen.getByTestId('user')).toHaveTextContent('Bia');

    authApi.login.mockRejectedValueOnce({ response: { data: { error: 'Falha específica' } } });
    await act(async () => screen.getByText('login').click());
    expect(screen.getByTestId('user')).toHaveTextContent('Bia');
  });

  it('clears the user on logout even when the API request fails', async () => {
    authApi.logout.mockRejectedValueOnce(new Error('offline'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Ana');
    await act(async () => screen.getByText('logout').click());
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('refreshes the profile and resets the user for empty response data', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Ana');
    authApi.getProfile.mockResolvedValueOnce({});
    await act(async () => screen.getByText('refresh').click());
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
  });
});
