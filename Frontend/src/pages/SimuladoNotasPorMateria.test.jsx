import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SimuladoNotasPorMateria from './SimuladoNotasPorMateria';
import { getByAlunoAndBimestre } from '../api/simuladoApi';
import { getUsuario } from '../api/usuariosapi';

vi.mock('../api/simuladoApi.js', () => ({ getByAlunoAndBimestre: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));
vi.mock('../components/NotasSimuladosCard', () => ({ default: ({ conteudo, simulado }) => <p>Nota do simulado {simulado.numero}: {conteudo.resultado.acertos}</p> }));
function Destination() { return <p>Destino: {useLocation().pathname}</p>; }
const simulados = [{ _id: 's1', bimestre: 2, numero: 1, tipo: 'objetivo', turma: { ano: 2026, _id: 't1' }, conteudos: [{ _id: 'c1', resultado: { aluno_id: 'a1', acertos: 8 }, quantidade_questoes: 10, peso: 50, turma_disciplina: { materia_id: 'm1', materia: 'Matemática', professor: 'Prof. A' } }] }];

describe('SimuladoNotasPorMateria', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra notas, totais e médias ponderadas recebidas para a matéria selecionada', async () => {
    getByAlunoAndBimestre.mockResolvedValue({ data: { simulados } });
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    render(<MemoryRouter initialEntries={['/Simulados/Notas/Materia/s1/2/a1']}><Routes><Route path="/Simulados/Notas/Materia/:simuladoIdParams/:bimestre/:alunoId" element={<SimuladoNotasPorMateria />} /><Route path="/Turmas/Simulado/Aluno/:id" element={<Destination />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Notas Aluno(a) - Ana' })).toBeInTheDocument();
    expect(getByAlunoAndBimestre).toHaveBeenCalledWith('a1', '2', 's1');
    expect(await screen.findByText('Nota do simulado 1: 8')).toBeInTheDocument();
    expect(screen.getAllByText('4,00')).toHaveLength(2);
    expect(screen.getByText('8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    expect(await screen.findByText('Destino: /Turmas/Simulado/Aluno/s1')).toBeInTheDocument();
  });

  it('mostra estado de erro se a consulta de notas falhar', async () => {
    getByAlunoAndBimestre.mockRejectedValue(new Error('falha de consulta'));
    getUsuario.mockResolvedValue({ data: { nome: 'Ana' } });
    render(<MemoryRouter initialEntries={['/Simulados/Notas/Materia/s1/2/a1']}><Routes><Route path="/Simulados/Notas/Materia/:simuladoIdParams/:bimestre/:alunoId" element={<SimuladoNotasPorMateria />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Carregando...')).toBeInTheDocument();
    expect(getByAlunoAndBimestre).toHaveBeenCalledWith('a1', '2', 's1');
  });
});
