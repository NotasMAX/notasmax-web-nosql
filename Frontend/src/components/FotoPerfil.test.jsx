import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FotoPerfil from './FotoPerfil.jsx';

describe('FotoPerfil', () => {
  it('shows the photo when there is one', () => {
    render(<FotoPerfil src="/foto.png" alt="Foto de Ana" tipoUsuario="aluno" />);

    expect(screen.getByRole('img', { name: 'Foto de Ana' })).toHaveAttribute('src', '/foto.png');
  });

  it('falls back to the profile icon when the photo does not load', () => {
    const { container } = render(<FotoPerfil src="/foto.png" alt="Foto de Ana" tipoUsuario="aluno" />);

    fireEvent.error(screen.getByRole('img', { name: 'Foto de Ana' }));

    expect(screen.queryByRole('img', { name: 'Foto de Ana' })).not.toBeInTheDocument();
    expect(container.querySelector('svg[data-tipo="aluno"]')).toBeInTheDocument();
  });

  it.each([
    ['aluno', 'circle'],
    ['professor', 'path[d="M4 5.5h16v13H4z"]'],
    ['administrador', 'path[d="m9 11 2 2 4-4"]'],
  ])('without a photo, shows the %s icon', (tipoUsuario, forma) => {
    const { container } = render(<FotoPerfil src={null} alt="Foto" tipoUsuario={tipoUsuario} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const icone = container.querySelector(`svg[data-tipo="${tipoUsuario}"]`);
    expect(icone).toHaveAttribute('aria-hidden', 'true');
    expect(icone.querySelector(forma)).toBeInTheDocument();
  });
});
