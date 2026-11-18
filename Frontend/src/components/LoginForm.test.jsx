import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

describe('LoginForm', () => {
  it('passes credentials to the auth context and routes after successful login', async () => {
    const loginUser = vi.fn().mockResolvedValue({ ok: true });
    useAuth.mockReturnValue({ loginUser });
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Exemplo@gmail.com'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(loginUser).toHaveBeenCalledWith('ana@example.com', 'senha'));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the auth failure message and keeps the user on the login form', async () => {
    const loginUser = vi.fn().mockResolvedValue({ ok: false, message: 'Credenciais inválidas' });
    useAuth.mockReturnValue({ loginUser });
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Exemplo@gmail.com'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
