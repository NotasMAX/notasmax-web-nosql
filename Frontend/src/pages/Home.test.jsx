import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './Home';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

describe('Home', () => {
  it('saúda o usuário autenticado pelo nome', () => {
    useAuth.mockReturnValue({ user: { nome: 'Rafa' } });
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Olá, Rafa 👋' })).toBeInTheDocument();
    expect(screen.getByText('Seja bem-vindo(a) de volta!')).toBeInTheDocument();
  });

  it('continua renderizando quando não há nome de usuário', () => {
    useAuth.mockReturnValue({ user: null });
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Olá, 👋' })).toBeInTheDocument();
  });
});
