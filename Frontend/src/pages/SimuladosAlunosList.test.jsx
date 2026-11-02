import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladosAlunosList from './SimuladosAlunosList';
import { getOne } from '../api/simuladoApi';

vi.mock('../api/simuladoApi', () => ({ getOne: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));
vi.mock('../components/SimuladoAlunoItem', () => ({ default: ({ alunoResultado, onView }) => <button onClick={onView}>Ver {alunoResultado.nome}</button> }));
vi.mock('primereact/tooltip', () => ({ Tooltip: () => null }));
const alternarPainel = vi.hoisted(() => vi.fn());
vi.mock('primereact/overlaypanel', async () => {
  const { useImperativeHandle } = await vi.importActual('react');
  return {
    OverlayPanel: ({ children, ref }) => {
      useImperativeHandle(ref, () => ({ toggle: alternarPainel }));
      return <div>{children}</div>;
    },
  };
});
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter initialEntries={['/Simulados/Alunos/s1']}><Routes><Route path="/Simulados/Alunos/:id" element={<SimuladosAlunosList />} /><Route path="/Simulados/Notas/:simulado/:bimestre/:aluno" element={<Destination />} /><Route path="/Simulados/Importar/:turma/:bimestre/:aluno" element={<Destination />} /></Routes></MemoryRouter>); }

describe('SimuladosAlunosList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra aviso para simulado sem resultados lançados', async () => {
    getOne.mockResolvedValue({ data: { simulado: { _id: 's1', numero: 3, bimestre: 1, turma: { _id: 't1', ano: 2026, serie: 2, alunos: [] }, conteudos: [] } } });
    mount();
    expect(await screen.findByText('As notas desse simulado ainda não foram lançadas.')).toBeInTheDocument();
  });

  it('o Importar Excel pergunta o aluno e abre a importação dele, mesmo sem notas lançadas', async () => {
    getOne.mockResolvedValue({ data: { simulado: { _id: 's1', numero: 3, bimestre: 2, turma: { _id: 't1', ano: 2026, serie: 2, alunos: [{ _id: 'a1', nome: 'Ana' }, { _id: 'a2', nome: 'Bia' }] }, conteudos: [{ resultados: [] }] } } });
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Importar Excel' }));
    expect(alternarPainel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('As notas desse simulado ainda não foram lançadas.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bia' }));
    expect(await screen.findByText('Destino: /Simulados/Importar/t1/2/a2')).toBeInTheDocument();
  });

  it('permite abrir resultados individuais quando há notas', async () => {
    getOne.mockResolvedValue({ data: { simulado: { _id: 's1', numero: 3, bimestre: 2, turma: { _id: 't1', ano: 2026, serie: 2, alunos: [{ _id: 'a1', nome: 'Ana' }] }, conteudos: [{ resultados: [{ aluno: 'a1' }] }] } } });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver Ana' }));
    expect(await screen.findByText('Destino: /Simulados/Notas/s1/2/a1')).toBeInTheDocument();
  });

  it('mostra erro quando não carrega o simulado', async () => {
    getOne.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('Erro ao carregar simulado.')).toBeInTheDocument();
  });
});
