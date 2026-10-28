import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navigation from './Navigation.jsx';

describe('Navigation', () => {
  it('renders the primary routes and starts expanded when no preference is stored', () => {
    localStorage.removeItem('navOpen');
    const { container } = render(<MemoryRouter initialEntries={['/']}><Navigation /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Inicial/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Turmas/ })).toHaveAttribute('href', '/Turmas');
    expect(screen.getByRole('link', { name: /Simulados/ })).toHaveAttribute('href', '/Simulados');
    expect(screen.getByRole('link', { name: /Materias/ })).toHaveAttribute('href', '/Materias');
    expect(screen.getByRole('link', { name: /Professores/ })).toHaveAttribute('href', '/Professores');
    expect(screen.getByRole('link', { name: /Alunos/ })).toHaveAttribute('href', '/Alunos');
    expect(container.querySelector('nav').style.width).toBe('14rem');
  });

  it('restores the collapsed state from local storage', () => {
    localStorage.setItem('navOpen', 'false');
    const { container } = render(<MemoryRouter><Navigation /></MemoryRouter>);
    expect(container.querySelector('nav').style.width).toBe('0px');
    expect(container.querySelector('nav').style.overflow).toBe('hidden');
  });
});
