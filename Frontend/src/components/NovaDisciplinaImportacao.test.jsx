import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NovaDisciplinaImportacao from './NovaDisciplinaImportacao';
import { listarMaterias } from '../api/materiaApi';
import { getProfessores } from '../api/usuariosapi';

vi.mock('../api/materiaApi', () => ({ listarMaterias: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getProfessores: vi.fn() }));

const materias = [{ _id: 'm1', nome: 'Física' }, { _id: 'm2', nome: 'Inglês' }];
const professores = [{ _id: 'p1', nome: 'Helena Vaz' }, { _id: 'p2', nome: 'Toni Almeida' }];

function abrir(cabecalhoOriginal = 'INGLÊS - HELENA', props = {}) {
  const onCriada = vi.fn();
  const onCancelar = vi.fn();
  render(<NovaDisciplinaImportacao cabecalhoOriginal={cabecalhoOriginal} onCriada={onCriada} onCancelar={onCancelar} {...props} />);
  return { onCriada, onCancelar };
}

const campo = (nome) => screen.getByLabelText(nome);
const adicionar = () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
const ajuda = () => screen.getByText(/^Nada é salvo agora/);

describe('NovaDisciplinaImportacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarMaterias.mockResolvedValue({ data: { materias } });
    getProfessores.mockResolvedValue({ data: professores });
  });

  it('sugere a matéria e o professor do cabeçalho e devolve a disciplina para a revisão, sem salvar nada', async () => {
    const { onCriada } = abrir();

    expect(await screen.findByLabelText('Matéria')).toHaveValue('Inglês');
    expect(screen.getByText('Usa a matéria já cadastrada "Inglês".')).toBeInTheDocument();
    expect(campo('Professor')).toHaveValue('p1');
    expect(ajuda()).toHaveTextContent('Nada é salvo agora: a disciplina só é cadastrada na turma quando a importação for confirmada.');
    adicionar();

    expect(onCriada).toHaveBeenCalledWith({ nova: true, materia: 'Inglês', materia_id: 'm2', professor: 'Helena Vaz', professor_id: 'p1' });
  });

  it('a matéria é um campo só: o nome digitado será criado ou usa a matéria que já existe', async () => {
    const { onCriada } = abrir('LÍNGUA PORTUGUESA - TONI');

    expect(await screen.findByLabelText('Matéria')).toHaveValue('Língua Portuguesa');
    expect(screen.getByText('Cria a matéria nova "Língua Portuguesa".')).toBeInTheDocument();
    expect(ajuda()).toHaveTextContent('Nada é salvo agora: a disciplina e a matéria nova só são cadastradas quando a importação for confirmada.');
    adicionar();
    expect(onCriada).toHaveBeenLastCalledWith({ nova: true, materia: 'Língua Portuguesa', materia_id: null, professor: 'Toni Almeida', professor_id: 'p2' });

    fireEvent.change(campo('Matéria'), { target: { value: ' física ' } });
    expect(screen.getByText('Usa a matéria já cadastrada "Física".')).toBeInTheDocument();
    adicionar();
    expect(onCriada).toHaveBeenLastCalledWith({ nova: true, materia: 'Física', materia_id: 'm1', professor: 'Toni Almeida', professor_id: 'p2' });
  });

  it('vem do seletor com o professor já escolhido e só lista professores cadastrados', async () => {
    abrir('ARTES - RITA', { professorInicial: 'p2' });

    await waitFor(() => expect(campo('Professor')).toHaveValue('p2'));
    expect(campo('Matéria')).toHaveValue('Artes');
    expect(within(campo('Professor')).getAllByRole('option').map(({ textContent }) => textContent)).toEqual(['Escolher', 'Helena Vaz', 'Toni Almeida']);
  });

  it('pede a matéria e o professor antes de adicionar', async () => {
    const { onCriada } = abrir('ARTES');
    await screen.findByLabelText('Matéria');

    fireEvent.change(campo('Matéria'), { target: { value: ' ' } });
    expect(screen.queryByText(/Cria a matéria nova/)).not.toBeInTheDocument();
    adicionar();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a matéria.');

    fireEvent.change(campo('Matéria'), { target: { value: 'Física' } });
    adicionar();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o professor.');
    expect(onCriada).not.toHaveBeenCalled();
  });

  it('avisa quando não consegue carregar as listas e permite cancelar', async () => {
    listarMaterias.mockRejectedValue(new Error('fora do ar'));
    const { onCancelar } = abrir();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as matérias e os professores.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
