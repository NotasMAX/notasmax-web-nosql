import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ImportarNotas from './ImportarNotas';
import { previaImportacaoNotas } from '../api/simuladoApi';
import { getUsuario } from '../api/usuariosapi';
import { getOne } from '../api/turmasapi';

vi.mock('../api/simuladoApi', () => ({ previaImportacaoNotas: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getUsuario: vi.fn() }));
vi.mock('../api/turmasapi', () => ({ getOne: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));

function Destino() {
  const { pathname, state } = useLocation();
  return <p>Destino: {pathname} / aba {state?.previa?.aba}</p>;
}

const planilha = new File(['conteudo'], 'notas.xlsx');

function abrir() {
  render(
    <MemoryRouter initialEntries={['/Simulados/Importar/t1/2/a1']}>
      <Routes>
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno" element={<ImportarNotas />} />
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno/Confirmar" element={<Destino />} />
        <Route path="/404" element={<p>Não encontrado</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const escolher = (arquivo) => fireEvent.change(screen.getByLabelText('Planilha de notas'), { target: { files: [arquivo] } });
const confirmar = () => screen.getByRole('button', { name: 'Confirmar' });

describe('ImportarNotas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsuario.mockResolvedValue({ data: { nome: 'Maria Silva' } });
    getOne.mockResolvedValue({ data: { turma: { serie: 1, ano: 2026 } } });
  });

  it('mostra aluno, turma e bimestre, e só libera o Confirmar com um arquivo', async () => {
    abrir();

    expect(await screen.findByText('Aluno: Maria Silva')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Importando notas do Excel' })).toBeInTheDocument();
    expect(await screen.findByText('Turma: 1º EM')).toBeInTheDocument();
    expect(screen.getByText('Período 2/2026')).toBeInTheDocument();
    expect(screen.getByText('Selecione o arquivo que será importado')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();

    escolher(planilha);

    expect(screen.getByText('notas.xlsx')).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('recusa outro tipo de arquivo', async () => {
    abrir();
    await screen.findByText('Aluno: Maria Silva');

    escolher(new File(['x'], 'notas.csv'));

    expect(screen.getByRole('alert')).toHaveTextContent('Envie uma planilha .xlsx.');
    expect(confirmar()).toBeDisabled();
  });

  it('aceita arquivo arrastado', async () => {
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    const area = screen.getByLabelText('Planilha de notas').closest('label');

    fireEvent.dragOver(area);
    fireEvent.dragLeave(area);
    fireEvent.drop(area, { dataTransfer: { files: [planilha] } });

    expect(screen.getByText('notas.xlsx')).toBeInTheDocument();
  });

  it('envia a planilha e abre a conferência', async () => {
    previaImportacaoNotas.mockResolvedValue({ data: { podeConferir: true, aba: 'Maria Silva', abas: ['Maria Silva'], bloqueios: [] } });
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    escolher(planilha);

    fireEvent.click(confirmar());

    expect(await screen.findByText('Destino: /Simulados/Importar/t1/2/a1/Confirmar / aba Maria Silva')).toBeInTheDocument();
    const dados = previaImportacaoNotas.mock.calls[0][0];
    expect(dados.get('arquivo').name).toBe('notas.xlsx');
    expect(dados.get('aluno_id')).toBe('a1');
    expect(dados.get('turma_id')).toBe('t1');
    expect(dados.get('bimestre')).toBe('2');
    expect(dados.get('aba')).toBeNull();
  });

  it('fica na tela quando a planilha não pode ser conferida', async () => {
    previaImportacaoNotas.mockResolvedValue({
      data: { podeConferir: false, abas: [], bloqueios: [{ mensagem: 'A planilha é do 3º bimestre, mas a tela está no 2º bimestre.' }] },
    });
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    escolher(planilha);

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('A planilha é do 3º bimestre, mas a tela está no 2º bimestre.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('pede a aba quando nenhuma tem o nome do aluno e reenvia com a escolha', async () => {
    previaImportacaoNotas.mockResolvedValueOnce({
      data: { podeConferir: false, abas: ['Aba 1', 'Aba 2'], bloqueios: [{ mensagem: 'Nenhuma aba tem o nome do aluno. Escolha a aba correta.' }] },
    });
    previaImportacaoNotas.mockResolvedValueOnce({ data: { podeConferir: true, aba: 'Aba 2', abas: ['Aba 1', 'Aba 2'], bloqueios: [] } });
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    escolher(planilha);
    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma aba tem o nome do aluno. Escolha a aba correta.');
    expect(confirmar()).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: /Aba da planilha/ }), { target: { value: 'Aba 2' } });
    fireEvent.click(confirmar());

    expect(await screen.findByText(/aba Aba 2/)).toBeInTheDocument();
    expect(previaImportacaoNotas.mock.calls[1][0].get('aba')).toBe('Aba 2');
  });

  it('mostra o erro devolvido pelo servidor', async () => {
    previaImportacaoNotas.mockRejectedValue({ response: { data: { message: 'O arquivo passa do limite de 2 MB.' } } });
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    escolher(planilha);

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo passa do limite de 2 MB.');
    await waitFor(() => expect(confirmar()).toBeEnabled());
  });

  it('mostra um erro genérico quando o servidor não responde', async () => {
    previaImportacaoNotas.mockRejectedValue(new Error('rede'));
    abrir();
    await screen.findByText('Aluno: Maria Silva');
    escolher(planilha);

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler a planilha.');
  });

  it('vai para a página de erro quando aluno ou turma não existem', async () => {
    getUsuario.mockRejectedValue(new Error('não existe'));
    abrir();

    expect(await screen.findByText('Não encontrado')).toBeInTheDocument();
  });
});
