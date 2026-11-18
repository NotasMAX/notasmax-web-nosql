import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ConfirmarImportacaoNotas from './ConfirmarImportacaoNotas';
import { confirmarImportacaoNotas } from '../api/simuladoApi';
import { listarMaterias } from '../api/materiaApi';
import { getProfessores } from '../api/usuariosapi';

vi.mock('../api/simuladoApi', () => ({ confirmarImportacaoNotas: vi.fn() }));
vi.mock('../api/materiaApi', () => ({ listarMaterias: vi.fn() }));
vi.mock('../api/usuariosapi', () => ({ getProfessores: vi.fn() }));
vi.mock('../components/BimestreAtual', () => ({ default: ({ bimestre, ano }) => <p>Período {bimestre}/{ano}</p> }));
vi.mock('../components/NovaDisciplinaImportacao', () => ({
  default: ({ cabecalhoOriginal, professorInicial, onCriada, onCancelar }) => (
    <div>
      <p>Nova disciplina para {cabecalhoOriginal}{professorInicial ? ` com ${professorInicial}` : ''}</p>
      <button
        type="button"
        onClick={() => onCriada({ nova: true, materia: 'Artes', materia_id: null, professor: 'Rita Lima', professor_id: 'p4' })}
      >
        Criar disciplina
      </button>
      <button type="button" onClick={onCancelar}>Desistir</button>
    </div>
  ),
}));

function Destino() {
  return <p>Destino: {useLocation().pathname}</p>;
}

const conteudo = (turma_disciplina_id, extras = {}) => ({
  turma_disciplina_id,
  peso: 30,
  pesoOriginal: 30,
  quantidade_questoes: 3,
  questoesOriginal: 3,
  alunosComResultado: 4,
  acertosAtuais: null,
  ...extras,
});

const simulado = (numero, extras = {}) => ({
  _id: `s${numero}`,
  numero,
  tipo: 'objetivo',
  tipoOriginal: 'objetivo',
  data_realizacao: '2026-03-10T15:00:00.000Z',
  foraDoPrazo: true,
  dataFutura: false,
  alunosComResultado: 5,
  conteudos: [conteudo('d1'), conteudo('d2')],
  ...extras,
});

const previaBase = (mudancas = {}) => ({
  aba: 'Maria Silva',
  bimestre: 2,
  aluno: { _id: 'a1', nome: 'Maria Silva' },
  turma: { _id: 't1', serie: 1, ano: 2026 },
  disciplinas: [
    { _id: 'd1', materia: 'Física', professor: 'Lourdes Prado', materia_id: 'm1', professor_id: 'p1' },
    { _id: 'd2', materia: 'Inglês', professor: 'Helena Vaz', materia_id: 'm2', professor_id: 'p2' },
  ],
  colunas: [
    { coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1' },
    { coluna: 'C', cabecalho: 'ingles', cabecalhoOriginal: 'INGLÊS', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: 'd2' },
  ],
  simulados: [simulado(1), simulado(2)],
  linhas: [
    { numero: 1, celulas: [{ coluna: 'B', celula: 'B4', status: 'acertos', acertos: 2 }, { coluna: 'C', celula: 'C4', status: 'acertos', acertos: 1 }] },
    { numero: 2, celulas: [{ coluna: 'B', celula: 'B5', status: 'nao_fez' }, { coluna: 'C', celula: 'C5', status: 'acertos', acertos: 3 }] },
  ],
  problemasDaPlanilha: { bloqueios: [], avisos: [] },
  ...mudancas,
});

const planilha = new File(['conteudo'], 'notas.xlsx');

function abrir(previa = previaBase(), arquivo = planilha) {
  return render(
    <MemoryRouter initialEntries={['/inicio', { pathname: '/Simulados/Importar/t1/2/a1/Confirmar', state: previa ? { previa, arquivo } : undefined }]} initialIndex={1}>
      <Routes>
        <Route path="/inicio" element={<p>Tela anterior</p>} />
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno" element={<p>Tela de upload</p>} />
        <Route path="/Simulados/Importar/:turma/:bimestre/:aluno/Confirmar" element={<ConfirmarImportacaoNotas />} />
        <Route path="/Simulados/Notas/:simulado/:bimestre/:aluno" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

const confirmar = () => screen.getByRole('button', { name: 'Confirmar' });
// A confirmação vai como FormData: a planilha em "arquivo" e a conferência em JSON em "dados".
const conferenciaEnviada = () => JSON.parse(confirmarImportacaoNotas.mock.calls[0][0].get('dados'));
const editar = (numero, coluna) => fireEvent.click(screen.getByRole('button', { name: `Editar simulado ${numero} de ${coluna}` }));

describe('ConfirmarImportacaoNotas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarMaterias.mockResolvedValue({ data: { materias: [{ _id: 'm1', nome: 'Física' }, { _id: 'm2', nome: 'Inglês' }] } });
    getProfessores.mockResolvedValue({ data: [{ _id: 'p1', nome: 'Lourdes Prado' }, { _id: 'p2', nome: 'Helena Vaz' }, { _id: 'p3', nome: 'Toni Almeida' }] });
  });

  // Escolhe Lourdes Prado para a coluna INGLÊS pelo botão de trocar professor: vira "Inglês - Lourdes Prado", nova.
  async function escolherLourdesParaIngles() {
    fireEvent.click(screen.getByRole('button', { name: 'INGLÊS' }));
    const trocar = screen.getByRole('combobox', { name: 'Trocar professor da coluna INGLÊS' });
    await within(trocar).findByRole('option', { name: 'Lourdes Prado' });
    expect(within(trocar).getByRole('group', { name: 'Adicionar Inglês à turma com' })).toHaveTextContent('Lourdes Prado');
    fireEvent.change(trocar, { target: { value: 'p:p1' } });
    return screen.getByText('Inglês - Lourdes Prado', { selector: 'span' });
  }

  it('volta para o upload quando a página é aberta sem prévia', () => {
    abrir(null);
    expect(screen.getByText('Tela de upload')).toBeInTheDocument();
  });

  it('volta para o upload quando a página é aberta sem a planilha', () => {
    abrir(previaBase(), null);
    expect(screen.getByText('Tela de upload')).toBeInTheDocument();
  });

  it('mostra as colunas, abre a primeira e calcula as notas', () => {
    abrir();

    expect(screen.getByRole('heading', { name: 'Confirmação das notas Importadas' })).toBeInTheDocument();
    expect(screen.getByText('Verifique se as notas importadas do excel estão corretas')).toBeInTheDocument();
    expect(screen.getByText('Período 2/2026')).toBeInTheDocument();
    expect(screen.getByText('Física - Lourdes Prado', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('nulo')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getAllByText('0,60')).toHaveLength(2);
    expect(screen.getAllByText('Ok')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('abre e fecha uma coluna', () => {
    abrir();
    const coluna = screen.getByRole('button', { name: 'INGLÊS' });

    fireEvent.click(coluna);
    expect(screen.getByText('Inglês - Helena Vaz', { selector: 'p' })).toBeInTheDocument();
    fireEvent.click(coluna);
    expect(screen.queryByText('Inglês - Helena Vaz', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('confirma, mostra as contagens e leva para as notas do aluno', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'Notas importadas com sucesso', criados: 3, atualizados: 1, removidos: 0, ignorados: 2 } });
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('status')).toHaveTextContent('3 criada(s), 1 atualizada(s), 0 removida(s) e 2 sem alteração.');
    expect(confirmarImportacaoNotas.mock.calls[0][0].get('arquivo').name).toBe('notas.xlsx');
    const enviado = conferenciaEnviada();
    expect(enviado).toMatchObject({ aluno_id: 'a1', turma_id: 't1', bimestre: '2', aba: 'Maria Silva', tipos: [], pesos: [] });
    expect(enviado.linhas[1].celulas[0]).toEqual({ coluna: 'B', celula: 'B5', acertos: null });

    fireEvent.click(screen.getByRole('button', { name: 'Ver notas do aluno' }));
    expect(await screen.findByText('Destino: /Simulados/Notas/s1/2/a1')).toBeInTheDocument();
  });

  it('bloqueia acertos inválidos e libera ao corrigir na tela', () => {
    const previa = previaBase();
    previa.linhas[0].celulas[0] = { coluna: 'B', celula: 'B4', status: 'invalida', bruto: '2,5' };
    abrir(previa);

    expect(screen.getByRole('alert')).toHaveTextContent('Célula B4: "2,5" não é válido. Use um número inteiro de 0 para cima; qualquer texto vale como nulo.');
    expect(screen.getByText('Bloqueio: acertos inválidos')).toBeInTheDocument();
    expect(screen.getByText('2,5')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();

    editar(1, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' }), { target: { value: '2' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();

    editar(1, 'FÍSICA - LÔ');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('qualquer texto digitado na revisão continua no campo, fica nulo e não bloqueia', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'Notas importadas com sucesso', criados: 0, atualizados: 0, removidos: 0, ignorados: 2 } });
    abrir();
    editar(1, 'FÍSICA - LÔ');
    const campo = screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' });

    fireEvent.change(campo, { target: { value: 'ausente' } });

    expect(campo).toHaveValue('ausente');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('0/0')).toBeInTheDocument();
    editar(1, 'FÍSICA - LÔ');
    expect(screen.getAllByText('nulo').length).toBeGreaterThan(0);

    fireEvent.click(confirmar());
    await waitFor(() => expect(confirmarImportacaoNotas).toHaveBeenCalled());
    expect(conferenciaEnviada().linhas[0].celulas[0].acertos).toBeNull();
  });

  it('vazio nos acertos fica nulo', () => {
    abrir();
    editar(1, 'FÍSICA - LÔ');

    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' }), { target: { value: '' } });

    expect(screen.getByRole('textbox', { name: 'Acertos do simulado 1 em FÍSICA - LÔ' })).toHaveAttribute('placeholder', 'nulo');
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('mostra a disciplina ligada sem seletor e só mostra o seletor de professor na coluna sem dono', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 0 } });
    const previa = previaBase();
    previa.colunas[1] = { ...previa.colunas[1], turma_disciplina_id: null };
    abrir(previa);

    expect(screen.queryByText('Disciplina da turma')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Professor da coluna FÍSICA - LÔ' })).not.toBeInTheDocument();
    expect(screen.getByText('Física - Lourdes Prado', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Coluna C ("INGLÊS"): escolha a disciplina da turma.');
    expect(screen.getByText('Bloqueio: sem dono')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();

    const seletor = screen.getByRole('combobox', { name: 'Professor da coluna INGLÊS' });
    expect(await within(seletor).findByRole('option', { name: 'Toni Almeida' })).toBeInTheDocument();
    expect(within(seletor).getByRole('group', { name: 'Já dão Inglês nesta turma' })).toHaveTextContent('Helena Vaz');
    fireEvent.change(seletor, { target: { value: 'd:d2' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Professor da coluna INGLÊS' })).not.toBeInTheDocument();
    fireEvent.click(confirmar());
    await screen.findByRole('status');
    expect(conferenciaEnviada().colunas[1]).toMatchObject({ turma_disciplina_id: 'd2', trocada: true });
  });

  it('mostra o seletor nas colunas ligadas à mesma disciplina, até trocar o professor de uma delas', () => {
    abrir(previaBase({ colunas: previaBase().colunas.map((c) => ({ ...c, turma_disciplina_id: 'd2' })) }));

    expect(screen.getAllByText('Bloqueio: disciplina repetida')).toHaveLength(2);
    expect(screen.getByRole('alert').querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Ligação atual' })).toHaveTextContent('Inglês - Helena Vaz');
    expect(confirmar()).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Professor da coluna FÍSICA - LÔ' }), { target: { value: 'd:d1' } });

    expect(screen.queryByText('Bloqueio: disciplina repetida')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Professor da coluna/ })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Trocar professor da coluna FÍSICA - LÔ' })).toBeInTheDocument();
  });

  it('um professor que já dá outra matéria vira uma disciplina nova, que só vai para o servidor ao confirmar', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 2, atualizados: 0, removidos: 0, ignorados: 0, disciplinasCadastradas: 1, disciplinasAdicionadas: 2 } });
    abrir();

    const ligada = await escolherLourdesParaIngles();
    expect(within(ligada).getByText('nova')).toBeInTheDocument();
    expect(screen.getByText('Bloqueio: questões inválidas')).toBeInTheDocument();
    expect(screen.getByText('Coluna C ("INGLÊS"): Inglês - Lourdes Prado será cadastrada na turma ao confirmar.')).toBeInTheDocument();

    for (const numero of [1, 2]) {
      editar(numero, 'INGLÊS');
      fireEvent.change(screen.getByRole('spinbutton', { name: `Questões do simulado ${numero} em INGLÊS` }), { target: { value: '3' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: `Peso do simulado ${numero} em INGLÊS` }), { target: { value: '30' } });
    }
    expect(screen.getByText('Aviso: disciplina nova')).toBeInTheDocument();
    fireEvent.click(confirmar());
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(confirmarImportacaoNotas).toHaveBeenCalled());
    expect(conferenciaEnviada().colunas[1]).toMatchObject({ turma_disciplina_id: 'nova-1', trocada: true });
    expect(conferenciaEnviada().disciplinasNovas).toEqual([{ id: 'nova-1', materia_id: 'm2', materia_nome: 'Inglês', professor_id: 'p1' }]);
    expect(conferenciaEnviada().conteudosNovos.map(({ turma_disciplina_id }) => turma_disciplina_id)).toEqual(['nova-1', 'nova-1']);
    expect(await screen.findByText('1 disciplina(s) cadastrada(s) na turma, 2 disciplina(s) adicionada(s) a simulados.')).toBeInTheDocument();
  });

  it('voltar para quem já dava a matéria tira da lista a disciplina nova escolhida antes, sem precisar recarregar', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 2 } });
    abrir();
    await escolherLourdesParaIngles();
    const grupos = () => {
      const trocar = screen.getByRole('combobox', { name: 'Trocar professor da coluna INGLÊS' });
      return {
        trocar,
        jaDao: within(trocar).getByRole('group', { name: 'Já dão Inglês nesta turma' }),
        adicionar: within(trocar).getByRole('group', { name: 'Adicionar Inglês à turma com' }),
      };
    };

    // A disciplina nova ainda não dá a matéria: Lourdes fica em "Adicionar", marcada como atual.
    expect(grupos().jaDao).toHaveTextContent(/^Helena Vaz$/);
    expect(grupos().adicionar).toHaveTextContent('Lourdes Prado (atual)');
    fireEvent.change(grupos().trocar, { target: { value: 'p:p1' } });
    expect(screen.getByText('Inglês - Lourdes Prado', { selector: 'span' })).toBeInTheDocument();

    fireEvent.change(grupos().trocar, { target: { value: 'd:d2' } });

    expect(screen.getByText('Inglês - Helena Vaz', { selector: 'span' })).toBeInTheDocument();
    expect(grupos().jaDao).toHaveTextContent(/^Helena Vaz \(atual\)$/);
    expect(grupos().adicionar).not.toHaveTextContent('(atual)');
    fireEvent.click(confirmar());
    await waitFor(() => expect(confirmarImportacaoNotas).toHaveBeenCalled());
    expect(conferenciaEnviada().disciplinasNovas).toEqual([]);
  });

  it('cancelar depois de escolher uma disciplina nova volta sem salvar nada', async () => {
    abrir();
    await escolherLourdesParaIngles();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Deseja realmente cancelar a importação? Nada será salvo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Tela anterior')).toBeInTheDocument();
    expect(confirmarImportacaoNotas).not.toHaveBeenCalled();
  });

  it('a mesma matéria com o mesmo professor em duas colunas vira uma disciplina só, e a revisão acusa a repetição', async () => {
    abrir(previaBase({
      colunas: [
        { coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1' },
        { coluna: 'C', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: null },
        { coluna: 'D', cabecalho: 'artes - rita', cabecalhoOriginal: 'ARTES - RITA', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: null },
      ],
    }));

    for (const cabecalho of ['ARTES', 'ARTES - RITA']) {
      const seletor = screen.getByRole('combobox', { name: `Professor da coluna ${cabecalho}` });
      await within(seletor).findByRole('option', { name: 'Toni Almeida' });
      fireEvent.change(seletor, { target: { value: 'p:p3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Criar disciplina' }));
    }

    expect(screen.getAllByText('Bloqueio: disciplina repetida')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('As colunas C ("ARTES") e D ("ARTES - RITA") estão ligadas à mesma disciplina: Artes - Rita Lima.');
  });

  it('a troca de professor é um botão dentro da coluna aberta que já abre a lista', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 0 } });
    abrir();

    // Na lista não há seletor nem botão; só a coluna aberta tem o botão.
    expect(screen.queryByRole('combobox', { name: /^Professor da coluna/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: /^Trocar professor da coluna/ })).toHaveLength(1);

    const trocar = screen.getByRole('combobox', { name: 'Trocar professor da coluna FÍSICA - LÔ' });
    expect(trocar).toHaveValue('');
    expect(trocar).toHaveDisplayValue('Trocar professor');
    // Os professores do sistema chegam depois; quem já dá a matéria vem da prévia e é marcado como atual.
    expect(await within(trocar).findByRole('option', { name: 'Toni Almeida' })).toBeInTheDocument();
    expect(within(trocar).getByRole('option', { name: 'Lourdes Prado (atual)' })).toBeInTheDocument();

    // Escolher de novo quem já dá a matéria não muda nada.
    fireEvent.change(trocar, { target: { value: 'd:d1' } });
    expect(trocar).toHaveDisplayValue('Trocar professor');
    fireEvent.click(confirmar());
    await screen.findByRole('status');
    expect(conferenciaEnviada().colunas[0]).toMatchObject({ turma_disciplina_id: 'd1', trocada: false });
  });

  it('peso e tipo fora do prazo avisam e pedem confirmação, porque valem para a turma', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 0, removidos: 0, ignorados: 0 } });
    abrir();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' }), { target: { value: '40' } });
    editar(1, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo do simulado 1' }), { target: { value: 'dissertativo' } });

    expect(screen.getByText(/Simulado 1, Física - Lourdes Prado: a troca de peso vale para todos os alunos/)).toBeInTheDocument();
    expect(screen.getByText(/Simulado 1: a troca de tipo vale para todas as disciplinas/)).toBeInTheDocument();
    expect(screen.getByText(/Simulado 1: já passou do prazo de 16 dias/)).toBeInTheDocument();
    expect(screen.getByText('Aviso: peso alterado')).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();

    fireEvent.click(confirmar());
    expect(await screen.findByText('Os simulados criados e as alterações de tipo, peso, questões e disciplinas valem para a turma inteira. Deseja continuar?')).toBeInTheDocument();
    expect(confirmarImportacaoNotas).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    await screen.findByRole('status');
    const enviado = conferenciaEnviada();
    expect(enviado.pesos).toEqual([{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 40 }]);
    expect(enviado.tipos).toEqual([{ simulado_id: 's1', tipo: 'dissertativo' }]);
  });

  it('bloqueia a nota acima de 10 e libera quando o peso volta', () => {
    const previa = previaBase({ linhas: [{ numero: 1, celulas: [{ coluna: 'B', celula: 'B4', status: 'acertos', acertos: 12 }] }] });
    previa.simulados[0].conteudos[0].quantidade_questoes = 20;
    abrir(previa);
    const peso = screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' });

    fireEvent.change(peso, { target: { value: '100' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Física - Lourdes Prado: a nota final daria 12,00, e o máximo é 10. Corrija o peso ou os acertos.');
    expect(confirmar()).toBeDisabled();

    fireEvent.change(peso, { target: { value: '30' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('bloqueia peso inválido', () => {
    abrir();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 1 em FÍSICA - LÔ' }), { target: { value: '' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Simulado 1, Física - Lourdes Prado: o peso deve ser um número inteiro maior que 0 e no máximo 100.');
    expect(confirmar()).toBeDisabled();
  });

  it('mantém os problemas fixos da planilha junto dos calculados', () => {
    abrir(previaBase({
      problemasDaPlanilha: {
        bloqueios: [{ codigo: 'SIM_REPETIDO', mensagem: 'A linha SIM 1 aparece mais de uma vez.' }],
        avisos: [{ codigo: 'TOTAL_DIFERENTE', mensagem: 'SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 99.' }],
      },
    }));

    expect(screen.getByRole('alert')).toHaveTextContent('A linha SIM 1 aparece mais de uma vez.');
    expect(screen.getByText('SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 99.')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();
  });

  it('simulado fora da planilha aparece com a nota lançada e pode ser alterado à mão', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'ok', criados: 0, atualizados: 1, removidos: 0, ignorados: 4 } });
    abrir(previaBase({
      simulados: [
        simulado(1),
        simulado(2),
        simulado(3, {
          tipo: 'dissertativo',
          tipoOriginal: 'dissertativo',
          conteudos: [conteudo('d1', { peso: 50, pesoOriginal: 50, acertosAtuais: 1 }), conteudo('d2', { acertosAtuais: 2 })],
        }),
      ],
    }));

    expect(screen.getByText('fora da planilha')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('0,50')).toBeInTheDocument();
    expect(screen.getByText(/Simulado 3: não está na planilha/)).toBeInTheDocument();

    editar(3, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em FÍSICA - LÔ' }), { target: { value: '2' } });

    expect(screen.getByText('1,00')).toBeInTheDocument();
    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.getByText(/Célula SIM 3, coluna B: o aluno já tem 1 acerto/)).toBeInTheDocument();

    fireEvent.click(confirmar());
    await screen.findByRole('status');
    expect(conferenciaEnviada().linhas[2]).toEqual({
      numero: 3,
      celulas: [{ coluna: 'B', celula: 'SIM 3, coluna B', acertos: 2 }],
    });
  });

  it('outra coluna do simulado fora da planilha continua com a nota lançada', () => {
    abrir(previaBase({
      simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d1', { acertosAtuais: 1 }), conteudo('d2', { acertosAtuais: 2 })] })],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'INGLÊS' }));
    editar(3, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em FÍSICA - LÔ' }), { target: { value: '3' } });

    expect(screen.getAllByText('2 / 3')).toHaveLength(2);
    expect(screen.getByText('fora da planilha')).toBeInTheDocument();

    editar(3, 'INGLÊS');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acertos do simulado 3 em INGLÊS' }), { target: { value: '' } });

    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.getByText(/vai passar para nulo/)).toBeInTheDocument();
  });

  it('não lista simulado fora da planilha que não tem a disciplina da coluna', () => {
    abrir(previaBase({ simulados: [simulado(1), simulado(2), simulado(3, { conteudos: [conteudo('d2')] })] }));

    expect(screen.queryByText('fora da planilha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar simulado 3 de FÍSICA - LÔ' })).not.toBeInTheDocument();
  });

  it('linha sem simulado vira um simulado novo, editável, que é criado ao confirmar', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'Notas importadas com sucesso', criados: 2, atualizados: 0, removidos: 0, ignorados: 0, simuladosCriados: 1, disciplinasAdicionadas: 0, simulado_id: 's1' } });
    const previa = previaBase();
    previa.linhas.push({ numero: 7, celulas: [{ coluna: 'B', celula: 'B6', status: 'acertos', acertos: 1 }, { coluna: 'C', celula: 'C6', status: 'acertos', acertos: 2 }] });
    abrir(previa);

    expect(screen.getByText('novo simulado')).toBeInTheDocument();
    expect(screen.getByText('1 / ?')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Peso do simulado 7 em FÍSICA - LÔ' })).toHaveValue(30);
    expect(screen.getByRole('alert')).toHaveTextContent('o número de questões deve ser um inteiro de 1 a 100');
    expect(screen.getByText(/SIM 7: não está cadastrado e será criado ao confirmar/)).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();

    editar(7, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questões do simulado 7 em FÍSICA - LÔ' }), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Data de realização do simulado 7'), { target: { value: '2026-03-12' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo do simulado 7' }), { target: { value: 'dissertativo' } });

    fireEvent.click(screen.getByRole('button', { name: 'INGLÊS' }));
    editar(7, 'INGLÊS');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questões do simulado 7 em INGLÊS' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 7 em INGLÊS' }), { target: { value: '10' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(confirmar());
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(confirmarImportacaoNotas).toHaveBeenCalled());
    expect(conferenciaEnviada().novos).toEqual([{
      numero: 7,
      tipo: 'dissertativo',
      data_realizacao: new Date(2026, 2, 12).toISOString(),
      conteudos: [{ turma_disciplina_id: 'd1', quantidade_questoes: 4, peso: 30 }, { turma_disciplina_id: 'd2', quantidade_questoes: 3, peso: 10 }],
    }]);
    expect(await screen.findByText('1 simulado(s) criado(s).')).toBeInTheDocument();
  });

  it('disciplina que falta no simulado vira novo responsável, e as questões podem mudar', async () => {
    confirmarImportacaoNotas.mockResolvedValue({ data: { message: 'Notas importadas com sucesso', criados: 1, atualizados: 0, removidos: 0, ignorados: 0, disciplinasAdicionadas: 1 } });
    abrir(previaBase({ simulados: [simulado(1, { conteudos: [conteudo('d2')] }), simulado(2)] }));

    expect(screen.getByText('novo responsável')).toBeInTheDocument();
    expect(screen.getByText('Bloqueio: questões inválidas')).toBeInTheDocument();

    editar(1, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questões do simulado 1 em FÍSICA - LÔ' }), { target: { value: '3' } });
    expect(screen.getByText('Aviso: novo responsável')).toBeInTheDocument();

    editar(2, 'FÍSICA - LÔ');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Questões do simulado 2 em FÍSICA - LÔ' }), { target: { value: '6' } });
    expect(screen.getByText(/a troca do número de questões vale para todos os alunos da turma/)).toBeInTheDocument();

    fireEvent.click(confirmar());
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(confirmarImportacaoNotas).toHaveBeenCalled());
    expect(conferenciaEnviada().conteudosNovos).toEqual([{ simulado_id: 's1', turma_disciplina_id: 'd1', quantidade_questoes: 3, peso: 30 }]);
    expect(conferenciaEnviada().questoes).toEqual([{ simulado_id: 's2', turma_disciplina_id: 'd1', quantidade_questoes: 6 }]);
    expect(await screen.findByText('1 disciplina(s) adicionada(s) a simulados.')).toBeInTheDocument();
  });

  it('escolhe uma disciplina nova para uma coluna sem dono e liga a coluna a ela, sem salvar nada', async () => {
    abrir(previaBase({
      colunas: [
        { coluna: 'B', cabecalho: 'fisica - lo', cabecalhoOriginal: 'FÍSICA - LÔ', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1' },
        { coluna: 'C', cabecalho: 'artes', cabecalhoOriginal: 'ARTES', fator: null, notaDissertativaPlanilha: null, turma_disciplina_id: null },
      ],
    }));
    const seletor = screen.getByRole('combobox', { name: 'Professor da coluna ARTES' });
    expect(screen.getByText('Bloqueio: sem dono')).toBeInTheDocument();

    // Artes não existe no sistema: escolher um professor abre o formulário, já com ele, para dar nome à matéria.
    // O seletor só lista professores cadastrados.
    await within(seletor).findByRole('group', { name: 'Outros professores (cadastra a matéria Artes)' });
    expect(within(seletor).getAllByRole('option').map(({ textContent }) => textContent))
      .toEqual(['Escolher professor', 'Lourdes Prado', 'Helena Vaz', 'Toni Almeida']);
    fireEvent.change(seletor, { target: { value: 'p:p3' } });
    expect(screen.getByText('Nova disciplina para ARTES com p3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desistir' }));
    expect(screen.queryByText(/Nova disciplina para ARTES/)).not.toBeInTheDocument();

    fireEvent.change(seletor, { target: { value: 'p:p1' } });
    expect(screen.getByText('Nova disciplina para ARTES com p1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Criar disciplina' }));

    const ligada = screen.getByText('Artes - Rita Lima', { selector: 'span' });
    expect(within(ligada).getByText('nova')).toBeInTheDocument();
    expect(screen.queryByText('Bloqueio: sem dono')).not.toBeInTheDocument();
    expect(screen.getByText('Bloqueio: questões inválidas')).toBeInTheDocument();
    expect(screen.getByText('Coluna C ("ARTES"): Artes - Rita Lima será cadastrada na turma ao confirmar, com a matéria nova Artes.')).toBeInTheDocument();
  });

  it('volta para a conferência com os bloqueios do servidor e os limpa ao editar', async () => {
    confirmarImportacaoNotas.mockRejectedValue({
      response: { data: { bloqueios: [{ codigo: 'NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10', mensagem: 'Com esse peso, a nota de Rafael daria 11,00.' }] } },
    });
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Com esse peso, a nota de Rafael daria 11,00.');
    await waitFor(() => expect(confirmar()).toBeDisabled());
    // Recusada pelo servidor, a lista de bloqueios abre sozinha para mostrar o motivo.
    expect(screen.getByRole('button', { name: 'Bloqueios (1)' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Com esse peso, a nota de Rafael daria 11,00.')).toBeVisible();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso do simulado 2 em FÍSICA - LÔ' }), { target: { value: '31' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra erro genérico quando o servidor não responde', async () => {
    confirmarImportacaoNotas.mockRejectedValue(new Error('rede'));
    abrir();

    fireEvent.click(confirmar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível importar as notas.');
  });

  it('bloqueios e avisos começam recolhidos, e o admin abre e fecha cada um', () => {
    abrir(previaBase({
      problemasDaPlanilha: {
        bloqueios: [{ codigo: 'SIM_REPETIDO', mensagem: 'A linha SIM 1 aparece mais de uma vez.', celulas: ['A5'] }],
        avisos: [{ codigo: 'TOTAL_DIFERENTE', mensagem: 'SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 4.', celulas: ['O4'] }],
      },
    }));
    const bloqueios = screen.getByRole('button', { name: 'Bloqueios (1)' });
    const avisos = screen.getByRole('button', { name: 'Avisos (1)' });
    const bloqueio = screen.getByText('A linha SIM 1 aparece mais de uma vez.');
    const aviso = screen.getByText('SIM 1: a soma da linha dá 3, mas a coluna TOTAL mostra 4.');

    expect([bloqueios.getAttribute('aria-expanded'), avisos.getAttribute('aria-expanded')]).toEqual(['false', 'false']);
    expect(bloqueio).not.toBeVisible();
    expect(aviso).not.toBeVisible();

    fireEvent.click(bloqueios);
    expect(bloqueios).toHaveAttribute('aria-expanded', 'true');
    expect(bloqueio).toBeVisible();
    expect(aviso).not.toBeVisible();

    fireEvent.click(avisos);
    expect(aviso).toBeVisible();
    fireEvent.click(bloqueios);
    expect(bloqueio).not.toBeVisible();
  });

  it('o cancelar pede confirmação antes de voltar', async () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Deseja realmente cancelar a importação? Nada será salvo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Tela anterior')).toBeInTheDocument();
    expect(confirmarImportacaoNotas).not.toHaveBeenCalled();
  });
});
