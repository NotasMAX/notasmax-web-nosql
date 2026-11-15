import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProfessorVisualizar from './ProfessorVisualizar';
import { getUsuario } from '../api/usuariosapi';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Professores/Visualizar/p1']}><Routes><Route path="/Professores/Visualizar/:id" element={<ProfessorVisualizar />} /><Route path="/Professores/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>); }

describe('ProfessorVisualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe os dados consultados e abre a edição pelo ID da rota', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana', email: 'ana@example.test', telefone_contato: '123' } });
    mount();
    expect(await screen.findByText('Prof. Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@example.test')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByText('Destino: /Professores/Editar/p1')).toBeInTheDocument();
  });

  it('mostra a foto do professor quando ela existe', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Prof. Ana', email: 'ana@example.test', telefone_contato: '123', foto_atualizada_em: '2026-11-15T12:00:00.000Z' } });
    mount();
    expect(await screen.findByRole('img', { name: 'Foto de Prof. Ana' })).toHaveAttribute('src', 'http://localhost:5000/NotasMax/Usuarios/p1/Foto?v=2026-11-15T12:00:00.000Z');
  });

  it('mostra erro quando a busca de professor falha', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar informações do professor.')).toBeInTheDocument();
  });
});
