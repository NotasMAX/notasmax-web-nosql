import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladoNotasPorSimulado from './SimuladoNotasPorSimulado';
import { getByAlunoAndBimestre, getOneSimple } from '../api/simuladoApi';
import { getUsuario } from '../api/usuariosapi';

vi.mock('../api/simuladoApi.js', () => ({ getByAlunoAndBimestre: vi.fn(), getOneSimple: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));
vi.mock('../components/NotasCard', () => ({ default: ({ conteudo }) => <p>Acertos de {conteudo.materia}: {conteudo.resultado?.acertos ?? 'não fez'}</p> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
const simulados = [{ _id: 's1', bimestre: 2, numero: 1, turma: { _id: 't1', ano: 2026 }, conteudos: [{ materia: 'Matemática', resultado: { acertos: 6 }, quantidade_questoes: 10 }] }];

describe('SimuladoNotasPorSimulado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('apresenta o aluno e o total de acertos do simulado selecionado', async () => {
    getByAlunoAndBimestre.mockResolvedValue({ data: { simulados } });
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    render(<MemoryRouter initialEntries={['/Simulados/Notas/s1/2/a1']}><Routes><Route path="/Simulados/Notas/:simuladoIdParams/:bimestre/:alunoId" element={<SimuladoNotasPorSimulado />} /><Route path="/Turmas/:turma/Aluno/:aluno/Simulado/:simulado/Notas/" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Notas Aluno(a) - Ana' })).toBeInTheDocument();
    expect(screen.getByText('Acertos de Matemática: 6')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lançar Notas Simulado' }));
    expect(await screen.findByText('Destino: /Turmas/t1/Aluno/a1/Simulado/s1/Notas/')).toBeInTheDocument();
  });

  const abrirPagina = () => render(<MemoryRouter initialEntries={['/Simulados/Notas/s1/2/a1']}><Routes><Route path="/Simulados/Notas/:simuladoIdParams/:bimestre/:alunoId" element={<SimuladoNotasPorSimulado />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>);

  it('leva para a importação mesmo quando o aluno ainda não tem nota no bimestre', async () => {
    getByAlunoAndBimestre.mockResolvedValue({ data: { simulados: [] } });
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    getOneSimple.mockResolvedValue({ data: { simulado: { turma_id: 't1' } } });
    abrirPagina();
    fireEvent.click(await screen.findByRole('button', { name: 'Importar Excel' }));
    expect(await screen.findByText('Destino: /Simulados/Importar/t1/2/a1')).toBeInTheDocument();
    expect(getOneSimple).toHaveBeenCalledWith('s1');
  });

  it('avisa quando não consegue abrir a importação', async () => {
    getByAlunoAndBimestre.mockResolvedValue({ data: { simulados } });
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    getOneSimple.mockRejectedValue(new Error('simulado não encontrado'));
    abrirPagina();
    fireEvent.click(await screen.findByRole('button', { name: 'Importar Excel' }));
    expect(await screen.findByText('simulado não encontrado')).toBeInTheDocument();
  });

  it('não quebra quando o aluno não fez uma das disciplinas do simulado', async () => {
    const [simulado] = simulados;
    const semResultado = { ...simulado.conteudos[0], materia: 'Física', resultado: undefined };
    getByAlunoAndBimestre.mockResolvedValue({ data: { simulados: [{ ...simulado, conteudos: [...simulado.conteudos, semResultado] }] } });
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    abrirPagina();
    expect(await screen.findByRole('heading', { name: 'Notas Aluno(a) - Ana' })).toBeInTheDocument();
    expect(screen.getByText('Total de Acertos')).toBeInTheDocument();
  });

  it('mostra falha quando a API de notas retorna erro', async () => {
    getByAlunoAndBimestre.mockRejectedValue(new Error('consulta falhou'));
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    render(<MemoryRouter initialEntries={['/Simulados/Notas/s1/2/a1']}><Routes><Route path="/Simulados/Notas/:simuladoIdParams/:bimestre/:alunoId" element={<SimuladoNotasPorSimulado />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Carregando...')).toBeInTheDocument();
    expect(getByAlunoAndBimestre).toHaveBeenCalledWith('a1', '2', 's1');
  });
});
