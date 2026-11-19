import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  it('saúda o usuário autenticado pelo nome', () => {
    useAuth.mockReturnValue({ user: { nome: 'Rafa' } });
    renderHome();
    expect(screen.getByRole('heading', { name: 'Olá, Rafa 👋' })).toBeInTheDocument();
    expect(screen.getByText('Seja bem-vindo(a) de volta!')).toBeInTheDocument();
  });

  it('continua renderizando quando não há nome de usuário', () => {
    useAuth.mockReturnValue({ user: null });
    renderHome();
    expect(screen.getByRole('heading', { name: 'Olá, 👋' })).toBeInTheDocument();
  });

  it('mostra o atalho para o lançamento de presença', () => {
    useAuth.mockReturnValue({ user: { nome: 'Rafa' } });
    renderHome();
    const link = screen.getByRole('link', { name: /Lançamento de presença/ });
    expect(link).toHaveAttribute('href', '/presenca');
  });
});