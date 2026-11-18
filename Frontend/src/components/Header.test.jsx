import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from './Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

describe('Header', () => {
  it('greets the user by first name and logs out before routing to login', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ user: { nome: 'Ana Silva' }, logoutUser });
    render(<Header />);

    expect(screen.getByText('Bem vindo, Ana!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'));
    expect(logoutUser).toHaveBeenCalledOnce();
  });

  it('uses the fallback greeting when no user name is available', () => {
    useAuth.mockReturnValue({ user: null, logoutUser: vi.fn() });
    render(<Header />);
    expect(screen.getByText('Bem vindo, Usuário!')).toBeInTheDocument();
  });
});
