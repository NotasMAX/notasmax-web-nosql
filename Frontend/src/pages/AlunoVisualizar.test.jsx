import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AlunoVisualizar from './AlunoVisualizar';
import { getUsuario } from '../api/usuariosapi';

vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Alunos/Visualizar/a2']}><Routes><Route path="/Alunos/Visualizar/:id" element={<AlunoVisualizar />} /><Route path="/Alunos/Editar/:id" element={<Destination />} /></Routes></MemoryRouter>); }

describe('AlunoVisualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe os dados do aluno e permite abrir a edição', async () => {
    getUsuario.mockResolvedValue({ data: { nome: 'Bia', email: 'bia@example.test', telefone_contato: '123', nome_responsavel: '', telefone_responsavel: null } });
    mount();
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('bia@example.test')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByText('Destino: /Alunos/Editar/a2')).toBeInTheDocument();
  });

  it('apresenta falha de carregamento', async () => {
    getUsuario.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar informações do aluno.')).toBeInTheDocument();
  });
});
